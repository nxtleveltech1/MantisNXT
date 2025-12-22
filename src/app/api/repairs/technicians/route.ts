import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/auth-helper';
import * as technicianService from '@/services/repairs/technicianService';
import { z } from 'zod';

const createTechnicianSchema = z.object({
  user_id: z.string().uuid().optional(),
  employee_number: z.string().max(50).optional(),
  specializations: z.array(z.string()).optional(),
  certifications: z.array(
    z.object({
      name: z.string(),
      issuer: z.string(),
      expiry_date: z.string().optional(),
    })
  ).optional(),
  hourly_rate: z.number().nonnegative().optional(),
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
    const activeOnly = searchParams.get('active_only') !== 'false';
    const specialization = searchParams.get('specialization') || undefined;

    let technicians;
    if (specialization) {
      technicians = await technicianService.getTechniciansBySpecialization(specialization);
    } else {
      technicians = await technicianService.listTechnicians(activeOnly);
    }

    return NextResponse.json({ success: true, data: technicians });
  } catch (error) {
    console.error('Error in GET /api/repairs/technicians:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch technicians',
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
    const validated = createTechnicianSchema.parse(body);

    const technician = await technicianService.createTechnician(validated);

    return NextResponse.json({ success: true, data: technician }, { status: 201 });
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

    console.error('Error in POST /api/repairs/technicians:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create technician',
      },
      { status: 500 }
    );
  }
}

