/**
 * Odoo config ingest pipeline — parse extraction JSON and upsert into platform tables
 */

import { query, withTransaction } from '@/lib/database';
import { parseOdooExtraction } from './parser';
import type { OdooExtractionPayload, OdooIngestResult } from './types';
import { ingestAccounts } from './ingest-accounts';
import { ingestTaxes } from './ingest-taxes';
import { ingestPaymentTerms } from './ingest-payment-terms';
import { ingestFiscalPositions } from './ingest-fiscal-positions';
import { ingestJournals } from './ingest-journals';
import { ingestContacts } from './ingest-contacts';

export interface RunIngestInput {
  orgId: string;
  payload: OdooExtractionPayload;
  sourceFile?: string;
  cutoverDate?: string | null;
}

export interface RunIngestOutput extends OdooIngestResult {
  importId: string;
}

/**
 * Run full Odoo config ingest: create import record, then run each ingest module.
 */
export async function runOdooIngest(input: RunIngestInput): Promise<RunIngestOutput> {
  const { orgId, payload, sourceFile, cutoverDate } = input;
  const parse = parseOdooExtraction(payload);
  const allErrors = [...parse.errors];

  if (!parse.valid && parse.errors.length > 0) {
    return {
      importId: '',
      status: 'failed',
      recordsImported: {},
      validationErrors: parse.errors,
    };
  }

  const p = parse.payload;
  const accounts = p.accounts ?? [];
  const taxes = p.taxes ?? [];
  const paymentTerms = p.payment_terms ?? [];
  const fiscalPositions = p.fiscal_positions ?? [];
  const journals = p.journals ?? [];
  const partners = p.partners ?? [];

  let importId = '';

  await withTransaction(async (client) => {
    const imp = await client.query(
      `INSERT INTO odoo_config_imports (org_id, source_file, cutover_date, status)
       VALUES ($1, $2, $3::date, 'running')
       RETURNING id`,
      [orgId, sourceFile ?? null, cutoverDate ?? null]
    );
    importId = (imp.rows[0] as { id: string }).id;
  });

  const recordsImported: OdooIngestResult['recordsImported'] = {};
  let status: OdooIngestResult['status'] = 'completed';

  try {
    if (accounts.length > 0) {
      const r = await ingestAccounts({ orgId, importId, accounts });
      recordsImported.accounts = r.processed;
      allErrors.push(...r.errors);
    }
    if (taxes.length > 0) {
      const r = await ingestTaxes({ orgId, importId, taxes });
      recordsImported.taxes = r.processed;
      allErrors.push(...r.errors);
    }
    if (paymentTerms.length > 0) {
      const r = await ingestPaymentTerms({
        orgId,
        importId,
        paymentTerms,
        paymentTermLines: undefined,
      });
      recordsImported.paymentTerms = r.processed;
      allErrors.push(...r.errors);
    }
    if (fiscalPositions.length > 0) {
      const r = await ingestFiscalPositions({
        orgId,
        importId,
        fiscalPositions,
        fiscalPositionAccounts: p.fiscal_position_accounts as (import('./types').OdooFiscalPositionAccount & { fiscal_position_id?: number })[] | undefined,
        fiscalPositionTaxes: p.fiscal_position_taxes as (import('./types').OdooFiscalPositionTax & { fiscal_position_id?: number })[] | undefined,
      });
      recordsImported.fiscalPositions = r.processed;
      allErrors.push(...r.errors);
    }
    if (journals.length > 0) {
      const r = await ingestJournals({ orgId, importId, journals });
      recordsImported.journals = r.processed;
      allErrors.push(...r.errors);
    }
    if (partners.length > 0) {
      const r = await ingestContacts({ orgId, importId, partners });
      recordsImported.partners = r.processed;
      allErrors.push(...r.errors);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    allErrors.push(msg);
    status = 'failed';
  }

  if (allErrors.length > 0 && status === 'completed') status = 'partial';

  await query(
    `UPDATE odoo_config_imports SET status = $1, records_imported = $2, validation_errors = $3 WHERE id = $4`,
    [
      status,
      JSON.stringify(recordsImported),
      allErrors.length ? JSON.stringify(allErrors) : null,
      importId,
    ]
  );

  return {
    importId,
    status,
    recordsImported,
    validationErrors: allErrors,
  };
}

export { parseOdooExtraction } from './parser';
export { mapOdooAccountTypeToXero } from './account-mapper';
export type { OdooExtractionPayload, OdooIngestResult } from './types';
export { ingestAccounts } from './ingest-accounts';
export { ingestTaxes } from './ingest-taxes';
export { ingestPaymentTerms } from './ingest-payment-terms';
export { ingestFiscalPositions } from './ingest-fiscal-positions';
export { ingestJournals } from './ingest-journals';
export { ingestContacts } from './ingest-contacts';
export { syncCoaToXero } from './sync-coa-to-xero';
