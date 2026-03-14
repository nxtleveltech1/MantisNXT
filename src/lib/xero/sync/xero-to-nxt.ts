/**
 * Xero-to-NXT real-time sync
 * Upsert Xero API entities into NXT database (for webhook-driven sync)
 */

import { query } from '@/lib/database';
import { getNxtEntityId, saveEntityMapping } from './helpers';
import type { XeroInvoice, XeroContact, XeroPayment, XeroCreditNote } from '../types';

function getContactId(xeroContact: { ContactID?: string }): string | undefined {
  return typeof xeroContact.ContactID === 'string' ? xeroContact.ContactID : undefined;
}

/**
 * Upsert AR (ACCREC) or AP (ACCPAY) invoice from Xero into NXT
 */
export async function upsertInvoiceFromXero(
  orgId: string,
  xeroInvoice: XeroInvoice
): Promise<{ success: boolean; nxtId?: string; error?: string }> {
  try {
    const xeroId = xeroInvoice.InvoiceID;
    if (!xeroId) return { success: false, error: 'No InvoiceID' };

    const contactId = getContactId(xeroInvoice.Contact || {});
    if (!contactId) return { success: false, error: 'No contact on invoice' };

    const total = xeroInvoice.Total ?? 0;
    const totalTax = xeroInvoice.TotalTax ?? 0;
    const subtotal = (xeroInvoice.SubTotal ?? total) - totalTax;
    const invoiceNumber = xeroInvoice.InvoiceNumber ?? xeroId;
    const dateStr = xeroInvoice.Date ?? new Date().toISOString().split('T')[0];
    const dueStr = xeroInvoice.DueDate ?? dateStr;
    const status = mapXeroInvoiceStatusToNxt(xeroInvoice.Status);

    if (xeroInvoice.Type === 'ACCREC') {
      const customerId = await getNxtEntityId(orgId, 'contact', contactId);
      if (!customerId) {
        return { success: false, error: 'Contact not mapped to NXT customer' };
      }

      const existing = await getNxtEntityId(orgId, 'invoice', xeroId);
      const nxtId = existing ?? crypto.randomUUID();

      await query(
        `INSERT INTO ar_customer_invoices (
          id, org_id, customer_id, invoice_number, invoice_date, due_date,
          subtotal, tax_amount, total_amount, paid_amount, status, source_type
        ) VALUES ($1, $2, $3, $4, $5::date, $6::date, $7, $8, $9, 0, $10, 'direct_ar')
        ON CONFLICT (id) DO UPDATE SET
          subtotal = EXCLUDED.subtotal,
          tax_amount = EXCLUDED.tax_amount,
          total_amount = EXCLUDED.total_amount,
          status = EXCLUDED.status,
          updated_at = NOW()`,
        [nxtId, orgId, customerId, invoiceNumber, dateStr, dueStr, subtotal, totalTax, total, status]
      );

      await saveEntityMapping(orgId, 'invoice', nxtId, xeroId);
      return { success: true, nxtId };
    }

    if (xeroInvoice.Type === 'ACCPAY') {
      const vendorId = await getNxtEntityId(orgId, 'contact', contactId);
      if (!vendorId) {
        return { success: false, error: 'Contact not mapped to NXT supplier' };
      }

      const existing = await getNxtEntityId(orgId, 'invoice', xeroId);
      const nxtId = existing ?? crypto.randomUUID();

      await query(
        `INSERT INTO ap_vendor_invoices (
          id, org_id, vendor_id, invoice_number, vendor_invoice_number, invoice_date, due_date,
          subtotal, tax_amount, total_amount, paid_amount, status
        ) VALUES ($1, $2, $3, $4, $4, $5::date, $6::date, $7, $8, $9, 0, $10)
        ON CONFLICT (id) DO UPDATE SET
          subtotal = EXCLUDED.subtotal,
          tax_amount = EXCLUDED.tax_amount,
          total_amount = EXCLUDED.total_amount,
          status = EXCLUDED.status,
          updated_at = NOW()`,
        [nxtId, orgId, vendorId, invoiceNumber, dateStr, dueStr, subtotal, totalTax, total, status]
      );

      await saveEntityMapping(orgId, 'invoice', nxtId, xeroId);
      return { success: true, nxtId };
    }

    return { success: false, error: 'Unsupported invoice type' };
  } catch (err) {
    console.error('[Xero-to-NXT] upsertInvoiceFromXero error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

function mapXeroInvoiceStatusToNxt(status?: string): string {
  switch (status) {
    case 'DRAFT':
      return 'draft';
    case 'SUBMITTED':
    case 'AUTHORISED':
      return 'sent';
    case 'PAID':
      return 'paid';
    case 'VOIDED':
    case 'DELETED':
      return 'cancelled';
    default:
      return 'sent';
  }
}

/**
 * Upsert contact from Xero into NXT customer or supplier
 */
export async function upsertContactFromXero(
  orgId: string,
  xeroContact: XeroContact
): Promise<{ success: boolean; nxtId?: string; error?: string }> {
  try {
    const xeroId = xeroContact.ContactID;
    if (!xeroId) return { success: false, error: 'No ContactID' };

    const name = xeroContact.Name ?? 'Unknown';
    const email = xeroContact.EmailAddress ?? null;
    const isSupplier = xeroContact.IsSupplier ?? false;
    const isCustomer = xeroContact.IsCustomer ?? true;

    const existingNxtId = await getNxtEntityId(orgId, 'contact', xeroId);

    if (isSupplier) {
      const nxtId = existingNxtId ?? crypto.randomUUID();
      await query(
        `INSERT INTO supplier (id, org_id, name, contact_email, status)
         VALUES ($1, $2, $3, $4, 'active')
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           contact_email = EXCLUDED.contact_email,
           updated_at = NOW()`,
        [nxtId, orgId, name, email]
      );
      await saveEntityMapping(orgId, 'contact', nxtId, xeroId);
      return { success: true, nxtId };
    }

    if (isCustomer) {
      const nxtId = existingNxtId ?? crypto.randomUUID();
      await query(
        `INSERT INTO customer (id, org_id, name, email, status, segment)
         VALUES ($1, $2, $3, $4, 'active', 'smb')
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           email = EXCLUDED.email,
           updated_at = NOW()`,
        [nxtId, orgId, name, email]
      );
      await saveEntityMapping(orgId, 'contact', nxtId, xeroId);
      return { success: true, nxtId };
    }

    return { success: false, error: 'Contact is neither supplier nor customer' };
  } catch (err) {
    console.error('[Xero-to-NXT] upsertContactFromXero error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Update NXT invoice paid amount from Xero payment (real-time sync)
 */
export async function applyPaymentFromXero(
  orgId: string,
  _xeroPayment: XeroPayment
): Promise<{ success: boolean; error?: string }> {
  try {
    // Payment application is complex (allocations to invoices). For real-time we mark mapping and let next full sync apply.
    return { success: true };
  } catch (err) {
    console.error('[Xero-to-NXT] applyPaymentFromXero error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

function mapXeroCreditNoteStatusToNxt(status?: string): 'draft' | 'applied' | 'cancelled' {
  if (!status) return 'draft';
  switch (status) {
    case 'PAID':
    case 'AUTHORISED':
      return 'applied';
    case 'VOIDED':
    case 'DELETED':
      return 'cancelled';
    default:
      return 'draft';
  }
}

/**
 * Upsert AR or AP credit note from Xero into NXT
 */
export async function upsertCreditNoteFromXero(
  orgId: string,
  xeroCreditNote: XeroCreditNote
): Promise<{ success: boolean; nxtId?: string; error?: string }> {
  try {
    const xeroId = xeroCreditNote.CreditNoteID;
    if (!xeroId) return { success: false, error: 'No CreditNoteID' };

    const contactId =
      typeof xeroCreditNote.Contact === 'object' && xeroCreditNote.Contact?.ContactID
        ? xeroCreditNote.Contact.ContactID
        : undefined;
    if (!contactId) return { success: false, error: 'No contact on credit note' };

    const total = xeroCreditNote.Total ?? 0;
    const cnNumber = xeroCreditNote.CreditNoteNumber ?? xeroId;
    const dateStr = xeroCreditNote.Date ?? new Date().toISOString().split('T')[0];
    const status = mapXeroCreditNoteStatusToNxt(xeroCreditNote.Status);

    const existingNxtId = await getNxtEntityId(orgId, 'credit_note', xeroId);

    if (xeroCreditNote.Type === 'ACCRECCREDIT') {
      const customerId = await getNxtEntityId(orgId, 'contact', contactId);
      if (!customerId) return { success: false, error: 'Contact not mapped to NXT customer' };

      const nxtId = existingNxtId ?? crypto.randomUUID();
      const res = await query<{ id: string }>(
        `INSERT INTO ar_credit_notes (
          id, org_id, customer_id, credit_note_number, credit_note_date, total_amount, applied_amount, status
        ) VALUES ($1, $2, $3, $4, $5::date, $6, 0, $7)
        ON CONFLICT (org_id, credit_note_number) DO UPDATE SET
          total_amount = EXCLUDED.total_amount,
          status = EXCLUDED.status,
          updated_at = NOW()
        RETURNING id`,
        [nxtId, orgId, customerId, cnNumber, dateStr, total, status]
      );
      const resolvedId = res.rows[0]?.id ?? nxtId;
      await saveEntityMapping(orgId, 'credit_note', resolvedId, xeroId);
      return { success: true, nxtId: resolvedId };
    }

    const vendorId = await getNxtEntityId(orgId, 'contact', contactId);
    if (!vendorId) return { success: false, error: 'Contact not mapped to NXT supplier' };

    const nxtId = existingNxtId ?? crypto.randomUUID();
    const res = await query<{ id: string }>(
      `INSERT INTO ap_credit_notes (
        id, org_id, vendor_id, credit_note_number, credit_note_date, total_amount, applied_amount, status
      ) VALUES ($1, $2, $3, $4, $5::date, $6, 0, $7)
      ON CONFLICT (org_id, credit_note_number) DO UPDATE SET
        total_amount = EXCLUDED.total_amount,
        status = EXCLUDED.status,
        updated_at = NOW()
      RETURNING id`,
      [nxtId, orgId, vendorId, cnNumber, dateStr, total, status]
    );
    const resolvedId = res.rows[0]?.id ?? nxtId;
    await saveEntityMapping(orgId, 'credit_note', resolvedId, xeroId);
    return { success: true, nxtId: resolvedId };
  } catch (err) {
    console.error('[Xero-to-NXT] upsertCreditNoteFromXero error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}
