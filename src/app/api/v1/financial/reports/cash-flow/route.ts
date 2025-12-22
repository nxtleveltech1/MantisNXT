/**
 * Cash Flow Statement Report API
 * GET /api/v1/financial/reports/cash-flow
 */

import { NextRequest, NextResponse } from 'next/server';
import { ReportService } from '@/lib/services/financial';
import { getOrgId } from '../../_helpers';

export async function GET(request: NextRequest) {
  try {
    const orgId = await getOrgId(request);
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period') || undefined;
    const fiscalYear = searchParams.get('fiscal_year') ? parseInt(searchParams.get('fiscal_year')!, 10) : undefined;

    const cashFlow = await ReportService.generateCashFlow(orgId, period, fiscalYear);

    return NextResponse.json({
      success: true,
      data: cashFlow,
    });
  } catch (error) {
    console.error('Error generating cash flow statement:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate cash flow statement',
      },
      { status: 500 }
    );
  }
}

