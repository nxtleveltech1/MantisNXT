/**
 * Ingest Odoo partners — stored for reference; actual sync to Xero
 * uses existing Xero contact sync (triggered separately or in COA sync phase).
 */

import type { OdooPartner } from './types';

export interface IngestContactsInput {
  orgId: string;
  importId: string;
  partners: OdooPartner[];
}

export interface IngestContactsResult {
  processed: number;
  errors: string[];
}

/**
 * Partners from Odoo extraction are not stored in platform DB in this phase.
 * Use existing Xero sync/contacts to push customers/suppliers to Xero when needed.
 * This is a no-op placeholder for pipeline consistency.
 */
export async function ingestContacts(input: IngestContactsInput): Promise<IngestContactsResult> {
  const customers = input.partners.filter((p) => (p.customer_rank ?? 0) > 0);
  const suppliers = input.partners.filter((p) => (p.supplier_rank ?? 0) > 0);
  return {
    processed: customers.length + suppliers.length,
    errors: [],
  };
}
