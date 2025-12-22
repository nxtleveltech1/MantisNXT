import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/auth-helper';
import * as reservationService from '@/services/rentals/reservationService';
import { z } from 'zod';

const createReservationSchema = z.object({
  customer_id: z.string().uuid(),
  event_name: z.string().max(500).optional(),
  event_type: z.string().max(100).optional(),
  event_date_start: z.string().optional(),
  event_date_end: z.string().optional(),
  rental_start_date: z.string(),
  rental_end_date: z.string(),
  pickup_location_id: z.string().uuid().optional(),
  delivery_address: z.string().optional(),
  delivery_required: z.boolean().optional(),
  setup_required: z.boolean().optional(),
  items: z.array(
    z.object({
      equipment_id: z.string().uuid(),
      quantity: z.number().int().positive(),
    })
  ).min(1),
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
    const customer_id = searchParams.get('customer_id') || undefined;
    const status = searchParams.get('status') as
      | 'pending'
      | 'confirmed'
      | 'picked_up'
      | 'active'
      | 'returned'
      | 'cancelled'
      | undefined;
    const rental_start_date_from = searchParams.get('rental_start_date_from') || undefined;
    const rental_start_date_to = searchParams.get('rental_start_date_to') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined;

    const reservations = await reservationService.listReservations({
      customer_id,
      status,
      rental_start_date_from,
      rental_start_date_to,
      limit,
      offset,
    });

    return NextResponse.json({ success: true, data: reservations });
  } catch (error) {
    console.error('Error in GET /api/rentals/reservations:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch reservations',
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
    const validated = createReservationSchema.parse(body);

    const reservation = await reservationService.createReservation(validated, user.id);

    return NextResponse.json({ success: true, data: reservation }, { status: 201 });
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

    console.error('Error in POST /api/rentals/reservations:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create reservation',
      },
      { status: 500 }
    );
  }
}

