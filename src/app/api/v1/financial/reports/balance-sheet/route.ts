/**
 * Balance Sheet Report API
 * GET /api/v1/financial/reports/balance-sheet
 */

import { NextRequest, NextResponse } from 'next/server';
import { ReportService } from '@/lib/services/financial';
import { getOrgId } from '../../_helpers';

export async function GET(request: NextRequest) {
  try {
    const orgId = await getOrgId(request);
    const searchParams = request.nextUrl.searchParams;
    const asOfDate = searchParams.get('as_of_date') || undefined;
    const period = searchParams.get('period') || undefined;
    const fiscalYear = searchParams.get('fiscal_year') ? parseInt(searchParams.get('fiscal_year')!, 10) : undefined;

    const balanceSheet = await ReportService.generateBalanceSheet(orgId, asOfDate, period, fiscalYear);

    return NextResponse.json({
      success: true,
      data: balanceSheet,
    });
  } catch (error) {
    console.error('Error generating balance sheet:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate balance sheet',
      },
      { status: 500 }
    );
  }
}

