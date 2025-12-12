import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { SalesOrderService } from '@/lib/services/sales';
import { getOrgId } from '../../_helpers';

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

const updateSalesOrderSchema = z.object({
  status_enum: z
    .enum(['draft', 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'completed'])
    .optional(),
  currency: z.string().optional(),
  notes: z.string().optional().nullable(),
  valid_until: z.string().optional().nullable(),
  reference_number: z.string().optional().nullable(),
  billing_address: z.record(z.unknown()).optional(),
  shipping_address: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
  updated_by: z.string().uuid().optional().nullable(),
  items: z.array(salesOrderItemSchema).optional(),
});

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const orgId = await getOrgId(request);

    const salesOrder = await SalesOrderService.getSalesOrderById(id, orgId);

    if (!salesOrder) {
      return NextResponse.json(
        {
          success: false,
          error: 'Sales order not found',
        },
        { status: 404 }
      );
    }

    const items = await SalesOrderService.getSalesOrderItems(id);

    return NextResponse.json({
      success: true,
      data: {
        ...salesOrder,
        items,
      },
    });
  } catch (error: unknown) {
    console.error('Error in GET /api/v1/sales/sales-orders/[id]:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch sales order',
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

    const validated = updateSalesOrderSchema.parse(body);

    const salesOrder = await SalesOrderService.updateSalesOrder(id, orgId, validated);

    return NextResponse.json({
      success: true,
      data: salesOrder,
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

    console.error('Error in PUT /api/v1/sales/sales-orders/[id]:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update sales order',
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

    await SalesOrderService.deleteSalesOrder(id, orgId);

    return NextResponse.json({
      success: true,
      data: { id },
    });
  } catch (error: unknown) {
    console.error('Error in DELETE /api/v1/sales/sales-orders/[id]:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete sales order',
      },
      { status: 500 }
    );
  }
}

