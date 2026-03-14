/**
 * Xero Payments Sync API
 *
 * GET /api/xero/sync/payments?invoiceType=ACCPAY|ACCREC
 * POST /api/xero/sync/payments
 *
 * List (GET) or sync (POST) payments to/from Xero.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  syncPaymentToXero,
  fetchPaymentsFromXero,
} from '@/lib/xero/sync/payments';
import { hasActiveConnection } from '@/lib/xero/token-manager';
import { handleApiError } from '@/lib/xero/errors';

export async function GET(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) {
      return NextResponse.json(
        { error: 'Unauthorized or no organization selected.' },
        { status: 401 }
      );
    }
    const isConnected = await hasActiveConnection(orgId);
    if (!isConnected) {
      return NextResponse.json(
        { error: 'Not connected to Xero.' },
        { status: 400 }
      );
    }

    const invoiceType = request.nextUrl.searchParams.get('invoiceType') as
      | 'ACCPAY'
      | 'ACCREC'
      | null;

    const result = await fetchPaymentsFromXero(orgId);

    if (!result.success || !result.data) {
      return NextResponse.json(
        { error: result.error ?? 'Failed to fetch payments' },
        { status: 400 }
      );
    }

    let payments = result.data;
    if (invoiceType) {
      payments = payments.filter(
        (p) => (p.Invoice as { Type?: string })?.Type === invoiceType
      );
    }

    const list = payments.map((p) => ({
      id: p.PaymentID,
      amount: p.Amount ?? 0,
      date: p.Date,
      reference: p.Reference,
      status: (p.Status ?? '').toLowerCase(),
      invoice_id: (p.Invoice as { InvoiceID?: string })?.InvoiceID,
      invoice_number: (p.Invoice as { InvoiceNumber?: string })?.InvoiceNumber,
    }));

    return NextResponse.json({ success: true, data: list, count: list.length });
  } catch (error) {
    return handleApiError(error, 'Xero Fetch Payments');
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { type, data } = body as { 
      type: 'create' | 'fetch';
      data?: unknown;
    };

    switch (type) {
      case 'create': {
        const result = await syncPaymentToXero(
          orgId, 
          data as Parameters<typeof syncPaymentToXero>[1]
        );
        return NextResponse.json(result);
      }

      case 'fetch': {
        const options = data as { modifiedAfter?: string };
        const result = await fetchPaymentsFromXero(orgId, {
          modifiedAfter: options?.modifiedAfter ? new Date(options.modifiedAfter) : undefined,
        });
        return NextResponse.json(result);
      }

      default:
        return NextResponse.json(
          { error: 'Invalid sync type. Expected: create or fetch' },
          { status: 400 }
        );
    }

  } catch (error) {
    return handleApiError(error, 'Xero Sync Payments');
  }
}
