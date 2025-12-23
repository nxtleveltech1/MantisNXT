/**
 * Cost Centers API
 * GET /api/v1/financial/cost/centers
 * POST /api/v1/financial/cost/centers
 */

import { NextRequest, NextResponse } from 'next/server';
import { getOrgId } from '../../_helpers';

export async function GET(request: NextRequest) {
  try {
    const orgId = await getOrgId(request);

    return NextResponse.json({
      success: true,
      data: [],
      count: 0,
    });
  } catch (error) {
    console.error('Error fetching cost centers:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch cost centers',
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
    console.error('Error creating cost center:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create cost center',
      },
      { status: 500 }
    );
  }
}

