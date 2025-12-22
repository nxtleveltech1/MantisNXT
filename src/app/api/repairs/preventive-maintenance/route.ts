import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/auth-helper';
import * as pmService from '@/services/repairs/preventiveMaintenanceService';
import { z } from 'zod';

const createPMSchema = z.object({
  equipment_id: z.string().uuid(),
  pm_type: z.enum(['scheduled', 'inspection', 'calibration', 'cleaning']).optional(),
  frequency_days: z.number().int().positive(),
  next_due_date: z.string(),
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
    const due_days_ahead = searchParams.get('due_days_ahead')
      ? parseInt(searchParams.get('due_days_ahead')!)
      : undefined;

    let pmSchedules;
    if (equipment_id) {
      pmSchedules = await pmService.getPMByEquipment(equipment_id);
    } else if (due_days_ahead) {
      pmSchedules = await pmService.getDuePMs(due_days_ahead);
    } else {
      pmSchedules = await pmService.getDuePMs(30);
    }

    return NextResponse.json({ success: true, data: pmSchedules });
  } catch (error) {
    console.error('Error in GET /api/repairs/preventive-maintenance:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch PM schedules',
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
    const validated = createPMSchema.parse(body);

    const pm = await pmService.createPM(validated);

    return NextResponse.json({ success: true, data: pm }, { status: 201 });
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

    console.error('Error in POST /api/repairs/preventive-maintenance:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create PM schedule',
      },
      { status: 500 }
    );
  }
}

