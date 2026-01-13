/**
 * Xero Profit & Loss Report
 * 
 * GET /api/xero/reports/profit-loss
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchProfitAndLossReport, parseProfitLossReport } from '@/lib/xero/sync/reports';
import { validateXeroRequest, validateReportParams, successResponse } from '@/lib/xero/validation';
import { handleApiError } from '@/lib/xero/errors';

export async function GET(request: NextRequest) {
  try {
    // Validate request
    const validation = await validateXeroRequest(request, true);
    if (validation.error) return validation.error;

    const { orgId } = validation;

    // Validate report parameters
    const params = validateReportParams(request.nextUrl.searchParams);
    if (params instanceof NextResponse) return params;

    const { fromDate, toDate, periods, timeframe, parsed } = params;

    const result = await fetchProfitAndLossReport(orgId, {
      fromDate,
      toDate,
      periods,
      timeframe,
    });

    // Return parsed data if requested and successful
    if (parsed && result.success && result.data) {
      const parsedData = parseProfitLossReport(result.data);
      return successResponse(parsedData, { rawReport: result.data });
    }

    return successResponse(result);

  } catch (error) {
    return handleApiError(error, 'Xero Report P&L');
  }
}
