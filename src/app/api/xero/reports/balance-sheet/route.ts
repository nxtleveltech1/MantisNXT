/**
 * Xero Balance Sheet Report
 * 
 * GET /api/xero/reports/balance-sheet
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { fetchBalanceSheetReport } from '@/lib/xero/sync/reports';
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
    const date = searchParams.get('date') || undefined;
    const periods = searchParams.get('periods') ? parseInt(searchParams.get('periods')!, 10) : undefined;
    const timeframe = searchParams.get('timeframe') as 'MONTH' | 'QUARTER' | 'YEAR' | undefined;

    const result = await fetchBalanceSheetReport(orgId, {
      date,
      periods,
      timeframe,
    });

    return NextResponse.json(result);

  } catch (error) {
    return handleApiError(error, 'Xero Report Balance Sheet');
  }
}
