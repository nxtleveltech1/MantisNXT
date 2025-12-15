import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { SalesOrderService } from '@/lib/services/sales';
import { getOrgId } from '../_helpers';

const salesOrderItemSchema = z.object({
  product_id: z.string().uuid().optional().nullable(),
  sku: z.string().optional().nullable(),
  name: z.string().optional().nullable(),
  quantity: z.number().positive(),
  price: z.number().nonnegative().optional().nullable(),
  subtotal: z.number().nonnegative().optional().nullable(),
  total: z.number().nonnegative().optional().nullable(),
  tax: z.number().nonnegative().optional().nullable(),
  metadata: z.record(z.unknown()).optional(),
});

const createSalesOrderSchema = z.object({
  customer_id: z.string().uuid(),
  document_number: z.string().optional(),
  status_enum: z
    .enum(['draft', 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'completed'])
    .optional(),
  currency: z.string().default('ZAR'),
  quotation_id: z.string().uuid().optional().nullable(),
  billing_address: z.record(z.unknown()).optional(),
  shipping_address: z.record(z.unknown()).optional(),
  notes: z.string().optional().nullable(),
  valid_until: z.string().optional().nullable(),
  reference_number: z.string().optional().nullable(),
  metadata: z.record(z.unknown()).optional(),
  created_by: z.string().uuid().optional().nullable(),
  items: z.array(salesOrderItemSchema).min(1),
});

export async function GET(request: NextRequest) {
  try {
    const orgId = await getOrgId(request);
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const status = searchParams.get('status') || undefined;
    const customer_id = searchParams.get('customer_id') || undefined;
    const manual_only = searchParams.get('manual_only') === 'true';

    const { data, count } = await SalesOrderService.getSalesOrders(orgId, limit, offset, {
      status,
      customer_id,
      manual_only,
    });

    return NextResponse.json({
      success: true,
      data,
      total: count,
      limit,
      offset,
    });
  } catch (error: unknown) {
    console.error('Error in GET /api/v1/sales/sales-orders:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch sales orders',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const orgId = await getOrgId(request);
    const body = await request.json();

    const validated = createSalesOrderSchema.parse(body);

    const salesOrder = await SalesOrderService.createSalesOrder({
      ...validated,
      org_id: orgId,
    });

    return NextResponse.json(
      {
        success: true,
        data: salesOrder,
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

    console.error('Error in POST /api/v1/sales/sales-orders:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create sales order',
      },
      { status: 500 }
    );
  }
}

