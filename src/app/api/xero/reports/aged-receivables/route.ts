/**
 * Xero Aged Receivables Report
 * 
 * GET /api/xero/reports/aged-receivables
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchAgedReceivablesReport, parseAgedReceivablesReport } from '@/lib/xero/sync/reports';
import { handleApiError } from '@/lib/xero/errors';
import { validateXeroRequest } from '@/lib/xero/validation';

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

    const result = await fetchAgedReceivablesReport(orgId, {
      date,
      fromDate,
      toDate,
    });

    // Return parsed data if requested and successful
    if (parsed && result.success && result.data) {
      const parsedData = parseAgedReceivablesReport(result.data);
      return NextResponse.json({
        success: true,
        data: parsedData,
        rawReport: result.data,
      });
    }

    return NextResponse.json(result);

  } catch (error) {
    return handleApiError(error, 'Xero Report Aged Receivables');
  }
}
