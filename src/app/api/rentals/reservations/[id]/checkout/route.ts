import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/auth-helper';
import * as checkoutService from '@/services/rentals/checkoutService';
import { z } from 'zod';

const checkoutSchema = z.object({
  checkout_type: z.enum(['pickup', 'delivery']),
  scheduled_datetime: z.string().optional(),
  actual_datetime: z.string().optional(),
  checked_out_by: z.string().uuid().optional(),
  verified_by: z.string().uuid().optional(),
  equipment_condition_notes: z.string().optional(),
  photos_before: z.array(z.string()).optional(),
  delivery_driver: z.string().optional(),
  delivery_vehicle: z.string().optional(),
  delivery_tracking_number: z.string().optional(),
});

export async function POST(
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
    const validated = checkoutSchema.parse(body);

    const checkout = await checkoutService.createCheckout(id, validated.checkout_type, {
      ...validated,
      checked_out_by: validated.checked_out_by || user.id,
      verified_by: validated.verified_by || user.id,
    });

    return NextResponse.json({ success: true, data: checkout }, { status: 201 });
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

    console.error('Error in POST /api/rentals/reservations/[id]/checkout:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to checkout equipment',
      },
      { status: 500 }
    );
  }
}

