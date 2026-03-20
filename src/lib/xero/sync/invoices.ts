/**
 * Xero Invoices Sync
 * 
 * Handles synchronization of Sales Invoices (ACCREC) and 
 * Supplier Bills (ACCPAY) between NXT and Xero.
 */

import { getXeroClient } from '../client';
import { getValidTokenSet } from '../token-manager';
import { callXeroApi } from '../rate-limiter';
import { logSyncSuccess, logSyncError } from '../sync-logger';
import { mapSupplierInvoiceToXero, generateSyncHash, formatDateForXero } from '../mappers';
import { parseXeroApiError, XeroSyncError } from '../errors';
import { query } from '@/lib/database';
import { syncCustomerToXero } from './contacts';
import {
  getXeroEntityId,
  saveEntityMapping,
  getAccountMappings,
} from './helpers';
import { resolveFiscalPosition } from '@/lib/financial/fiscal-position';
import type { XeroInvoice, SyncResult, XeroAccountMappingConfig, XeroTaxType } from '../types';

// ============================================================================
// TYPES
// ============================================================================

/**
 * AR Customer Invoice for syncing to Xero (ACCREC)
 * Matches the ARCustomerInvoice structure from ARService
 */
export interface NxtSalesInvoice {
  id: string;
  customerId: string;
  customerName?: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  currency?: string;
  reference?: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  status: string;
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    taxRate?: number;
    taxAmount?: number;
    lineTotal: number;
    accountCode?: string;
  }>;
}

// ============================================================================
// SYNC SALES INVOICE TO XERO (ACCREC)
// ============================================================================

/**
 * Map NXT Sales Invoice to Xero Invoice (ACCREC)
 */
function mapSalesInvoiceToXero(
  invoice: NxtSalesInvoice,
  xeroContactId: string,
  accountMapping: Partial<XeroAccountMappingConfig> = {}
): XeroInvoice {
  const salesAccountCode = accountMapping.salesRevenue || '200';

  return {
    Type: 'ACCREC',
    Contact: { ContactID: xeroContactId },
    InvoiceNumber: invoice.invoiceNumber,
    Reference: invoice.reference,
    Date: formatDateForXero(invoice.invoiceDate),
    DueDate: formatDateForXero(invoice.dueDate),
    LineAmountTypes: 'Exclusive',
    Status: mapInvoiceStatusToXero(invoice.status),
    CurrencyCode: invoice.currency || 'ZAR',
    LineItems: invoice.lineItems.map(item => ({
      Description: item.description,
      Quantity: item.quantity,
      UnitAmount: item.unitPrice,
      AccountCode: item.accountCode || salesAccountCode,
      TaxType: 'OUTPUT' as XeroTaxType,
    })),
  };
}

/**
 * Map invoice status to Xero status
 */
function mapInvoiceStatusToXero(status: string): 'DRAFT' | 'SUBMITTED' | 'AUTHORISED' | 'PAID' | 'VOIDED' {
  switch (status) {
    case 'draft':
      return 'DRAFT';
    case 'sent':
    case 'submitted':
      return 'SUBMITTED';
    case 'paid':
      return 'PAID';
    case 'partially_paid':
    case 'overdue':
      return 'AUTHORISED';
    case 'cancelled':
    case 'refunded':
      return 'VOIDED';
    default:
      return 'AUTHORISED';
  }
}

/** Optional contact context for fiscal position resolution */
export interface FiscalContactContext {
  countryId?: number | null;
  stateId?: number | null;
}

async function ensureCustomerContactMapping(orgId: string, customerId: string): Promise<string | null> {
  const existingContactId = await getXeroEntityId(orgId, 'contact', customerId);
  if (existingContactId) return existingContactId;

  const customerResult = await query<{
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    company: string | null;
    tax_number: string | null;
    address: {
      street?: string;
      city?: string;
      state?: string;
      postal_code?: string;
      country?: string;
    } | null;
  }>(
    `SELECT id, name, email, phone, company, tax_number, address
     FROM customer
     WHERE id = $1 AND org_id = $2`,
    [customerId, orgId]
  );
  const customer = customerResult.rows[0];
  if (!customer) return null;

  const contactSync = await syncCustomerToXero(orgId, {
    id: customer.id,
    name: customer.name,
    email: customer.email || undefined,
    phone: customer.phone || undefined,
    company: customer.company || undefined,
    taxNumber: customer.tax_number || undefined,
    address: customer.address
      ? {
          street: customer.address.street,
          city: customer.address.city,
          state: customer.address.state,
          postalCode: customer.address.postal_code,
          country: customer.address.country,
        }
      : undefined,
  });

  if (!contactSync.success) return null;
  return await getXeroEntityId(orgId, 'contact', customerId);
}

