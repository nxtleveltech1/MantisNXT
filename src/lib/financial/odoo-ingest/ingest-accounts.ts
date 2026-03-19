/**
 * Ingest Odoo accounts into odoo_accounts; optionally resolve xero_type from mapping
 */

import { query, withTransaction } from '@/lib/database';
import type { OdooAccount } from './types';
import { mapOdooAccountTypeToXero } from './account-mapper';

export interface IngestAccountsInput {
  orgId: string;
  importId: string;
  accounts: OdooAccount[];
}

export interface IngestAccountsResult {
  processed: number;
  errors: string[];
}

export async function ingestAccounts(input: IngestAccountsInput): Promise<IngestAccountsResult> {
  const { orgId, importId, accounts } = input;
  const errors: string[] = [];
  let processed = 0;

  await withTransaction(async (client) => {
    for (const a of accounts) {
      const companyId = Array.isArray(a.company_id) ? a.company_id[0] : null;
      const currencyCode =
        a.currency_id && Array.isArray(a.currency_id) ? (a.currency_id[1] as string) : null;
      const groupId =
        typeof a.group_id === 'number' ? a.group_id : Array.isArray(a.group_id) ? (a.group_id[0] as number) : null;
      const xeroType = mapOdooAccountTypeToXero(a.account_type);

      try {
        await client.query(
          `INSERT INTO odoo_accounts (
            org_id, import_id, odoo_id, code, name, account_type, xero_type,
            reconcile, deprecated, currency_id, company_id, group_id, source
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'odoo')
          ON CONFLICT (org_id, code)
          DO UPDATE SET
            name = EXCLUDED.name,
            account_type = EXCLUDED.account_type,
            xero_type = EXCLUDED.xero_type,
            reconcile = EXCLUDED.reconcile,
            deprecated = EXCLUDED.deprecated,
            currency_id = EXCLUDED.currency_id,
            company_id = EXCLUDED.company_id,
            group_id = EXCLUDED.group_id,
            import_id = EXCLUDED.import_id,
            updated_at = NOW()`,
          [
            orgId,
            importId,
            a.id,
            a.code,
            a.name,
            a.account_type,
            xeroType,
            Boolean(a.reconcile),
            Boolean(a.deprecated),
            currencyCode,
            companyId,
            groupId,
          ]
        );
        processed++;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`Account ${a.code}: ${msg}`);
      }
    }
  });

  return { processed, errors };
}
