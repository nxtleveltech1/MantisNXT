/**
 * Xero Payments Sync
 * 
 * Handles synchronization of Payments between NXT and Xero.
 */

import { getXeroClient } from '../client';
import { getValidTokenSet } from '../token-manager';
import { callXeroApi } from '../rate-limiter';
import { logSyncSuccess, logSyncError } from '../sync-logger';
import { mapPaymentToXero } from '../mappers';
import { parseXeroApiError } from '../errors';
import { 
  getXeroEntityId, 
  saveEntityMapping, 
  getAccountMappingsWithIds 
} from './helpers';
import type { XeroPayment, SyncResult } from '../types';

// ============================================================================
// TYPES
// ============================================================================

interface NxtPayment {
  id: string;
  invoiceId: string;
  amount: number;
  date: Date | string;
  reference?: string;
}

// ============================================================================
// SYNC PAYMENT TO XERO
// ============================================================================

/**
 * Sync a payment to Xero
 */
export async function syncPaymentToXero(
  orgId: string,
  payment: NxtPayment
): Promise<SyncResult<XeroPayment>> {
  const startTime = Date.now();
  
  try {
    const { tokenSet, tenantId } = await getValidTokenSet(orgId);
    const xero = getXeroClient();
    xero.setTokenSet(tokenSet);

    // Get Xero invoice ID
    const xeroInvoiceId = await getXeroEntityId(orgId, 'invoice', payment.invoiceId);
    if (!xeroInvoiceId) {
      throw new Error('Invoice not synced to Xero. Sync invoice first.');
    }

    // Get bank account mapping
    const mappings = await getAccountMappingsWithIds(orgId);
    const bankAccountId = mappings.bank_account?.id;
    if (!bankAccountId) {
      throw new Error('Bank account not configured. Set up account mappings first.');
    }

    // Check if already synced
    const existingXeroId = await getXeroEntityId(orgId, 'payment', payment.id);
    if (existingXeroId) {
      // Payments cannot be updated in Xero - return existing
      return {
        success: true,
        xeroEntityId: existingXeroId,
      };
    }

    // Map to Xero format
    const xeroPayment = mapPaymentToXero(payment, xeroInvoiceId, bankAccountId);

    // Create payment in Xero
    const response = await callXeroApi(tenantId, async () => {
      return xero.accountingApi.createPayment(tenantId, { payments: [xeroPayment] });
    });

    const result = response.body.payments?.[0] as XeroPayment;

    if (!result?.PaymentID) {
      throw new Error('No PaymentID returned from Xero');
    }

    await saveEntityMapping(orgId, 'payment', payment.id, result.PaymentID);

    await logSyncSuccess(orgId, 'payment', 'create', 'to_xero', {
      nxtEntityId: payment.id,
      xeroEntityId: result.PaymentID,
      durationMs: Date.now() - startTime,
    });

    return {
      success: true,
      data: result,
      xeroEntityId: result.PaymentID,
    };

  } catch (error) {
    const parsedError = parseXeroApiError(error);
    
    await logSyncError(orgId, 'payment', 'create', 'to_xero', parsedError, {
      nxtEntityId: payment.id,
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
// FETCH PAYMENTS FROM XERO
// ============================================================================

/**
 * Fetch payments from Xero
 */
export async function fetchPaymentsFromXero(
  orgId: string,
  options: {
    modifiedAfter?: Date;
  } = {}
): Promise<SyncResult<XeroPayment[]>> {
  const startTime = Date.now();
  
  try {
    const { tokenSet, tenantId } = await getValidTokenSet(orgId);
    const xero = getXeroClient();
    xero.setTokenSet(tokenSet);
    
    const response = await callXeroApi(tenantId, async () => {
      return xero.accountingApi.getPayments(
        tenantId,
        options.modifiedAfter,
        undefined, // where
        undefined  // order
      );
    });

    const payments = (response.body.payments || []) as XeroPayment[];

    await logSyncSuccess(orgId, 'payment', 'fetch', 'from_xero', {
      durationMs: Date.now() - startTime,
      recordsProcessed: payments.length,
    });

    return {
      success: true,
      data: payments,
    };

  } catch (error) {
    const parsedError = parseXeroApiError(error);
    
    await logSyncError(orgId, 'payment', 'fetch', 'from_xero', parsedError, {
      durationMs: Date.now() - startTime,
    });

    return {
      success: false,
      error: parsedError.message,
      errorCode: parsedError.code,
    };
  }
}
