import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/auth-helper';
import * as equipmentService from '@/services/rentals/equipmentService';
import { z } from 'zod';

const updateEquipmentSchema = z.object({
  name: z.string().min(1).max(500).optional(),
  equipment_type: z.string().min(1).max(50).optional(),
  condition_status: z.enum(['excellent', 'good', 'fair', 'poor', 'damaged']).optional(),
  availability_status: z.enum(['available', 'rented', 'maintenance', 'retired']).optional(),
  current_location_id: z.string().uuid().optional(),
  rental_rate_daily: z.number().nonnegative().optional(),
  rental_rate_weekly: z.number().nonnegative().optional(),
  rental_rate_monthly: z.number().nonnegative().optional(),
  security_deposit: z.number().nonnegative().optional(),
  technical_specs: z.record(z.unknown()).optional(),
  compatibility_info: z.record(z.unknown()).optional(),
  next_maintenance_due: z.string().optional(),
  is_active: z.boolean().optional(),
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
    const equipment = await equipmentService.getEquipmentById(id);

    if (!equipment) {
      return NextResponse.json(
        { success: false, error: 'NOT_FOUND', message: 'Equipment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: equipment });
  } catch (error) {
    console.error('Error in GET /api/rentals/equipment/[id]:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch equipment',
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
    const validated = updateEquipmentSchema.parse(body);

    const equipment = await equipmentService.updateEquipment(id, validated);

    return NextResponse.json({ success: true, data: equipment });
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

    console.error('Error in PUT /api/rentals/equipment/[id]:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update equipment',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
    await equipmentService.deleteEquipment(id);

    return NextResponse.json({ success: true, message: 'Equipment deleted' });
  } catch (error) {
    console.error('Error in DELETE /api/rentals/equipment/[id]:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete equipment',
      },
      { status: 500 }
    );
  }
}

