/**
 * Accounts Receivable Invoices API
 * GET /api/v1/financial/ar/invoices - List customer invoices
 * POST /api/v1/financial/ar/invoices - Create customer invoice
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ARService } from '@/lib/services/financial';
import { getOrgId } from '../../_helpers';
import { createARInvoiceSchema } from '@/lib/validation/financial';

export async function GET(request: NextRequest) {
  try {
    const orgId = await getOrgId(request);
    const searchParams = request.nextUrl.searchParams;

    const filters = {
      customer_id: searchParams.get('customer_id') || undefined,
      status: searchParams.get('status') || undefined,
      source_type: searchParams.get('source_type') as 'sales_invoice' | 'direct_ar' | 'manual' | undefined,
      date_from: searchParams.get('date_from') || undefined,
      date_to: searchParams.get('date_to') || undefined,
      overdue: searchParams.get('overdue') === 'true',
    };

    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const result = await ARService.getARInvoices(orgId, filters, limit, offset);

    return NextResponse.json({
      success: true,
      data: result.data,
      count: result.count,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching AR invoices:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch invoices',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const orgId = await getOrgId(request);
    const body = await request.json();

    const validated = createARInvoiceSchema.parse({
      ...body,
      org_id: orgId,
    });

    const invoice = await ARService.createCustomerInvoice(validated);

    return NextResponse.json(
      {
        success: true,
        data: invoice,
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

    console.error('Error creating AR invoice:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create invoice',
      },
      { status: 500 }
    );
  }
}

