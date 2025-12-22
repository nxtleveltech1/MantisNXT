import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/auth-helper';
import * as damageService from '@/services/rentals/damageService';
import { query } from '@/lib/database/unified-connection';
import type { DamageReport } from '@/types/rentals';
import { z } from 'zod';

const createDamageReportSchema = z.object({
  reservation_id: z.string().uuid(),
  equipment_id: z.string().uuid(),
  damage_type: z.enum(['physical_damage', 'missing_parts', 'malfunction', 'cosmetic']).optional(),
  damage_description: z.string().min(1),
  severity: z.enum(['minor', 'moderate', 'major', 'total_loss']).optional(),
  photos: z.array(z.string()).optional(),
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
    const reservation_id = searchParams.get('reservation_id') || undefined;
    const status = searchParams.get('status') as
      | 'reported'
      | 'assessed'
      | 'invoiced'
      | 'paid'
      | 'closed'
      | undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined;

    let damageReports: DamageReport[];

    if (reservation_id) {
      damageReports = await damageService.getDamageReportsByReservation(reservation_id);
    } else {
      // List all damage reports with filters
      const conditions: string[] = [];
      const params: unknown[] = [];
      let paramIndex = 1;

      if (status) {
        conditions.push(`status = $${paramIndex++}`);
        params.push(status);
      }

      let sql = 'SELECT * FROM rentals.damage_reports';
      if (conditions.length > 0) {
        sql += ` WHERE ${conditions.join(' AND ')}`;
      }
      sql += ' ORDER BY reported_at DESC';

      if (limit) {
        sql += ` LIMIT $${paramIndex++}`;
        params.push(limit);
      }
      if (offset) {
        sql += ` OFFSET $${paramIndex++}`;
        params.push(offset);
      }

      const result = await query<DamageReport>(sql, params);
      damageReports = result.rows;
    }

    return NextResponse.json({ success: true, data: damageReports });
  } catch (error) {
    console.error('Error in GET /api/rentals/damage:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch damage reports',
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

