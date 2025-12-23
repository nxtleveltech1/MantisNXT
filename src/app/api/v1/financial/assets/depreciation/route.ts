/**
 * Fixed Assets Depreciation API
 * GET /api/v1/financial/assets/depreciation
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
    console.error('Error fetching depreciation:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch depreciation',
      },
      { status: 500 }
    );
  }
}

