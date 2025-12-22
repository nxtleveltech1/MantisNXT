/**
 * Get AR Invoice for Sales Invoice API
 * GET /api/v1/financial/ar/invoices/sales/[salesInvoiceId]
 */

import { NextRequest, NextResponse } from 'next/server';
import { ARService } from '@/lib/services/financial';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ salesInvoiceId: string }> }
) {
  try {
    const { salesInvoiceId } = await params;
    const arInvoice = await ARService.getSalesInvoiceARInvoice(salesInvoiceId);

    if (!arInvoice) {
      return NextResponse.json(
        {
          success: false,
          error: 'AR invoice not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: arInvoice,
    });
  } catch (error) {
    console.error('Error fetching AR invoice:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch AR invoice',
      },
      { status: 500 }
    );
  }
}

