/**
 * Xero Trial Balance Report
 *
 * GET /api/xero/reports/trial-balance
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchTrialBalanceReport } from '@/lib/xero/sync/reports';
import { parseTrialBalanceReport } from '@/lib/xero/sync/report-parsers';
import { handleApiError } from '@/lib/xero/errors';
import { validateXeroRequest } from '@/lib/xero/validation';

// TODO: Add parsing for Trial Balance report when needed

export async function GET(request: NextRequest) {
  try {
    const validation = await validateXeroRequest(request, true);
    if (validation.error) return validation.error;
    const { orgId } = validation;

    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get('date') || undefined;
    const parsed = searchParams.get('parsed') === 'true';

    const result = await fetchTrialBalanceReport(orgId, {
      date,
    });

    if (parsed && result.success && result.data) {
      const parsedData = parseTrialBalanceReport(result.data);
      return NextResponse.json({
        success: true,
        data: parsedData,
        rawReport: result.data,
      });
    }

    return NextResponse.json(result);

  } catch (error) {
    return handleApiError(error, 'Xero Report Trial Balance');
  }
}
