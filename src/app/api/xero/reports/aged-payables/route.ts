/**
 * Xero Aged Payables Report
 *
 * GET /api/xero/reports/aged-payables
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchAgedPayablesReport } from '@/lib/xero/sync/reports';
import { parseAgedPayablesReport } from '@/lib/xero/sync/report-parsers';
import { handleApiError } from '@/lib/xero/errors';
import { validateXeroRequest } from '@/lib/xero/validation';

// TODO: Add parsing for Aged Payables report when needed

export async function GET(request: NextRequest) {
  try {
    const validation = await validateXeroRequest(request, true);
    if (validation.error) return validation.error;
    const { orgId } = validation;

    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get('date') || undefined;
    const fromDate = searchParams.get('fromDate') || undefined;
    const toDate = searchParams.get('toDate') || undefined;
    const parsed = searchParams.get('parsed') === 'true';

    const result = await fetchAgedPayablesReport(orgId, {
      date,
      fromDate,
      toDate,
    });

    if (parsed && result.success && result.data) {
      const parsedData = parseAgedPayablesReport(result.data);
      return NextResponse.json({
        success: true,
        data: parsedData,
        rawReport: result.data,
      });
    }

    return NextResponse.json(result);

  } catch (error) {
    return handleApiError(error, 'Xero Report Aged Payables');
  }
}
