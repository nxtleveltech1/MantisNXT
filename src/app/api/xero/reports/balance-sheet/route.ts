/**
 * Xero Balance Sheet Report
 * 
 * GET /api/xero/reports/balance-sheet
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchBalanceSheetReport, parseBalanceSheetReport } from '@/lib/xero/sync/reports';
import { handleApiError } from '@/lib/xero/errors';
import { validateXeroRequest } from '@/lib/xero/validation';

export async function GET(request: NextRequest) {
  try {
    const validation = await validateXeroRequest(request, true);
    if (validation.error) return validation.error;
    const { orgId } = validation;

    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get('date') || undefined;
    const periods = searchParams.get('periods') ? parseInt(searchParams.get('periods')!, 10) : undefined;
    const timeframe = searchParams.get('timeframe') as 'MONTH' | 'QUARTER' | 'YEAR' | undefined;
    const parsed = searchParams.get('parsed') === 'true';

    const result = await fetchBalanceSheetReport(orgId, {
      date,
      periods,
      timeframe,
    });

    // Return parsed data if requested and successful
    if (parsed && result.success && result.data) {
      const parsedData = parseBalanceSheetReport(result.data);
      return NextResponse.json({
        success: true,
        data: parsedData,
        rawReport: result.data,
      });
    }

    return NextResponse.json(result);

  } catch (error) {
    return handleApiError(error, 'Xero Report Balance Sheet');
  }
}
