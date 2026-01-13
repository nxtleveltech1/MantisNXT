/**
 * Xero Aged Receivables Report
 * 
 * GET /api/xero/reports/aged-receivables
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { fetchAgedReceivablesReport } from '@/lib/xero/sync/reports';
import { hasActiveConnection } from '@/lib/xero/token-manager';
import { parseXeroApiError, getUserFriendlyMessage } from '@/lib/xero/errors';

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

    const result = await fetchAgedReceivablesReport(orgId, {
      date,
      fromDate,
      toDate,
    });

    return NextResponse.json(result);

  } catch (error) {
    console.error('[Xero Report Aged Receivables] Error:', error);
    
    const parsedError = parseXeroApiError(error);
    const message = getUserFriendlyMessage(parsedError);

    return NextResponse.json(
      { success: false, error: message, code: parsedError.code },
      { status: 500 }
    );
  }
}
