/**
 * Xero Bank Transactions Sync
 *
 * Handles synchronization of Bank Transactions (spend/receive, overpayments, prepayments)
 * between NXT and Xero.
 */

import { getXeroClient } from '../client';
import { getValidTokenSet } from '../token-manager';
import { callXeroApi } from '../rate-limiter';
import { logSyncSuccess, logSyncError } from '../sync-logger';
import { parseXeroApiError, XeroSyncError } from '../errors';
import { formatDateForXero } from '../mappers';
import type { SyncResult } from '../types';

// ============================================================================
// TYPES
// ============================================================================

export interface XeroBankTransaction {
  BankTransactionID?: string;
  Type: 'SPEND' | 'RECEIVE' | 'RECEIVE-OVERPAYMENT' | 'SPEND-OVERPAYMENT' | 'RECEIVE-PREPAYMENT' | 'SPEND-PREPAYMENT';
  Status: 'AUTHORISED' | 'DELETED';
  Total?: number;
  TotalTax?: number;
  SubTotal?: number;
  Contact?: { ContactID: string };
  LineItems: Array<{
    Description: string;
    Quantity?: number;
    UnitAmount?: number;
    LineAmount?: number;
    AccountCode: string;
    TaxType?: string;
  }>;
  BankAccount: { Code: string; AccountID?: string };
  Date?: string;
  Reference?: string;
  IsReconciled?: boolean;
}

interface NxtBankTransaction {
  id: string;
  type: 'spend' | 'receive' | 'overpayment' | 'prepayment';
  amount: number;
  date: Date | string;
  bankAccountCode: string;
  contactId?: string;
  reference?: string;
  description: string;
  accountCode: string;
  taxType?: string;
  isReconciled?: boolean;
}

// ============================================================================
// SYNC BANK TRANSACTION TO XERO
// ============================================================================

/**
 * Sync a bank transaction to Xero
 */
export async function syncBankTransactionToXero(
  orgId: string,
  transaction: NxtBankTransaction
): Promise<SyncResult<XeroBankTransaction>> {
  const startTime = Date.now();

  try {
    const { tokenSet, tenantId } = await getValidTokenSet(orgId);
    const xero = getXeroClient();
    xero.setTokenSet(tokenSet);

    // Map NXT type to Xero type
    const xeroType = mapTransactionType(transaction.type);

    // Build Xero bank transaction
    const xeroTransaction: XeroBankTransaction = {
      Type: xeroType,
      Status: 'AUTHORISED',
      BankAccount: {
        Code: transaction.bankAccountCode,
      },
      Date: formatDateForXero(transaction.date),
      Reference: transaction.reference,
      LineItems: [
        {
          Description: transaction.description,
          LineAmount: transaction.amount,
          AccountCode: transaction.accountCode,
          TaxType: transaction.taxType || 'NONE',
        },
      ],
      IsReconciled: transaction.isReconciled || false,
    };

    // Add contact if provided
    if (transaction.contactId) {
      const { getXeroEntityId } = await import('./helpers');
      const xeroContactId = await getXeroEntityId(orgId, 'contact', transaction.contactId);
      if (xeroContactId) {
        xeroTransaction.Contact = { ContactID: xeroContactId };
      }
    }

    // Create transaction in Xero
    const response = await callXeroApi(tenantId, async () => {
      return xero.accountingApi.createBankTransactions(tenantId, {
        bankTransactions: [xeroTransaction],
      });
    });

    const result = response.body.bankTransactions?.[0] as XeroBankTransaction;

    if (!result?.BankTransactionID) {
      throw new XeroSyncError(
        'No BankTransactionID returned from Xero',
        'bank_transaction',
        transaction.id,
        'NO_BANK_TRANSACTION_ID'
      );
    }

    // Save mapping
    const { saveEntityMapping } = await import('./helpers');
    await saveEntityMapping(orgId, 'bank_transaction', transaction.id, result.BankTransactionID);

    await logSyncSuccess(orgId, 'bank_transaction', 'create', 'to_xero', {
      nxtEntityId: transaction.id,
      xeroEntityId: result.BankTransactionID,
      durationMs: Date.now() - startTime,
    });

    return {
      success: true,
      data: result,
      xeroEntityId: result.BankTransactionID,
    };

  } catch (error) {
    const parsedError = parseXeroApiError(error);

    await logSyncError(orgId, 'bank_transaction', 'create', 'to_xero', parsedError, {
      nxtEntityId: transaction.id,
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
 * Map NXT transaction type to Xero type
 */
function mapTransactionType(nxtType: string): XeroBankTransaction['Type'] {
  switch (nxtType.toLowerCase()) {
    case 'spend':
      return 'SPEND';
    case 'receive':
      return 'RECEIVE';
    case 'overpayment':
      return 'RECEIVE-OVERPAYMENT';
    case 'prepayment':
      return 'RECEIVE-PREPAYMENT';
    default:
      return 'SPEND';
  }
}

// ============================================================================
// FETCH BANK TRANSACTIONS FROM XERO
// ============================================================================

/**
 * Fetch bank transactions from Xero
 */
export async function fetchBankTransactionsFromXero(
  orgId: string,
  options: {
    bankAccountId?: string;
    fromDate?: Date;
    toDate?: Date;
    status?: 'AUTHORISED' | 'DELETED';
    where?: string;
    order?: string;
    page?: number;
  } = {}
): Promise<SyncResult<XeroBankTransaction[]>> {
  const startTime = Date.now();

  try {
    const { tokenSet, tenantId } = await getValidTokenSet(orgId);
    const xero = getXeroClient();
    xero.setTokenSet(tokenSet);

    // Build query parameters
    const whereClause = buildWhereClause(options);
    const orderClause = options.order || 'Date DESC';
    const page = options.page || 1;

    const response = await callXeroApi(tenantId, async () => {
      return xero.accountingApi.getBankTransactions(
        tenantId,
        undefined, // ifModifiedSince
        whereClause,
        orderClause,
        undefined, // IDs
        undefined, // page
        undefined, // unitdp
        undefined, // summarizeErrors
        undefined, // pageSize (defaults to 100)
        undefined  // pageNumber
      );
    });

    const transactions = (response.body.bankTransactions || []) as XeroBankTransaction[];

    await logSyncSuccess(orgId, 'bank_transaction', 'fetch', 'from_xero', {
      recordsProcessed: transactions.length,
      durationMs: Date.now() - startTime,
    });

    return {
      success: true,
      data: transactions,
    };

  } catch (error) {
    const parsedError = parseXeroApiError(error);

    await logSyncError(orgId, 'bank_transaction', 'fetch', 'from_xero', parsedError, {
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
 * Build Xero where clause from options
 */
function buildWhereClause(options: {
  bankAccountId?: string;
  fromDate?: Date;
  toDate?: Date;
  status?: 'AUTHORISED' | 'DELETED';
  where?: string;
}): string | undefined {
  const conditions: string[] = [];

  if (options.bankAccountId) {
    conditions.push(`BankAccount.AccountID=Guid("${options.bankAccountId}")`);
  }

  if (options.fromDate) {
    conditions.push(`Date >= DateTime(${formatDateForXero(options.fromDate)})`);
  }

  if (options.toDate) {
    conditions.push(`Date <= DateTime(${formatDateForXero(options.toDate)})`);
  }

  if (options.status) {
    conditions.push(`Status=="${options.status}"`);
  }

  if (options.where) {
    conditions.push(options.where);
  }

  return conditions.length > 0 ? conditions.join(' AND ') : undefined;
}
