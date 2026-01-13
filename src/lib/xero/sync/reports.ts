/**
 * Xero Reports Integration
 * 
 * Fetch financial reports from Xero.
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

export interface XeroReportRow {
  RowType: string;
  Title?: string;
  Cells?: Array<{
    Value: string;
    Attributes?: Array<{
      Id: string;
      Value: string;
    }>;
  }>;
  Rows?: XeroReportRow[];
}

export interface XeroReport {
  ReportID?: string;
  ReportName?: string;
  ReportType?: string;
  ReportTitle?: string[];
  ReportDate?: string;
  UpdatedDateUTC?: string;
  Rows?: XeroReportRow[];
}

export interface ProfitLossReport {
  reportDate: string;
  periodStart: string;
  periodEnd: string;
  revenue: number;
  costOfSales: number;
  grossProfit: number;
  operatingExpenses: number;
  netProfit: number;
  sections: Array<{
    title: string;
    total: number;
    items: Array<{
      accountCode: string;
      accountName: string;
      amount: number;
    }>;
  }>;
}

export interface BalanceSheetReport {
  reportDate: string;
  assets: {
    current: number;
    fixed: number;
    total: number;
  };
  liabilities: {
    current: number;
    nonCurrent: number;
    total: number;
  };
  equity: number;
  sections: Array<{
    title: string;
    total: number;
    items: Array<{
      accountCode: string;
      accountName: string;
      amount: number;
    }>;
  }>;
}

export interface AgedReceivablesReport {
  reportDate: string;
  totalOutstanding: number;
  contacts: Array<{
    contactId: string;
    contactName: string;
    current: number;
    thirtyDays: number;
    sixtyDays: number;
    ninetyDays: number;
    older: number;
    total: number;
  }>;
}

// ============================================================================
// PROFIT & LOSS REPORT
// ============================================================================

/**
 * Fetch Profit & Loss report from Xero
 */
