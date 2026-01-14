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
import { 
  getXeroEntityId, 
  saveEntityMapping, 
  getAccountMappings 
} from './helpers';
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

/**
 * Sync a sales invoice (AR) to Xero as ACCREC
 */
export async function syncSalesInvoiceToXero(
  orgId: string,
  invoice: NxtSalesInvoice
): Promise<SyncResult<XeroInvoice>> {
  const startTime = Date.now();
  
  try {
    const { tokenSet, tenantId } = await getValidTokenSet(orgId);
    const xero = getXeroClient();
    xero.setTokenSet(tokenSet);

    // Get Xero contact ID for customer
    const xeroContactId = await getXeroEntityId(orgId, 'contact', invoice.customerId);
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
    const xeroInvoice = mapSalesInvoiceToXero(invoice, xeroContactId, accountMappings);
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
        invoice.id,
        'NO_INVOICE_ID'
      );
    }

    await saveEntityMapping(orgId, 'invoice', invoice.id, result.InvoiceID, syncHash);

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
  }
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
    const xeroInvoice = mapSupplierInvoiceToXero(bill, xeroContactId, accountMappings);
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
