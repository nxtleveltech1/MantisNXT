/**
 * Xero Manual Journals Sync
 *
 * Handles synchronization of Manual Journal entries for ledger adjustments.
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

export interface XeroManualJournal {
  ManualJournalID?: string;
  Narration: string;
  JournalDate: string;
  JournalLines: Array<{
    LineAmount: number;
    AccountCode: string;
    Description?: string;
    TaxType?: string;
    Tracking?: Array<{
      Name?: string;
      Option?: string;
    }>;
  }>;
  Status?: 'POSTED' | 'DRAFT' | 'DELETED';
  CreatedDateUTC?: string;
  UpdatedDateUTC?: string;
}

interface NxtManualJournal {
  id: string;
  narration: string;
  date: Date | string;
  journalLines: Array<{
    lineAmount: number;
    accountCode: string;
    description?: string;
    taxType?: string;
  }>;
}

// ============================================================================
// SYNC MANUAL JOURNAL TO XERO
// ============================================================================

/**
 * Sync a manual journal to Xero
 */
export async function syncManualJournalToXero(
  orgId: string,
  journal: NxtManualJournal
): Promise<SyncResult<XeroManualJournal>> {
  const startTime = Date.now();

  try {
    const { tokenSet, tenantId } = await getValidTokenSet(orgId);
    const xero = getXeroClient();
    xero.setTokenSet(tokenSet);

    // Validate journal lines balance
    const total = journal.journalLines.reduce((sum, line) => sum + line.lineAmount, 0);
    if (Math.abs(total) > 0.01) {
      throw new XeroSyncError(
        `Journal lines must balance. Current total: ${total}`,
        'manual_journal',
        journal.id,
        'UNBALANCED_JOURNAL'
      );
    }

    // Build Xero manual journal
    const xeroJournal: XeroManualJournal = {
      Narration: journal.narration,
      JournalDate: formatDateForXero(journal.date),
      JournalLines: journal.journalLines.map(line => ({
        LineAmount: line.lineAmount,
        AccountCode: line.accountCode,
        Description: line.description,
        TaxType: line.taxType || 'NONE',
      })),
      Status: 'POSTED',
    };

    // Check if already synced
    const { getXeroEntityId, saveEntityMapping } = await import('./helpers');
    const existingXeroId = await getXeroEntityId(orgId, 'manual_journal', journal.id);

    let result: XeroManualJournal;
    let action: 'create' | 'update';

    if (existingXeroId) {
      action = 'update';
      xeroJournal.ManualJournalID = existingXeroId;
      const response = await callXeroApi(tenantId, async () => {
        return xero.accountingApi.updateManualJournal(tenantId, existingXeroId, {
          manualJournals: [xeroJournal],
        });
      });
      result = response.body.manualJournals?.[0] as XeroManualJournal;
    } else {
      action = 'create';
      const response = await callXeroApi(tenantId, async () => {
        return xero.accountingApi.createManualJournals(tenantId, {
          manualJournals: [xeroJournal],
        });
      });
      result = response.body.manualJournals?.[0] as XeroManualJournal;
    }

    if (!result?.ManualJournalID) {
      throw new XeroSyncError(
        'No ManualJournalID returned from Xero',
        'manual_journal',
        journal.id,
        'NO_MANUAL_JOURNAL_ID'
      );
    }

    await saveEntityMapping(orgId, 'manual_journal', journal.id, result.ManualJournalID);

    await logSyncSuccess(orgId, 'manual_journal', action, 'to_xero', {
      nxtEntityId: journal.id,
      xeroEntityId: result.ManualJournalID,
      durationMs: Date.now() - startTime,
    });

    return {
      success: true,
      data: result,
      xeroEntityId: result.ManualJournalID,
    };

  } catch (error) {
    const parsedError = parseXeroApiError(error);

    await logSyncError(orgId, 'manual_journal', 'create', 'to_xero', parsedError, {
      nxtEntityId: journal.id,
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
 * Fetch manual journals from Xero
 */
export async function fetchManualJournalsFromXero(
  orgId: string,
  options: {
    fromDate?: Date;
    toDate?: Date;
    where?: string;
    order?: string;
  } = {}
): Promise<SyncResult<XeroManualJournal[]>> {
  const startTime = Date.now();

  try {
    const { tokenSet, tenantId } = await getValidTokenSet(orgId);
    const xero = getXeroClient();
    xero.setTokenSet(tokenSet);

    const whereClause = buildWhereClause(options);
    const orderClause = options.order || 'JournalDate DESC';

    const response = await callXeroApi(tenantId, async () => {
      return xero.accountingApi.getManualJournals(
        tenantId,
        undefined, // ifModifiedSince
        whereClause,
        orderClause
      );
    });

    const journals = (response.body.manualJournals || []) as XeroManualJournal[];

    await logSyncSuccess(orgId, 'manual_journal', 'fetch', 'from_xero', {
      recordsProcessed: journals.length,
      durationMs: Date.now() - startTime,
    });

    return {
      success: true,
      data: journals,
    };

  } catch (error) {
    const parsedError = parseXeroApiError(error);

    await logSyncError(orgId, 'manual_journal', 'fetch', 'from_xero', parsedError, {
      durationMs: Date.now() - startTime,
    });

    return {
      success: false,
      error: parsedError.message,
      errorCode: parsedError.code,
    };
  }
}

function buildWhereClause(options: {
  fromDate?: Date;
  toDate?: Date;
  where?: string;
}): string | undefined {
  const conditions: string[] = [];

  if (options.fromDate) {
    conditions.push(`JournalDate >= DateTime(${formatDateForXero(options.fromDate)})`);
  }

  if (options.toDate) {
    conditions.push(`JournalDate <= DateTime(${formatDateForXero(options.toDate)})`);
  }

  if (options.where) {
    conditions.push(options.where);
  }

  return conditions.length > 0 ? conditions.join(' AND ') : undefined;
}
