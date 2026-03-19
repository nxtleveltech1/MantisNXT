/**
 * Ingest Odoo taxes into odoo_taxes
 */

import { withTransaction } from '@/lib/database';
import type { OdooTax } from './types';

export interface IngestTaxesInput {
  orgId: string;
  importId: string;
  taxes: OdooTax[];
}

export interface IngestTaxesResult {
  processed: number;
  errors: string[];
}

export async function ingestTaxes(input: IngestTaxesInput): Promise<IngestTaxesResult> {
  const { orgId, importId, taxes } = input;
  const errors: string[] = [];
  let processed = 0;

  await withTransaction(async (client) => {
    for (const t of taxes) {
      try {
        await client.query(
          `INSERT INTO odoo_taxes (
            org_id, import_id, odoo_id, name, amount, type_tax_use, amount_type
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (org_id, odoo_id)
          DO UPDATE SET
            name = EXCLUDED.name,
            amount = EXCLUDED.amount,
            type_tax_use = EXCLUDED.type_tax_use,
            amount_type = EXCLUDED.amount_type,
            import_id = EXCLUDED.import_id,
            updated_at = NOW()`,
          [
            orgId,
            importId,
            t.id,
            t.name,
            Number(t.amount),
            t.type_tax_use ?? 'none',
            t.amount_type ?? 'percent',
          ]
        );
        processed++;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`Tax ${t.id} ${t.name}: ${msg}`);
      }
    }
  });

  return { processed, errors };
}
