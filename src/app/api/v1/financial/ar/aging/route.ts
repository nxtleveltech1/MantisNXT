/**
 * AR Aging Report API
 * GET /api/v1/financial/ar/aging
 */

import { NextRequest, NextResponse } from 'next/server';
import { ARService } from '@/lib/services/financial';
import { getOrgId } from '../_helpers';

export async function GET(request: NextRequest) {
  try {
    const orgId = await getOrgId(request);
    const searchParams = request.nextUrl.searchParams;
    const asOfDate = searchParams.get('as_of_date') || undefined;

    const report = await ARService.getAgingReport(orgId, asOfDate);

    return NextResponse.json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error('Error generating aging report:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate aging report',
      },
      { status: 500 }
    );
  }
}

