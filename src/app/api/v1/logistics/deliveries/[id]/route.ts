import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { DeliveryService } from '@/lib/services/logistics';
import { getOrgId } from '@/app/api/v1/sales/_helpers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const orgId = await getOrgId(request);

    const delivery = await DeliveryService.getDeliveryById(id, orgId);

    if (!delivery) {
      return NextResponse.json(
        {
          success: false,
          error: 'Delivery not found',
        },
        { status: 404 }
      );
    }

    // Get delivery items
    const items = await DeliveryService.getDeliveryItems(id);

    return NextResponse.json({
      success: true,
      data: {
        ...delivery,
        items,
      },
    });
  } catch (error) {
    console.error('Error fetching delivery:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch delivery',
      },
      { status: 500 }
    );
  }
}

const updateDeliverySchema = z.object({
  tracking_number: z.string().min(1).optional().nullable(),
  cost_actual: z.number().nonnegative().optional().nullable(),
  estimated_delivery_date: z.string().datetime().optional().nullable(),
  actual_pickup_date: z.string().datetime().optional().nullable(),
  actual_delivery_date: z.string().datetime().optional().nullable(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const orgId = await getOrgId(request);
    const body = await request.json();

    const validated = updateDeliverySchema.parse(body);

    const updated = await DeliveryService.updateDelivery(id, orgId, {
      tracking_number: validated.tracking_number ?? undefined,
      cost_actual: validated.cost_actual ?? undefined,
      estimated_delivery_date: validated.estimated_delivery_date
        ? new Date(validated.estimated_delivery_date).toISOString()
        : validated.estimated_delivery_date === null
          ? null
          : undefined,
      actual_pickup_date: validated.actual_pickup_date
        ? new Date(validated.actual_pickup_date).toISOString()
        : validated.actual_pickup_date === null
          ? null
          : undefined,
      actual_delivery_date: validated.actual_delivery_date
        ? new Date(validated.actual_delivery_date).toISOString()
        : validated.actual_delivery_date === null
          ? null
          : undefined,
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Delivery updated successfully',
    });
  } catch (error) {
    console.error('Error updating delivery:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update delivery',
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
    const { id } = await params;
    const orgId = await getOrgId(request);

    await DeliveryService.deleteDelivery(id, orgId);

    return NextResponse.json({
      success: true,
      message: 'Delivery deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting delivery:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete delivery',
      },
      { status: 500 }
    );
  }
}

