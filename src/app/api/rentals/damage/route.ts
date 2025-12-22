import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/auth-helper';
import * as damageService from '@/services/rentals/damageService';
import { z } from 'zod';

const createDamageReportSchema = z.object({
  reservation_id: z.string().uuid(),
  equipment_id: z.string().uuid(),
  damage_type: z.enum(['physical_damage', 'missing_parts', 'malfunction', 'cosmetic']).optional(),
  damage_description: z.string().min(1),
  severity: z.enum(['minor', 'moderate', 'major', 'total_loss']).optional(),
  photos: z.array(z.string()).optional(),
});

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
    const validated = createDamageReportSchema.parse(body);

    const damageReport = await damageService.createDamageReport(
      validated.reservation_id,
      validated.equipment_id,
      user.id,
      validated
    );

    return NextResponse.json({ success: true, data: damageReport }, { status: 201 });
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

    console.error('Error in POST /api/rentals/damage:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create damage report',
      },
      { status: 500 }
    );
  }
}

