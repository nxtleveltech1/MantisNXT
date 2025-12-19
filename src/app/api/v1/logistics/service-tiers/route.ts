import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { query } from '@/lib/database/unified-connection';
import { getOrgId } from '@/app/api/v1/sales/_helpers';
import type { DeliveryServiceTier } from '@/types/logistics';

export async function GET(request: NextRequest) {
  try {
    const orgId = await getOrgId(request);
    const searchParams = request.nextUrl.searchParams;
    const is_active = searchParams.get('is_active');

    let whereClause = 'WHERE org_id = $1';
    const params: unknown[] = [orgId];

    if (is_active === 'true') {
      whereClause += ' AND is_active = true';
    }

    const result = await query<DeliveryServiceTier>(
      `SELECT * FROM delivery_service_tiers ${whereClause} ORDER BY tier`,
      params
    );

    return NextResponse.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Error fetching service tiers:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch service tiers',
      },
      { status: 500 }
    );
  }
}

