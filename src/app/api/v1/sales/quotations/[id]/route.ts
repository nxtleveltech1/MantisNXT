import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { QuotationService } from '@/lib/services/sales';
import { getOrgId } from '../../_helpers';

const quotationItemSchema = z.object({
  product_id: z.string().uuid().optional().nullable(),
  supplier_product_id: z.string().uuid().optional().nullable(),
  sku: z.string().optional().nullable(),
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  quantity: z.number().positive(),
  unit_price: z.number().nonnegative(),
  tax_rate: z.number().min(0).max(1).default(0),
  tax_amount: z.number().nonnegative().default(0),
  subtotal: z.number().nonnegative(),
  total: z.number().nonnegative(),
  line_number: z.number().int().positive().optional().nullable(),
  metadata: z.record(z.unknown()).optional(),
});

const updateQuotationSchema = z.object({
  status: z.enum(['draft', 'sent', 'accepted', 'rejected', 'expired', 'converted']).optional(),
  currency: z.string().optional(),
  valid_until: z.string().optional().nullable(),
  reference_number: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  billing_address: z.record(z.unknown()).optional(),
  shipping_address: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
  updated_by: z.string().uuid().optional().nullable(),
  items: z.array(quotationItemSchema).optional(),
});

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const orgId = await getOrgId(request);

    const quotation = await QuotationService.getQuotationById(id, orgId);

    if (!quotation) {
      return NextResponse.json(
        {
          success: false,
          error: 'Quotation not found',
        },
        { status: 404 }
      );
    }

    const items = await QuotationService.getQuotationItems(id);

    return NextResponse.json({
      success: true,
      data: {
        ...quotation,
        items,
      },
    });
  } catch (error: unknown) {
    console.error('Error in GET /api/v1/sales/quotations/[id]:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch quotation',
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const orgId = await getOrgId(request);
    const body = await request.json();

    const validated = updateQuotationSchema.parse(body);

    const quotation = await QuotationService.updateQuotation(id, orgId, validated);

    return NextResponse.json({
      success: true,
      data: quotation,
    });
  } catch (error: unknown) {
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

    console.error('Error in PUT /api/v1/sales/quotations/[id]:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update quotation',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const orgId = await getOrgId(request);

    await QuotationService.deleteQuotation(id, orgId);

    return NextResponse.json({
      success: true,
      data: { id },
    });
  } catch (error: unknown) {
    console.error('Error in DELETE /api/v1/sales/quotations/[id]:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete quotation',
      },
      { status: 500 }
    );
  }
}

