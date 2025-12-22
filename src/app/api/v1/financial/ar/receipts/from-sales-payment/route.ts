/**
 * Create AR Receipt from Sales Invoice Payment API
 * POST /api/v1/financial/ar/receipts/from-sales-payment
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ARService } from '@/lib/services/financial';
import { salesInvoicePaymentSchema } from '@/lib/validation/financial';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = salesInvoicePaymentSchema.parse(body);

    const receipt = await ARService.recordSalesInvoicePayment(validated.sales_invoice_id, {
      amount: validated.amount,
      payment_method: validated.payment_method,
      reference_number: validated.reference_number,
      transaction_id: validated.transaction_id,
      processed_by: validated.processed_by,
    });

    return NextResponse.json(
      {
        success: true,
        data: receipt,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    console.error('Error creating receipt from sales payment:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create receipt',
      },
      { status: 500 }
    );
  }
}

