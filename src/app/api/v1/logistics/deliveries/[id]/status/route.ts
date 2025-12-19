import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { DeliveryService, DeliveryTrackingService } from '@/lib/services/logistics';
import { getOrgId } from '../../../sales/_helpers';

const updateStatusSchema = z.object({
  status: z.enum([
    'pending',
    'confirmed',
    'picked_up',
    'in_transit',
    'out_for_delivery',
    'delivered',
    'failed',
    'cancelled',
    'returned',
  ]),
  location_lat: z.number().optional(),
  location_lng: z.number().optional(),
  location_address: z.string().optional(),
  notes: z.string().optional(),
  courier_name: z.string().optional(),
  courier_phone: z.string().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const orgId = await getOrgId(request);
    const body = await request.json();

    const validatedData = updateStatusSchema.parse(body);

    // Update delivery status
    const delivery = await DeliveryService.updateDeliveryStatus(
      id,
      orgId,
      validatedData.status
    );

    // Add to tracking history
    await DeliveryTrackingService.addStatusUpdate(id, validatedData.status, {
      location_lat: validatedData.location_lat,
      location_lng: validatedData.location_lng,
      location_address: validatedData.location_address,
      notes: validatedData.notes,
      courier_name: validatedData.courier_name,
      courier_phone: validatedData.courier_phone,
    });

    return NextResponse.json({
      success: true,
      data: delivery,
      message: 'Delivery status updated successfully',
    });
  } catch (error) {
    console.error('Error updating delivery status:', error);
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
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update delivery status',
      },
      { status: 500 }
    );
  }
}

