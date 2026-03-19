/**
 * Ingest Odoo fiscal positions and account/tax overrides into platform tables
 */

import { withTransaction } from '@/lib/database';
import type {
  OdooFiscalPosition,
  OdooFiscalPositionAccount,
  OdooFiscalPositionTax,
} from './types';

export interface IngestFiscalPositionsInput {
  orgId: string;
  importId: string;
  fiscalPositions: OdooFiscalPosition[];
  fiscalPositionAccounts?: (OdooFiscalPositionAccount & { fiscal_position_id?: number })[];
  fiscalPositionTaxes?: (OdooFiscalPositionTax & { fiscal_position_id?: number })[];
}

export interface IngestFiscalPositionsResult {
  processed: number;
  accountsProcessed: number;
  taxesProcessed: number;
  errors: string[];
}

function countryId(fp: OdooFiscalPosition): number | null {
  return fp.country_id && Array.isArray(fp.country_id) ? (fp.country_id[0] as number) : null;
}

function stateIds(fp: OdooFiscalPosition): number[] {
  if (!fp.state_ids || !Array.isArray(fp.state_ids)) return [];
  return fp.state_ids.map((s) => (typeof s === 'number' ? s : (s as [number, string])[0]));
}

export async function ingestFiscalPositions(
  input: IngestFiscalPositionsInput
): Promise<IngestFiscalPositionsResult> {
  const {
    orgId,
    importId,
    fiscalPositions,
    fiscalPositionAccounts = [],
    fiscalPositionTaxes = [],
  } = input;
  const errors: string[] = [];
  let processed = 0;
  let accountsProcessed = 0;
  let taxesProcessed = 0;

  await withTransaction(async (client) => {
    for (const fp of fiscalPositions) {
      try {
        await client.query(
          `INSERT INTO odoo_fiscal_positions (org_id, import_id, odoo_id, name, country_id, state_ids, active)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (org_id, odoo_id)
           DO UPDATE SET name = EXCLUDED.name, country_id = EXCLUDED.country_id, state_ids = EXCLUDED.state_ids,
             active = EXCLUDED.active, import_id = EXCLUDED.import_id, updated_at = NOW()`,
          [
            orgId,
            importId,
            fp.id,
            fp.name,
            countryId(fp),
            stateIds(fp).length ? stateIds(fp) : null,
            fp.active !== false,
          ]
        );
        processed++;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`Fiscal position ${fp.id} ${fp.name}: ${msg}`);
      }
    }

    for (const fa of fiscalPositionAccounts) {
      try {
        const fpId = fa.fiscal_position_id;
        if (fpId == null) continue;
        const rid = await client.query(
          'SELECT id FROM odoo_fiscal_positions WHERE org_id = $1 AND odoo_id = $2',
          [orgId, fpId]
        );
        const fid = (rid.rows[0] as { id: string })?.id;
        if (!fid) continue;
        await client.query(
          `INSERT INTO odoo_fiscal_position_accounts (fiscal_position_id, account_src_odoo_id, account_dest_odoo_id)
           VALUES ($1, $2, $3)`,
          [fid, fa.account_src_id, fa.account_dest_id]
        );
        accountsProcessed++;
      } catch {
        // skip duplicates or missing FP
      }
    }

    for (const ft of fiscalPositionTaxes) {
      try {
        const fpId = ft.fiscal_position_id;
        if (fpId == null) continue;
        const rid = await client.query(
          'SELECT id FROM odoo_fiscal_positions WHERE org_id = $1 AND odoo_id = $2',
          [orgId, fpId]
        );
        const fid = (rid.rows[0] as { id: string })?.id;
        if (!fid) continue;
        await client.query(
          `INSERT INTO odoo_fiscal_position_taxes (fiscal_position_id, tax_src_odoo_id, tax_dest_odoo_id, tax_dest_xero_type)
           VALUES ($1, $2, $3, NULL)`,
          [fid, ft.tax_src_id, ft.tax_dest_id ?? null]
        );
        taxesProcessed++;
      } catch {
        // skip
      }
    }
  });

  return { processed, accountsProcessed, taxesProcessed, errors };
}