/**
 * Apply fiscal position overrides to Xero invoice line items (account code and tax type)
 */
function applyFiscalOverridesToInvoice(
  xeroInvoice: XeroInvoice,
  overrides: { accountOverrides: Array<{ odooAccountCodeSrc: string; xeroAccountCodeDest: string }>; taxOverrides: Array<{ xeroTaxType: string | null }> }
): void {
  const accountMap = new Map(overrides.accountOverrides.map((a) => [a.odooAccountCodeSrc, a.xeroAccountCodeDest]));
  const taxType = overrides.taxOverrides[0]?.xeroTaxType;
  if (xeroInvoice.LineItems) {
    for (const line of xeroInvoice.LineItems) {
      if (line.AccountCode && accountMap.has(line.AccountCode)) {
        line.AccountCode = accountMap.get(line.AccountCode)!;
      }
      if (taxType != null) {
        line.TaxType = taxType as XeroTaxType;
      }
    }
  }
}

/**
 * Sync a sales invoice (AR) to Xero as ACCREC
 */
export async function syncSalesInvoiceToXero(
  orgId: string,
  invoice: NxtSalesInvoice,
  contactFiscal?: FiscalContactContext
): Promise<SyncResult<XeroInvoice>> {
  const startTime = Date.now();

  try {
    const { tokenSet, tenantId } = await getValidTokenSet(orgId);
    const xero = getXeroClient();
    xero.setTokenSet(tokenSet);

    // Get Xero contact ID for customer
    let xeroContactId = await getXeroEntityId(orgId, 'contact', invoice.customerId);
    if (!xeroContactId) {
      xeroContactId = await ensureCustomerContactMapping(orgId, invoice.customerId);
    }
    if (!xeroContactId) {
      throw new XeroSyncError(
        `Customer ${invoice.customerName || invoice.customerId} not synced to Xero. Sync customer first.`,
        'invoice',
        invoice.id,
        'CUSTOMER_NOT_SYNCED'
      );
    }

    // Get account mappings
    const accountMappings = await getAccountMappings(orgId);

    // Check if already synced
    const existingXeroId = await getXeroEntityId(orgId, 'invoice', invoice.id);

    // Map to Xero format
    let xeroInvoice = mapSalesInvoiceToXero(invoice, xeroContactId, accountMappings);

    // Resolve fiscal position and apply overrides if contact context provided
    if (contactFiscal?.countryId != null || contactFiscal?.stateId != null) {
      const fp = await resolveFiscalPosition(orgId, {
        countryId: contactFiscal.countryId ?? undefined,
        stateId: contactFiscal.stateId ?? undefined,
      });
      if (fp) {
        applyFiscalOverridesToInvoice(xeroInvoice, {
          accountOverrides: fp.accountOverrides,
          taxOverrides: fp.taxOverrides.map((t) => ({ xeroTaxType: t.xeroTaxType })),
        });
      }
    }
    if (existingXeroId) {
      xeroInvoice.InvoiceID = existingXeroId;
    }
    
    const syncHash = generateSyncHash(xeroInvoice);

    let result: XeroInvoice;
    let action: 'create' | 'update';

    if (existingXeroId) {
      action = 'update';
      const response = await callXeroApi(tenantId, async () => {
        return xero.accountingApi.updateInvoice(tenantId, existingXeroId, { invoices: [xeroInvoice] });
      });
      const invoices = response.body?.invoices;
      if (!invoices || !Array.isArray(invoices) || invoices.length === 0) {
        throw new XeroSyncError(
          'No invoices returned from Xero API',
          'invoice',
          bill.id,
          'NO_INVOICES_RETURNED'
        );
      }
      result = invoices[0] as XeroInvoice;
    } else {
      action = 'create';
      const response = await callXeroApi(tenantId, async () => {
        return xero.accountingApi.createInvoices(tenantId, { invoices: [xeroInvoice] });
      });
      const invoices = response.body?.invoices;
      if (!invoices || !Array.isArray(invoices) || invoices.length === 0) {
        throw new XeroSyncError(
          'No invoices returned from Xero API',
          'invoice',
          bill.id,
          'NO_INVOICES_RETURNED'
        );
      }
      result = invoices[0] as XeroInvoice;
    }

    if (!result?.InvoiceID) {
      throw new XeroSyncError(
        'No InvoiceID returned from Xero',
        'invoice',
        bill.id,
        'NO_INVOICE_ID'
      );
    }

    await saveEntityMapping(orgId, 'invoice', bill.id, result.InvoiceID, syncHash);

    await logSyncSuccess(orgId, 'invoice', action, 'to_xero', {
      nxtEntityId: invoice.id,
      xeroEntityId: result.InvoiceID,
      durationMs: Date.now() - startTime,
    });

    return {
      success: true,
      data: result,
      xeroEntityId: result.InvoiceID,
    };

  } catch (error) {
    const parsedError = parseXeroApiError(error);
    
    await logSyncError(orgId, 'invoice', 'create', 'to_xero', parsedError, {
      nxtEntityId: invoice.id,
      durationMs: Date.now() - startTime,
    });

    return {
      success: false,
      error: parsedError.message,
      errorCode: parsedError.code,
    };
  }
}

