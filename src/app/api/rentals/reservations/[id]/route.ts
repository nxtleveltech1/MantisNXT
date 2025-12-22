import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/auth-helper';
import * as reservationService from '@/services/rentals/reservationService';
import { z } from 'zod';

const updateReservationSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'picked_up', 'active', 'returned', 'cancelled']).optional(),
  pickup_date: z.string().optional(),
  return_date: z.string().optional(),
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
    const reservation = await reservationService.getReservationById(id);

    if (!reservation) {
      return NextResponse.json(
        { success: false, error: 'NOT_FOUND', message: 'Reservation not found' },
        { status: 404 }
      );
    }

    const items = await reservationService.getReservationItems(id);

    return NextResponse.json({
      success: true,
      data: { ...reservation, items },
    });
  } catch (error) {
    console.error('Error in GET /api/rentals/reservations/[id]:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch reservation',
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
    const validated = updateReservationSchema.parse(body);

    const reservation = await reservationService.updateReservation(id, validated);

    return NextResponse.json({ success: true, data: reservation });
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

    console.error('Error in PUT /api/rentals/reservations/[id]:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update reservation',
      },
      { status: 500 }
    );
  }
}

