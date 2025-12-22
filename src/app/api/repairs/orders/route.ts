import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/auth-helper';
import * as repairOrderService from '@/services/repairs/repairOrderService';
import { z } from 'zod';

const createRepairOrderSchema = z.object({
  equipment_id: z.string().uuid().optional(),
  customer_id: z.string().uuid().optional(),
  order_type: z.enum(['repair', 'maintenance', 'calibration', 'inspection']),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  reported_issue: z.string().min(1),
  assigned_technician_id: z.string().uuid().optional(),
  estimated_completion_date: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const equipment_id = searchParams.get('equipment_id') || undefined;
    const customer_id = searchParams.get('customer_id') || undefined;
    const status = searchParams.get('status') as
      | 'received'
      | 'diagnosed'
      | 'in_progress'
      | 'waiting_parts'
      | 'testing'
      | 'completed'
      | 'cancelled'
      | undefined;
    const assigned_technician_id = searchParams.get('assigned_technician_id') || undefined;
    const order_type = searchParams.get('order_type') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined;

    const orders = await repairOrderService.listRepairOrders({
      equipment_id,
      customer_id,
      status,
      assigned_technician_id,
      order_type,
      limit,
      offset,
    });

    return NextResponse.json({ success: true, data: orders });
  } catch (error) {
    console.error('Error in GET /api/repairs/orders:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch repair orders',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validated = createRepairOrderSchema.parse(body);

    const order = await repairOrderService.createRepairOrder(validated, user.id);

    return NextResponse.json({ success: true, data: order }, { status: 201 });
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

    console.error('Error in POST /api/repairs/orders:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create repair order',
      },
      { status: 500 }
    );
  }
}

