import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/auth-helper';
import * as checkoutService from '@/services/rentals/checkoutService';
import { z } from 'zod';

const checkinSchema = z.object({
  checkin_type: z.enum(['return', 'pickup']),
  scheduled_datetime: z.string().optional(),
  actual_datetime: z.string().optional(),
  checked_in_by: z.string().uuid().optional(),
  verified_by: z.string().uuid().optional(),
  equipment_condition_notes: z.string().optional(),
  photos_after: z.array(z.string()).optional(),
  damage_reported: z.boolean().optional(),
  missing_items: z.array(z.string()).optional(),
  cleaning_required: z.boolean().optional(),
  maintenance_required: z.boolean().optional(),
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
    const validated = checkinSchema.parse(body);

    const checkin = await checkoutService.createCheckin(id, validated.checkin_type, {
      ...validated,
      checked_in_by: validated.checked_in_by || user.id,
      verified_by: validated.verified_by || user.id,
    });

    return NextResponse.json({ success: true, data: checkin }, { status: 201 });
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

    console.error('Error in POST /api/rentals/reservations/[id]/checkin:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to checkin equipment',
      },
      { status: 500 }
    );
  }
}

