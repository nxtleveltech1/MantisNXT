/**
 * Xero Bank Transactions Sync API
 *
 * POST /api/xero/sync/bank-transactions
 *
 * Sync bank transactions (spend/receive, overpayments, prepayments) to Xero.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  syncBankTransactionToXero,
  fetchBankTransactionsFromXero,
} from '@/lib/xero/sync/bank-transactions';
import { validateXeroRequest, validateSyncParams, successResponse } from '@/lib/xero/validation';
import { handleApiError } from '@/lib/xero/errors';

export async function POST(request: NextRequest) {
  try {
    const validation = await validateXeroRequest(request, true);
    if (validation.error) return validation.error;

    const { orgId } = validation;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const params = validateSyncParams(body);
    if (params instanceof NextResponse) return params;

    const { type, data } = params;

    switch (type) {
      case 'create': {
        const result = await syncBankTransactionToXero(
          orgId,
          data as Parameters<typeof syncBankTransactionToXero>[1]
        );
        return successResponse(result);
      }

      case 'fetch': {
        const options = data as {
          bankAccountId?: string;
          fromDate?: string;
          toDate?: string;
          status?: 'AUTHORISED' | 'DELETED';
        };
        const result = await fetchBankTransactionsFromXero(orgId, {
          bankAccountId: options?.bankAccountId,
          fromDate: options?.fromDate ? new Date(options.fromDate) : undefined,
          toDate: options?.toDate ? new Date(options.toDate) : undefined,
          status: options?.status,
        });
        return successResponse(result);
      }

      default:
        return NextResponse.json(
          { error: 'Invalid sync type. Expected: create or fetch' },
          { status: 400 }
        );
    }

  } catch (error) {
    return handleApiError(error, 'Xero Sync Bank Transactions');
  }
}
