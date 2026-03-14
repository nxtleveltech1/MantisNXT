/**
 * Xero Aged Payables Report
 *
 * GET /api/xero/reports/aged-payables
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { fetchAgedPayablesReport } from '@/lib/xero/sync/reports';
import { parseAgedPayablesReport } from '@/lib/xero/sync/report-parsers';
import { hasActiveConnection } from '@/lib/xero/token-manager';
import { handleApiError } from '@/lib/xero/errors';

// TODO: Add parsing for Aged Payables report when needed

export async function GET(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in.' },
        { status: 401 }
      );
    }

    if (!orgId) {
      return NextResponse.json(
        { error: 'No organization selected.' },
        { status: 400 }
      );
    }

    const isConnected = await hasActiveConnection(orgId);
    if (!isConnected) {
      return NextResponse.json(
        { error: 'Not connected to Xero. Please connect first.' },
        { status: 400 }
      );
    }

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