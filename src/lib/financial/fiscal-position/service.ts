/**
 * Fiscal position resolution: match contact country/state to rules and return tax/account overrides
 */

import { query } from '@/lib/database';

export interface FiscalPositionContact {
  countryCode?: string | null;
  stateCode?: string | null;
  countryId?: number | null;
  stateId?: number | null;
}

export interface ResolvedFiscalPosition {
  fiscalPositionId: string;
  name: string;
  taxOverrides: Array<{ odooTaxId: number; xeroTaxType: string | null }>;
  accountOverrides: Array<{ odooAccountCodeSrc: string; xeroAccountCodeDest: string }>;
}

export type { FiscalPositionContact };

interface FiscalPositionRow {
  id: string;
  name: string;
  country_id: number | null;
  state_ids: number[] | null;
}

interface FiscalPositionAccountRow {
  account_src_odoo_id: number;
  account_dest_odoo_id: number;
  account_dest_code: string | null;
}

interface FiscalPositionTaxRow {
  tax_src_odoo_id: number;
  tax_dest_odoo_id: number | null;
  tax_dest_xero_type: string | null;
}

interface OdooAccountCodeRow {
  odoo_id: number;
  code: string;
}

/**
 * Resolve fiscal position for a contact and return tax/account overrides.
 * Match by country_id (and state_ids if present). Does not match by country/state code;
 * use countryId/stateId from Odoo if available.
 */
export async function resolveFiscalPosition(
  orgId: string,
  contact: FiscalPositionContact
): Promise<ResolvedFiscalPosition | null> {
  const { rows: fpRows } = await query<FiscalPositionRow>(
    `SELECT id, name, country_id, state_ids
     FROM odoo_fiscal_positions
     WHERE org_id = $1 AND active = true`,
    [orgId]
  );

  let matched: FiscalPositionRow | null = null;
  for (const fp of fpRows) {
    if (fp.country_id != null && contact.countryId !== fp.country_id) continue;
    if (fp.state_ids?.length && contact.stateId != null && !fp.state_ids.includes(contact.stateId)) continue;
    matched = fp;
    break;
  }

  if (!matched) return null;

  const accountOverrides: ResolvedFiscalPosition['accountOverrides'] = [];
  const { rows: accRows } = await query<FiscalPositionAccountRow>(
    `SELECT account_src_odoo_id, account_dest_odoo_id, account_dest_code
     FROM odoo_fiscal_position_accounts
     WHERE fiscal_position_id = $1`,
    [matched.id]
  );

  const { rows: odooAccounts } = await query<OdooAccountCodeRow>(
    `SELECT odoo_id, code FROM odoo_accounts WHERE org_id = $1`,
    [orgId]
  );
  const odooIdToCode = new Map(odooAccounts.map((a) => [a.odoo_id, a.code]));

  for (const a of accRows) {
    const srcCode = odooIdToCode.get(a.account_src_odoo_id);
    const destCode = a.account_dest_code ?? odooIdToCode.get(a.account_dest_odoo_id);
    if (srcCode && destCode) {
      accountOverrides.push({ odooAccountCodeSrc: srcCode, xeroAccountCodeDest: destCode });
    }
  }

  const taxOverrides: ResolvedFiscalPosition['taxOverrides'] = [];
  const { rows: taxRows } = await query<FiscalPositionTaxRow>(
    `SELECT tax_src_odoo_id, tax_dest_odoo_id, tax_dest_xero_type
     FROM odoo_fiscal_position_taxes
     WHERE fiscal_position_id = $1`,
    [matched.id]
  );
  for (const t of taxRows) {
    taxOverrides.push({
      odooTaxId: t.tax_src_odoo_id,
      xeroTaxType: t.tax_dest_xero_type,
    });
  }

  return {
    fiscalPositionId: matched.id,
    name: matched.name,
    taxOverrides,
    accountOverrides,
  };
}
