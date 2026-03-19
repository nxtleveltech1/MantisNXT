/**
 * Ingest Odoo journals into odoo_journals (bank/cash -> Xero bank accounts later)
 */

import { withTransaction } from '@/lib/database';
import type { OdooJournal } from './types';

function defaultAccountOdooId(j: OdooJournal): number | null {
  if (!j.default_account_id || !Array.isArray(j.default_account_id)) return null;
  const id = j.default_account_id[0];
  return typeof id === 'number' ? id : null;
}

function defaultAccountCode(j: OdooJournal): string | null {
  if (!j.default_account_id || !Array.isArray(j.default_account_id)) return null;
  const name = j.default_account_id[1];
  return typeof name === 'string' ? name : null;
}

function currencyCode(j: OdooJournal): string | null {
  if (!j.currency_id || !Array.isArray(j.currency_id)) return null;
  const code = j.currency_id[1];
  return typeof code === 'string' ? code : null;
}

export interface IngestJournalsInput {
  orgId: string;
  importId: string;
  journals: OdooJournal[];
}

export interface IngestJournalsResult {
  processed: number;
  errors: string[];
}

export async function ingestJournals(input: IngestJournalsInput): Promise<IngestJournalsResult> {
  const { orgId, importId, journals } = input;
  const errors: string[] = [];
  let processed = 0;

  await withTransaction(async (client) => {
    for (const j of journals) {
      try {
        await client.query(
          `INSERT INTO odoo_journals (
            org_id, import_id, odoo_id, name, code, type,
            default_account_odoo_id, default_account_code, currency_id, active
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (org_id, code)
          DO UPDATE SET
            name = EXCLUDED.name,
            type = EXCLUDED.type,
            default_account_odoo_id = EXCLUDED.default_account_odoo_id,
            default_account_code = EXCLUDED.default_account_code,
            currency_id = EXCLUDED.currency_id,
            active = EXCLUDED.active,
            import_id = EXCLUDED.import_id,
            updated_at = NOW()`,
          [
            orgId,
            importId,
            j.id,
            j.name,
            j.code,
            j.type,
            defaultAccountOdooId(j),
            defaultAccountCode(j),
            currencyCode(j),
            j.active !== false,
          ]
        );
        processed++;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`Journal ${j.code} ${j.name}: ${msg}`);
      }
    }
  });

  return { processed, errors };
}
