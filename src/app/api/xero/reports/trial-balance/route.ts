/**
 * Xero Trial Balance Report
 *
 * GET /api/xero/reports/trial-balance
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { fetchTrialBalanceReport } from '@/lib/xero/sync/reports';
import { parseTrialBalanceReport } from '@/lib/xero/sync/report-parsers';
import { hasActiveConnection } from '@/lib/xero/token-manager';
import { handleApiError } from '@/lib/xero/errors';

// TODO: Add parsing for Trial Balance report when needed

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