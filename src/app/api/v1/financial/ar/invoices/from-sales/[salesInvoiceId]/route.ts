/**
 * Create AR Invoice from Sales Invoice API
 * POST /api/v1/financial/ar/invoices/from-sales/[salesInvoiceId]
 */

import { NextRequest, NextResponse } from 'next/server';
import { ARService } from '@/lib/services/financial';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ salesInvoiceId: string }> }
) {
  try {
    const { salesInvoiceId } = await params;
    const arInvoice = await ARService.syncSalesInvoiceToAR(salesInvoiceId);

    return NextResponse.json(
      {
        success: true,
        data: arInvoice,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating AR invoice from sales invoice:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create AR invoice',
      },
      { status: 500 }
    );
  }
}

