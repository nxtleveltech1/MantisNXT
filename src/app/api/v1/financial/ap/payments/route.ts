/**
 * Accounts Payable Payments API
 * GET /api/v1/financial/ap/payments - List payments
 * POST /api/v1/financial/ap/payments - Create payment
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { APService } from '@/lib/services/financial';
import { getOrgId } from '../_helpers';
import { createAPPaymentSchema } from '@/lib/validation/financial';

export async function GET(request: NextRequest) {
  try {
    const orgId = await getOrgId(request);

    // List payments logic would go here
    return NextResponse.json({
      success: true,
      data: [],
      count: 0,
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

