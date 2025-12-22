import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/auth-helper';
import * as repairOrderService from '@/services/repairs/repairOrderService';
import { z } from 'zod';

const updateRepairOrderSchema = z.object({
  status: z.enum(['received', 'diagnosed', 'in_progress', 'waiting_parts', 'testing', 'completed', 'cancelled']).optional(),
  diagnosis: z.string().optional(),
  assigned_technician_id: z.string().uuid().optional(),
  estimated_completion_date: z.string().optional(),
  labor_hours: z.number().nonnegative().optional(),
  notes: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const order = await repairOrderService.getRepairOrderById(id);

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'NOT_FOUND', message: 'Repair order not found' },
        { status: 404 }
      );
    }

    const items = await repairOrderService.getRepairOrderItems(id);

    return NextResponse.json({
      success: true,
      data: { ...order, items },
    });
  } catch (error) {
    console.error('Error in GET /api/repairs/orders/[id]:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch repair order',
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const validated = updateRepairOrderSchema.parse(body);

    const order = await repairOrderService.updateRepairOrder(id, validated);

    return NextResponse.json({ success: true, data: order });
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

    console.error('Error in PUT /api/repairs/orders/[id]:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update repair order',
      },
      { status: 500 }
    );
  }
}

