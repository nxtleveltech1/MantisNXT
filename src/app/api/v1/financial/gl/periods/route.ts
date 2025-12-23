/**
 * GL Fiscal Periods API
 * GET /api/v1/financial/gl/periods - List periods
 * POST /api/v1/financial/gl/periods - Create period
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getOrgId } from '../../_helpers';

export async function GET(request: NextRequest) {
  try {
    const _orgId = await getOrgId(request);

    return NextResponse.json({
      success: true,
      data: [],
      count: 0,
    });
  } catch (error) {
    console.error('Error fetching periods:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch periods',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const orgId = await getOrgId(request);
    const body = await request.json();

    return NextResponse.json(
      {
        success: true,
        data: { ...body, org_id: orgId },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating period:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create period',
      },
      { status: 500 }
    );
  }
}

