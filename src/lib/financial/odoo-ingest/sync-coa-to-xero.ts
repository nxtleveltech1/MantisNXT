/**
 * Push Odoo accounts (odoo_accounts) to Xero Chart of Accounts.
 * Creates accounts in Xero that don't exist by code; updates odoo_accounts.xero_account_id.
 */

import { query } from '@/lib/database';
import { getXeroClient } from '@/lib/xero/client';
import { getValidTokenSet } from '@/lib/xero/token-manager';
import { callXeroApi } from '@/lib/xero/rate-limiter';

export interface SyncCoaToXeroInput {
  orgId: string;
  dryRun?: boolean;
}

export interface SyncCoaToXeroResult {
  created: number;
  matched: number;
  skipped: number;
  errors: string[];
}

interface OdooAccountRow {
  id: string;
  code: string;
  name: string;
  xero_type: string | null;
  deprecated: boolean;
  xero_account_id: string | null;
}

const XERO_ACCOUNT_TYPES = new Set([
  'BANK', 'CURRENT', 'CURRLIAB', 'DEPRECIATN', 'DIRECTCOSTS', 'EQUITY',
  'EXPENSE', 'FIXED', 'INVENTORY', 'LIABILITY', 'NONCURRENT', 'OTHERINCOME',
  'OVERHEADS', 'PREPAYMENT', 'REVENUE', 'SALES', 'TERMLIAB',
]);

function toXeroAccountType(xeroType: string | null): string {
  if (xeroType && XERO_ACCOUNT_TYPES.has(xeroType)) return xeroType;
  return 'CURRENT';
}

export async function syncCoaToXero(input: SyncCoaToXeroInput): Promise<SyncCoaToXeroResult> {
  const { orgId, dryRun = false } = input;
  const errors: string[] = [];
  let created = 0;
  let matched = 0;
  let skipped = 0;

  const { tokenSet, tenantId } = await getValidTokenSet(orgId);
  const xero = getXeroClient();
  xero.setTokenSet(tokenSet);

  const existingRes = await callXeroApi(tenantId, () =>
    xero.accountingApi.getAccounts(tenantId)
  );
  const existingAccounts = (existingRes.body?.accounts ?? []) as Array<{ AccountID?: string; Code?: string; Status?: string }>;
  const byCode = new Map<string, { id: string; status?: string }>();
  for (const a of existingAccounts) {
    if (a.Code) byCode.set(a.Code, { id: a.AccountID ?? '', status: a.Status });
  }

  const { rows: odooRows } = await query<OdooAccountRow>(
    `SELECT id, code, name, xero_type, deprecated, xero_account_id
     FROM odoo_accounts
     WHERE org_id = $1
     ORDER BY code`,
    [orgId]
  );

  for (const row of odooRows) {
    if (row.xero_account_id) {
      matched++;
      continue;
    }
    const existing = byCode.get(row.code);
    if (existing) {
      if (existing.status === 'ARCHIVED' && !row.deprecated) {
        errors.push(`Account ${row.code} exists in Xero but is ARCHIVED; not updating`);
        skipped++;
        continue;
      }
      await query(
        `UPDATE odoo_accounts SET xero_account_id = $1, xero_account_code = $2, updated_at = NOW() WHERE id = $3`,
        [existing.id, row.code, row.id]
      );
      matched++;
      continue;
    }

    if (row.deprecated) {
      skipped++;
      continue;
    }

    if (dryRun) {
      created++;
      continue;
    }

    try {
      const account = {
        Code: row.code,
        Name: row.name,
        Type: toXeroAccountType(row.xero_type),
        Status: row.deprecated ? 'ARCHIVED' : 'ACTIVE',
      };
      const createRes = await callXeroApi(tenantId, () =>
        xero.accountingApi.createAccount(tenantId, account)
      );
      const newAccount = createRes.body?.accounts?.[0] as { AccountID?: string } | undefined;
      const newId = newAccount?.AccountID;
      if (newId) {
        await query(
          `UPDATE odoo_accounts SET xero_account_id = $1, xero_account_code = $2, updated_at = NOW() WHERE id = $3`,
          [newId, row.code, row.id]
        );
        byCode.set(row.code, { id: newId });
        created++;
      } else {
        errors.push(`Xero did not return AccountID for ${row.code}`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`${row.code} ${row.name}: ${msg}`);
    }
  }

  return { created, matched, skipped, errors };
}
