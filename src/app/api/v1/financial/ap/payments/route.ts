/**
 * Accounts Payable Payments API
 * GET /api/v1/financial/ap/payments - List payments
 * POST /api/v1/financial/ap/payments - Create payment
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { APService } from '@/lib/services/financial';
import { getOrgId } from '../../_helpers';
import { createAPPaymentSchema } from '@/lib/validation/financial';

export async function GET(request: NextRequest) {
  try {
    const orgId = await getOrgId(request);
    const searchParams = request.nextUrl.searchParams;
    
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const vendor_id = searchParams.get('vendor_id') || undefined;
    const status = searchParams.get('status') || undefined;
    const date_from = searchParams.get('date_from') || undefined;
    const date_to = searchParams.get('date_to') || undefined;
    const payment_method = searchParams.get('payment_method') || undefined;

    const { data, count } = await APService.getPayments(
      orgId,
      {
        vendor_id,
        status,
        date_from,
        date_to,
        payment_method,
      },
      limit,
      offset
    );

    return NextResponse.json({
      success: true,
      data,
      count,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching AP payments:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch payments',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const orgId = await getOrgId(request);
    const body = await request.json();

    const validated = createAPPaymentSchema.parse({
      ...body,
      org_id: orgId,
    });

    const payment = await APService.processPayment(validated);

    return NextResponse.json(
      {
        success: true,
        data: payment,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          details: error.errors.map((err) => ({
            path: err.path.join('.'),
            message: err.message,
            code: err.code,
          })),
        },
        { status: 400 }
      );
    }

    console.error('Error creating payment:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create payment',
      },
      { status: 500 }
    );
  }
}

