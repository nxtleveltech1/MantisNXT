/**
 * Xero Bank Transactions (fetch only)
 *
 * GET /api/xero/bank-transactions
 *
 * Fetches bank transactions from Xero for reconciliation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { fetchBankTransactionsFromXero } from '@/lib/xero/sync/bank-transactions';
import { hasActiveConnection } from '@/lib/xero/token-manager';
import { handleApiError } from '@/lib/xero/errors';

export async function GET(request: NextRequest) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json(
        { error: 'No organization selected' },
        { status: 400 }
      );
    }

    const isConnected = await hasActiveConnection(orgId);
    if (!isConnected) {
      return NextResponse.json(
        { error: 'Not connected to Xero. Connect first.' },
        { status: 400 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const bankAccountId = searchParams.get('bankAccountId') || undefined;
    const fromDate = searchParams.get('fromDate') || undefined;
    const toDate = searchParams.get('toDate') || undefined;

    const result = await fetchBankTransactionsFromXero(orgId, {
      bankAccountId,
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, 'Xero Bank Transactions');
  }
}
