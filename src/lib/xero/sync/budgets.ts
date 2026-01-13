/**
 * Xero Budgets Sync
 *
 * Fetch financial budgets from Xero for planning and analysis.
 */

import { getXeroClient } from '../client';
import { getValidTokenSet } from '../token-manager';
import { callXeroApi } from '../rate-limiter';
import { logSyncSuccess, logSyncError } from '../sync-logger';
import { parseXeroApiError } from '../errors';
import type { SyncResult } from '../types';

// ============================================================================
// TYPES
// ============================================================================

export interface XeroBudget {
  BudgetID?: string;
  Type: 'OVERALL' | 'TRACKING';
  Description?: string;
  UpdatedDateUTC?: string;
  BudgetLines?: Array<{
    AccountID?: string;
    AccountCode?: string;
    BudgetBalances?: Array<{
      Period?: string;
      Amount?: number;
    }>;
  }>;
  Tracking?: Array<{
    Name?: string;
    Option?: string;
  }>;
}

// ============================================================================
// FETCH BUDGETS FROM XERO
// ============================================================================

/**
 * Fetch budgets from Xero
 */
export async function fetchBudgetsFromXero(
  orgId: string,
  options: {
    dateFrom?: string;
    dateTo?: string;
  } = {}
): Promise<SyncResult<XeroBudget[]>> {
  const startTime = Date.now();

  try {
    const { tokenSet, tenantId } = await getValidTokenSet(orgId);
    const xero = getXeroClient();
    xero.setTokenSet(tokenSet);

    const response = await callXeroApi(tenantId, async () => {
      return xero.accountingApi.getBudgets(
        tenantId,
        options.dateFrom,
        options.dateTo
      );
    });

    const budgets = (response.body.budgets || []) as XeroBudget[];

    await logSyncSuccess(orgId, 'budget', 'fetch', 'from_xero', {
      recordsProcessed: budgets.length,
      durationMs: Date.now() - startTime,
    });

    return {
      success: true,
      data: budgets,
    };

  } catch (error) {
    const parsedError = parseXeroApiError(error);

    await logSyncError(orgId, 'budget', 'fetch', 'from_xero', parsedError, {
      durationMs: Date.now() - startTime,
    });

    return {
      success: false,
      error: parsedError.message,
      errorCode: parsedError.code,
    };
  }
}
