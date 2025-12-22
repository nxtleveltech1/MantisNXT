/**
 * Trial Balance API
 * GET /api/v1/financial/gl/trial-balance
 */

import { NextRequest, NextResponse } from 'next/server';
import { GLService } from '@/lib/services/financial';
import { getOrgId } from '../_helpers';

export async function GET(request: NextRequest) {
  try {
    const orgId = await getOrgId(request);
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period') || undefined;
    const fiscalYear = searchParams.get('fiscal_year') ? parseInt(searchParams.get('fiscal_year')!, 10) : undefined;

    const trialBalance = await GLService.getTrialBalance(orgId, period, fiscalYear);

    return NextResponse.json({
      success: true,
      data: trialBalance,
    });
  } catch (error) {
    console.error('Error generating trial balance:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate trial balance',
      },
      { status: 500 }
    );
  }
}