export async function fetchProfitAndLossReport(
  orgId: string,
  options: {
    fromDate?: string;
    toDate?: string;
    periods?: number;
    timeframe?: 'MONTH' | 'QUARTER' | 'YEAR';
  } = {}
): Promise<SyncResult<XeroReport>> {
  const startTime = Date.now();
  
  try {
    const { tokenSet, tenantId } = await getValidTokenSet(orgId);
    const xero = getXeroClient();
    xero.setTokenSet(tokenSet);
    
    const response = await callXeroApi(tenantId, async () => {
      return xero.accountingApi.getReportProfitAndLoss(
        tenantId,
        options.fromDate,
        options.toDate,
        options.periods,
        options.timeframe,
        undefined, // trackingCategoryID
        undefined, // trackingCategoryID2
        undefined, // trackingOptionID
        undefined, // trackingOptionID2
        undefined  // standardLayout
      );
    });

    const report = response.body.reports?.[0] as XeroReport;

    await logSyncSuccess(orgId, 'report', 'fetch', 'from_xero', {
      durationMs: Date.now() - startTime,
    });

    return {
      success: true,
      data: report,
    };

  } catch (error) {
    const parsedError = parseXeroApiError(error);
    
    await logSyncError(orgId, 'report', 'fetch', 'from_xero', parsedError, {
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
// BALANCE SHEET REPORT
// ============================================================================

/**
 * Fetch Balance Sheet report from Xero
 */
export async function fetchBalanceSheetReport(
  orgId: string,
  options: {
    date?: string;
    periods?: number;
    timeframe?: 'MONTH' | 'QUARTER' | 'YEAR';
  } = {}
): Promise<SyncResult<XeroReport>> {
  const startTime = Date.now();
  
  try {
    const { tokenSet, tenantId } = await getValidTokenSet(orgId);
    const xero = getXeroClient();
    xero.setTokenSet(tokenSet);
    
    const response = await callXeroApi(tenantId, async () => {
      return xero.accountingApi.getReportBalanceSheet(
        tenantId,
        options.date,
        options.periods,
        options.timeframe,
        undefined, // trackingOptionID1
        undefined, // trackingOptionID2
        undefined, // standardLayout
        undefined  // paymentsOnly
      );
    });

    const report = response.body.reports?.[0] as XeroReport;

    await logSyncSuccess(orgId, 'report', 'fetch', 'from_xero', {
      durationMs: Date.now() - startTime,
    });

    return {
      success: true,
      data: report,
    };

  } catch (error) {
    const parsedError = parseXeroApiError(error);
    
    await logSyncError(orgId, 'report', 'fetch', 'from_xero', parsedError, {
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
// AGED RECEIVABLES REPORT
// ============================================================================

/**
 * Fetch Aged Receivables report from Xero
 */
export async function fetchAgedReceivablesReport(
  orgId: string,
  options: {
    date?: string;
    fromDate?: string;
    toDate?: string;
  } = {}
): Promise<SyncResult<XeroReport>> {
  const startTime = Date.now();
  
  try {
    const { tokenSet, tenantId } = await getValidTokenSet(orgId);
    const xero = getXeroClient();
    xero.setTokenSet(tokenSet);
    
    const response = await callXeroApi(tenantId, async () => {
      return xero.accountingApi.getReportAgedReceivablesByContact(
        tenantId,
        undefined, // contactId
        options.date,
        options.fromDate,
        options.toDate
      );
    });

    const report = response.body.reports?.[0] as XeroReport;

    await logSyncSuccess(orgId, 'report', 'fetch', 'from_xero', {
      durationMs: Date.now() - startTime,
    });

    return {
      success: true,
      data: report,
    };

  } catch (error) {
    const parsedError = parseXeroApiError(error);
    
    await logSyncError(orgId, 'report', 'fetch', 'from_xero', parsedError, {
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
// AGED PAYABLES REPORT
// ============================================================================

/**
 * Fetch Aged Payables report from Xero
 */
export async function fetchAgedPayablesReport(
  orgId: string,
  options: {
    date?: string;
    fromDate?: string;
    toDate?: string;
  } = {}
): Promise<SyncResult<XeroReport>> {
  const startTime = Date.now();
  
  try {
    const { tokenSet, tenantId } = await getValidTokenSet(orgId);
    const xero = getXeroClient();
    xero.setTokenSet(tokenSet);
    
    const response = await callXeroApi(tenantId, async () => {
      return xero.accountingApi.getReportAgedPayablesByContact(
        tenantId,
        undefined, // contactId
        options.date,
        options.fromDate,
        options.toDate
      );
    });

    const report = response.body.reports?.[0] as XeroReport;

    await logSyncSuccess(orgId, 'report', 'fetch', 'from_xero', {
      durationMs: Date.now() - startTime,
    });

    return {
      success: true,
      data: report,
    };

  } catch (error) {
    const parsedError = parseXeroApiError(error);
    
    await logSyncError(orgId, 'report', 'fetch', 'from_xero', parsedError, {
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
// TRIAL BALANCE REPORT
// ============================================================================

/**
 * Fetch Trial Balance report from Xero
 */
export async function fetchTrialBalanceReport(
  orgId: string,
  options: {
    date?: string;
  } = {}
): Promise<SyncResult<XeroReport>> {
  const startTime = Date.now();
  
  try {
    const { tokenSet, tenantId } = await getValidTokenSet(orgId);
    const xero = getXeroClient();
    xero.setTokenSet(tokenSet);
    
    const response = await callXeroApi(tenantId, async () => {
      return xero.accountingApi.getReportTrialBalance(
        tenantId,
        options.date,
        undefined // paymentsOnly
      );
    });

    const report = response.body.reports?.[0] as XeroReport;

    await logSyncSuccess(orgId, 'report', 'fetch', 'from_xero', {
      durationMs: Date.now() - startTime,
    });

    return {
      success: true,
      data: report,
    };

  } catch (error) {
    const parsedError = parseXeroApiError(error);
    
    await logSyncError(orgId, 'report', 'fetch', 'from_xero', parsedError, {
      durationMs: Date.now() - startTime,
    });

    return {
      success: false,
      error: parsedError.message,
      errorCode: parsedError.code,
    };
  }
}