// ============================================================================
// SYNC SUPPLIER INVOICE TO XERO (ACCPAY)
// ============================================================================

/**
 * Sync a supplier invoice (bill) to Xero as ACCPAY
 */
export async function syncSupplierInvoiceToXero(
  orgId: string,
  bill: {
    id: string;
    supplierId: string;
    invoiceNumber: string;
    invoiceDate: string;
    dueDate: string;
    currency?: string;
    reference?: string;
    lineItems: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
      taxRate?: number;
      accountCode?: string;
    }>;
  },
  contactFiscal?: FiscalContactContext
): Promise<SyncResult<XeroInvoice>> {
  const startTime = Date.now();

  try {
    const { tokenSet, tenantId } = await getValidTokenSet(orgId);
    const xero = getXeroClient();
    xero.setTokenSet(tokenSet);

    // Get Xero contact ID for supplier
    const xeroContactId = await getXeroEntityId(orgId, 'contact', bill.supplierId);
    if (!xeroContactId) {
      throw new XeroSyncError(
        `Supplier not synced to Xero. Sync supplier first.`,
        'invoice',
        bill.id,
        'SUPPLIER_NOT_SYNCED'
      );
    }

    // Get account mappings
    const accountMappings = await getAccountMappings(orgId);

    // Check if already synced
    const existingXeroId = await getXeroEntityId(orgId, 'invoice', bill.id);

    // Map to Xero format
    let xeroInvoice = mapSupplierInvoiceToXero(bill, xeroContactId, accountMappings);
    if (existingXeroId) {
      xeroInvoice.InvoiceID = existingXeroId;
    }

    // Resolve fiscal position and apply overrides if contact context provided
    if (contactFiscal?.countryId != null || contactFiscal?.stateId != null) {
      const fp = await resolveFiscalPosition(orgId, {
        countryId: contactFiscal.countryId ?? undefined,
        stateId: contactFiscal.stateId ?? undefined,
      });
      if (fp) {
        applyFiscalOverridesToInvoice(xeroInvoice, {
          accountOverrides: fp.accountOverrides,
          taxOverrides: fp.taxOverrides.map((t) => ({ xeroTaxType: t.xeroTaxType })),
        });
      }
    }

    const syncHash = generateSyncHash(xeroInvoice);

    let result: XeroInvoice;
    let action: 'create' | 'update';

    if (existingXeroId) {
      action = 'update';
      const response = await callXeroApi(tenantId, async () => {
        return xero.accountingApi.updateInvoice(tenantId, existingXeroId, { invoices: [xeroInvoice] });
      });
      const invoices = response.body?.invoices;
      if (!invoices || !Array.isArray(invoices) || invoices.length === 0) {
        throw new XeroSyncError(
          'No invoices returned from Xero API',
          'invoice',
          invoice.id,
          'NO_INVOICES_RETURNED'
        );
      }
      result = invoices[0] as XeroInvoice;
    } else {
      action = 'create';
      const response = await callXeroApi(tenantId, async () => {
        return xero.accountingApi.createInvoices(tenantId, { invoices: [xeroInvoice] });
      });
      const invoices = response.body?.invoices;
      if (!invoices || !Array.isArray(invoices) || invoices.length === 0) {
        throw new XeroSyncError(
          'No invoices returned from Xero API',
          'invoice',
          invoice.id,
          'NO_INVOICES_RETURNED'
        );
      }
      result = invoices[0] as XeroInvoice;
    }

    if (!result?.InvoiceID) {
      throw new XeroSyncError(
        'No InvoiceID returned from Xero',
        'invoice',
        bill.id,
        'NO_INVOICE_ID'
      );
    }

    await saveEntityMapping(orgId, 'invoice', bill.id, result.InvoiceID, syncHash);

    await logSyncSuccess(orgId, 'invoice', action, 'to_xero', {
      nxtEntityId: bill.id,
      xeroEntityId: result.InvoiceID,
      durationMs: Date.now() - startTime,
    });

    return {
      success: true,
      data: result,
      xeroEntityId: result.InvoiceID,
    };

  } catch (error) {
    const parsedError = parseXeroApiError(error);
    
    await logSyncError(orgId, 'invoice', 'create', 'to_xero', parsedError, {
      nxtEntityId: bill.id,
      durationMs: Date.now() - startTime,
    });

    return {
      success: false,
      error: parsedError.message,
      errorCode: parsedError.code,
    };
  }
}

