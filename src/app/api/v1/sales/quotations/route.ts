import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { QuotationService } from '@/lib/services/sales';
import { getOrgId } from '../_helpers';

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

const createQuotationSchema = z.object({
  customer_id: z.string().uuid(),
  document_number: z.string().optional(),
  status: z.enum(['draft', 'sent', 'accepted', 'rejected', 'expired', 'converted']).optional(),
  currency: z.string().default('ZAR'),
  valid_until: z.string().optional().nullable(),
  reference_number: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  billing_address: z.record(z.unknown()).optional(),
  shipping_address: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
  created_by: z.string().uuid().optional().nullable(),
  items: z.array(quotationItemSchema).min(1),
});

export async function GET(request: NextRequest) {
  try {
    const orgId = await getOrgId(request);
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const status = searchParams.get('status') || undefined;
    const customer_id = searchParams.get('customer_id') || undefined;

    const { data, count } = await QuotationService.getQuotations(orgId, limit, offset, {
      status,
      customer_id,
    });

    return NextResponse.json({
      success: true,
      data,
      total: count,
      limit,
      offset,
    });
  } catch (error: unknown) {
    console.error('Error in GET /api/v1/sales/quotations:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch quotations',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const orgId = await getOrgId(request);
    const body = await request.json();

    const validated = createQuotationSchema.parse({
      ...body,
      org_id: orgId,
    });

    const quotation = await QuotationService.createQuotation({
      ...validated,
      org_id: orgId,
    });

    return NextResponse.json(
      {
        success: true,
        data: quotation,
      },
      { status: 201 }
    );
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

    console.error('Error in POST /api/v1/sales/quotations:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create quotation',
      },
      { status: 500 }
    );
  }
}

