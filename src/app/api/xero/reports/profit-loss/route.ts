/**
 * Xero Profit & Loss Report
 * 
 * GET /api/xero/reports/profit-loss
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { fetchProfitAndLossReport } from '@/lib/xero/sync/reports';
import { hasActiveConnection } from '@/lib/xero/token-manager';
import { handleApiError } from '@/lib/xero/errors';

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
    const fromDate = searchParams.get('fromDate') || undefined;
    const toDate = searchParams.get('toDate') || undefined;
    const periods = searchParams.get('periods') ? parseInt(searchParams.get('periods')!, 10) : undefined;
    const timeframe = searchParams.get('timeframe') as 'MONTH' | 'QUARTER' | 'YEAR' | undefined;

    const result = await fetchProfitAndLossReport(orgId, {
      fromDate,
      toDate,
      periods,
      timeframe,
    });

    return NextResponse.json(result);

  } catch (error) {
    return handleApiError(error, 'Xero Report P&L');
  }
}