// ============================================================================
// FETCH INVOICES FROM XERO
// ============================================================================

/**
 * Fetch invoices from Xero
 */
export async function fetchInvoicesFromXero(
  orgId: string,
  options: {
    type?: 'ACCREC' | 'ACCPAY';
    status?: string;
    modifiedAfter?: Date;
    page?: number;
  } = {}
): Promise<SyncResult<XeroInvoice[]>> {
  const startTime = Date.now();
  
  try {
    const { tokenSet, tenantId } = await getValidTokenSet(orgId);
    const xero = getXeroClient();
    xero.setTokenSet(tokenSet);

    // Build where clause
    const whereClauses: string[] = [];
    if (options.type) whereClauses.push(`Type=="${options.type}"`);
    if (options.status) whereClauses.push(`Status=="${options.status}"`);
    
    const where = whereClauses.length > 0 ? whereClauses.join(' AND ') : undefined;
    
    const response = await callXeroApi(tenantId, async () => {
      return xero.accountingApi.getInvoices(
        tenantId,
        options.modifiedAfter,
        where,
        undefined, // order
        undefined, // IDs
        undefined, // invoiceNumbers
        undefined, // contactIDs
        undefined, // statuses
        options.page,
        false, // includeArchived
        false, // createdByMyApp
        undefined, // unitdp
        false // summaryOnly
      );
    });

    const invoices = (response.body?.invoices || []) as XeroInvoice[];

    await logSyncSuccess(orgId, 'invoice', 'fetch', 'from_xero', {
      durationMs: Date.now() - startTime,
      recordsProcessed: invoices.length,
    });

    return {
      success: true,
      data: invoices,
    };

  } catch (error) {
    const parsedError = parseXeroApiError(error);
    
    await logSyncError(orgId, 'invoice', 'fetch', 'from_xero', parsedError, {
      durationMs: Date.now() - startTime,
    });

    return {
      success: false,
      error: parsedError.message,
      errorCode: parsedError.code,
    };
  }
}

/**
 * Fetch a single invoice from Xero by ID (for webhook real-time sync)
 */
export async function getInvoiceFromXero(
  orgId: string,
  xeroInvoiceId: string
): Promise<SyncResult<XeroInvoice>> {
  try {
    const { tokenSet, tenantId } = await getValidTokenSet(orgId);
    const xero = getXeroClient();
    xero.setTokenSet(tokenSet);

    const response = await callXeroApi(tenantId, async () => {
      return xero.accountingApi.getInvoices(
        tenantId,
        undefined, // modifiedAfter
        undefined, // where
        undefined, // order
        [xeroInvoiceId], // IDs - fetch single invoice
        undefined, // invoiceNumbers
        undefined, // contactIDs
        undefined, // statuses
        undefined, // page
        false, // includeArchived
        false, // createdByMyApp
        undefined, // unitdp
        false // summaryOnly
      );
    });

    const invoice = (response.body?.invoices || [])[0] as XeroInvoice | undefined;

    if (!invoice?.InvoiceID) {
      return {
        success: false,
        error: 'Invoice not found',
        errorCode: 'NOT_FOUND',
      };
    }

    return {
      success: true,
      data: invoice,
    };
  } catch (error) {
    const parsedError = parseXeroApiError(error);
    return {
      success: false,
      error: parsedError.message,
      errorCode: parsedError.code,
    };
  }
}
