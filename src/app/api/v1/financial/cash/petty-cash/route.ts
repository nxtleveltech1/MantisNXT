/**
 * Cash Management - Petty Cash API
 * GET /api/v1/financial/cash/petty-cash
 * POST /api/v1/financial/cash/petty-cash
 */

import { NextRequest, NextResponse } from 'next/server';
import { getOrgId } from '../../_helpers';

export async function GET(request: NextRequest) {
  try {
    const orgId = await getOrgId(request);

    return NextResponse.json({
      success: true,
      data: {
        balance: 0,
        transactions: [],
      },
    });
  } catch (error) {
    console.error('Error fetching petty cash:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch petty cash',
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
    console.error('Error creating petty cash transaction:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create transaction',
      },
      { status: 500 }
    );
  }
}

