/**
 * Ingest Odoo payment terms into odoo_payment_terms (and lines if present)
 */

import { withTransaction } from '@/lib/database';
import type { OdooPaymentTerm, OdooPaymentTermLine } from './types';

export interface IngestPaymentTermsInput {
  orgId: string;
  importId: string;
  paymentTerms: OdooPaymentTerm[];
  paymentTermLines?: Array<{ payment_term_odoo_id: number; lines: OdooPaymentTermLine[] }>;
}

export interface IngestPaymentTermsResult {
  processed: number;
  linesProcessed: number;
  errors: string[];
}

export async function ingestPaymentTerms(
  input: IngestPaymentTermsInput
): Promise<IngestPaymentTermsResult> {
  const { orgId, importId, paymentTerms, paymentTermLines = [] } = input;
  const errors: string[] = [];
  let processed = 0;
  let linesProcessed = 0;

  const linesByTermId = new Map<number, OdooPaymentTermLine[]>();
  for (const pt of paymentTermLines) {
    linesByTermId.set(pt.payment_term_odoo_id, pt.lines);
  }

  await withTransaction(async (client) => {
    for (const pt of paymentTerms) {
      try {
        const res = await client.query(
          `INSERT INTO odoo_payment_terms (org_id, import_id, odoo_id, name, note)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (org_id, odoo_id)
           DO UPDATE SET name = EXCLUDED.name, note = EXCLUDED.note, import_id = EXCLUDED.import_id, updated_at = NOW()
           RETURNING id`,
          [orgId, importId, pt.id, pt.name, pt.note ?? null]
        );
        processed++;
        const row = res.rows[0] as { id: string } | undefined;
        const lines = linesByTermId.get(pt.id);
        if (row && lines?.length) {
          await client.query(
            'DELETE FROM odoo_payment_term_lines WHERE payment_term_id = $1',
            [row.id]
          );
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            await client.query(
              `INSERT INTO odoo_payment_term_lines (payment_term_id, value, value_amount, days, option, line_number)
               VALUES ($1, $2, $3, $4, $5, $6)`,
              [
                row.id,
                line.value ?? null,
                line.value_amount ?? null,
                line.days ?? null,
                line.option ?? null,
                line.line_number ?? i,
              ]
            );
            linesProcessed++;
          }
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`Payment term ${pt.id} ${pt.name}: ${msg}`);
      }
    }
  });

  return { processed, linesProcessed, errors };
}
