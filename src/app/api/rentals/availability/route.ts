import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/auth-helper';
import * as availabilityService from '@/services/rentals/availabilityService';

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
    const equipment_id = searchParams.get('equipment_id');
    const start_date = searchParams.get('start_date');
    const end_date = searchParams.get('end_date');
    const equipment_type = searchParams.get('equipment_type') || undefined;

    if (equipment_id && start_date && end_date) {
      // Check single equipment availability
      const result = await availabilityService.checkAvailability({
        equipment_id,
        start_date,
        end_date,
      });
      return NextResponse.json({ success: true, data: result });
    } else if (start_date && end_date) {
      // Get all available equipment for date range
      const equipment = await availabilityService.getAvailableEquipment(
        start_date,
        end_date,
        equipment_type
      );
      return NextResponse.json({ success: true, data: equipment });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'BAD_REQUEST',
          message: 'Missing required parameters: start_date and end_date',
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error in GET /api/rentals/availability:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check availability',
      },
      { status: 500 }
    );
  }
}

