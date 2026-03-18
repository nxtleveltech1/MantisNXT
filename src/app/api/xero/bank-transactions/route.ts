/**
 * Xero Bank Transactions (fetch only)
 *
 * GET /api/xero/bank-transactions
 *
 * Fetches bank transactions from Xero for reconciliation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchBankTransactionsFromXero } from '@/lib/xero/sync/bank-transactions';
import { handleApiError } from '@/lib/xero/errors';
import { validateXeroRequest } from '@/lib/xero/validation';

export async function GET(request: NextRequest) {
  try {
    const validation = await validateXeroRequest(request, true);
    if (validation.error) return validation.error;
    const { orgId } = validation;

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
