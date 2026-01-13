/**
 * Xero History and Notes Sync
 *
 * Handles adding history notes to Xero entities for audit trail.
 */

import { getXeroClient } from '../client';
import { getValidTokenSet } from '../token-manager';
import { callXeroApi } from '../rate-limiter';
import { logSyncSuccess, logSyncError } from '../sync-logger';
import { parseXeroApiError, XeroSyncError } from '../errors';
import type { SyncResult } from '../types';

// ============================================================================
// TYPES
// ============================================================================

export interface XeroHistoryRecord {
  HistoryRecordID?: string;
  Details: string;
  User?: string;
  Changes?: string;
  DateUTC?: string;
}

// ============================================================================
// ADD HISTORY NOTE TO XERO ENTITY
// ============================================================================

/**
 * Add a history note to a Xero entity
 */
export async function addHistoryNoteToXero(
  orgId: string,
  entityType: 'invoice' | 'credit_note' | 'quote' | 'contact' | 'bank_transaction' | 'item',
  entityId: string,
  note: string
): Promise<SyncResult<XeroHistoryRecord>> {
  const startTime = Date.now();

  try {
    const { tokenSet, tenantId } = await getValidTokenSet(orgId);
    const xero = getXeroClient();
    xero.setTokenSet(tokenSet);

    // Validate note length (max 2500 characters)
    if (note.length > 2500) {
      throw new XeroSyncError(
        'Note exceeds maximum length of 2500 characters',
        entityType,
        entityId,
        'NOTE_TOO_LONG'
      );
    }

    // Get Xero entity ID
    const { getXeroEntityId } = await import('./helpers');
    const xeroEntityId = await getXeroEntityId(orgId, entityType, entityId);

    if (!xeroEntityId) {
      throw new XeroSyncError(
        `${entityType} not synced to Xero. Sync entity first.`,
        entityType,
        entityId,
        'ENTITY_NOT_SYNCED'
      );
    }

    // Map entity type to API endpoint
    const endpoint = mapEntityTypeToEndpoint(entityType);

    // Add history note
    const response = await callXeroApi(tenantId, async () => {
      return xero.accountingApi.createHistoryRecord(tenantId, endpoint, xeroEntityId, {
        historyRecords: [{
          Details: note,
        }],
      });
    });

    const result = response.body.historyRecords?.[0] as XeroHistoryRecord;

    if (!result?.HistoryRecordID) {
      throw new XeroSyncError(
        'No HistoryRecordID returned from Xero',
        entityType,
        entityId,
        'NO_HISTORY_RECORD_ID'
      );
    }

    await logSyncSuccess(orgId, entityType, 'create', 'to_xero', {
      nxtEntityId: entityId,
      xeroEntityId,
      durationMs: Date.now() - startTime,
    });

    return {
      success: true,
      data: result,
    };

  } catch (error) {
    const parsedError = parseXeroApiError(error);

    await logSyncError(orgId, entityType, 'create', 'to_xero', parsedError, {
      nxtEntityId: entityId,
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
 * Fetch history records for a Xero entity
 */
export async function fetchHistoryRecordsFromXero(
  orgId: string,
  entityType: 'invoice' | 'credit_note' | 'quote' | 'contact' | 'bank_transaction' | 'item',
  entityId: string
): Promise<SyncResult<XeroHistoryRecord[]>> {
  const startTime = Date.now();

  try {
    const { tokenSet, tenantId } = await getValidTokenSet(orgId);
    const xero = getXeroClient();
    xero.setTokenSet(tokenSet);

    // Get Xero entity ID
    const { getXeroEntityId } = await import('./helpers');
    const xeroEntityId = await getXeroEntityId(orgId, entityType, entityId);

    if (!xeroEntityId) {
      throw new XeroSyncError(
        `${entityType} not synced to Xero. Sync entity first.`,
        entityType,
        entityId,
        'ENTITY_NOT_SYNCED'
      );
    }

    const endpoint = mapEntityTypeToEndpoint(entityType);

    const response = await callXeroApi(tenantId, async () => {
      return xero.accountingApi.getHistory(tenantId, endpoint, xeroEntityId);
    });

    const records = (response.body.historyRecords || []) as XeroHistoryRecord[];

    await logSyncSuccess(orgId, entityType, 'fetch', 'from_xero', {
      nxtEntityId: entityId,
      recordsProcessed: records.length,
      durationMs: Date.now() - startTime,
    });

    return {
      success: true,
      data: records,
    };

  } catch (error) {
    const parsedError = parseXeroApiError(error);

    await logSyncError(orgId, entityType, 'fetch', 'from_xero', parsedError, {
      nxtEntityId: entityId,
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
 * Map entity type to Xero API endpoint
 */
function mapEntityTypeToEndpoint(
  entityType: 'invoice' | 'credit_note' | 'quote' | 'contact' | 'bank_transaction' | 'item'
): string {
  const endpointMap: Record<string, string> = {
    invoice: 'Invoices',
    credit_note: 'CreditNotes',
    quote: 'Quotes',
    contact: 'Contacts',
    bank_transaction: 'BankTransactions',
    item: 'Items',
  };

  return endpointMap[entityType] || 'Invoices';
}
