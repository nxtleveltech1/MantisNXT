/**
 * GL Accounts API
 * GET /api/v1/financial/gl/accounts - List accounts
 * POST /api/v1/financial/gl/accounts - Create account
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getOrgId } from '../../_helpers';

export async function GET(request: NextRequest) {
  try {
    const _orgId = await getOrgId(request);

    // Return empty data for now - implement with actual database query
    return NextResponse.json({
      success: true,
      data: [],
      count: 0,
    });
  } catch (error) {
    console.error('Error fetching accounts:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch accounts',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const orgId = await getOrgId(request);
    const body = await request.json();

    // Placeholder - implement with actual database insert
    return NextResponse.json(
      {
        success: true,
        data: { ...body, org_id: orgId },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating account:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create account',
      },
      { status: 500 }
    );
  }
}

