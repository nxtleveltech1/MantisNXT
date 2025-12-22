/**
 * Accounts Payable Invoices API
 * GET /api/v1/financial/ap/invoices - List vendor invoices
 * POST /api/v1/financial/ap/invoices - Create vendor invoice
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { APService } from '@/lib/services/financial';
import { getOrgId } from '../../_helpers';
import { createAPInvoiceSchema } from '@/lib/validation/financial';

export async function GET(request: NextRequest) {
  try {
    const orgId = await getOrgId(request);
    const searchParams = request.nextUrl.searchParams;

    const filters = {
      vendor_id: searchParams.get('vendor_id') || undefined,
      status: searchParams.get('status') || undefined,
      date_from: searchParams.get('date_from') || undefined,
      date_to: searchParams.get('date_to') || undefined,
      overdue: searchParams.get('overdue') === 'true',
    };

    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const result = await APService.getVendorInvoices(orgId, filters, limit, offset);

    return NextResponse.json({
      data: result.data,
      count: result.count,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching AP invoices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoices' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const orgId = await getOrgId(request);
    const body = await request.json();

    const validated = createAPInvoiceSchema.parse({
      ...body,
      org_id: orgId,
    });

    const invoice = await APService.createVendorInvoice(validated);

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

    console.error('Error creating AP invoice:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create invoice',
      },
      { status: 500 }
    );
  }
}

