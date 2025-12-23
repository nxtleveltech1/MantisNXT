/**
 * Tax Configuration API
 * GET /api/v1/financial/tax/config
 * POST /api/v1/financial/tax/config
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
    console.error('Error fetching tax config:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch tax config',
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
    console.error('Error creating tax config:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create tax config',
      },
      { status: 500 }
    );
  }
}

