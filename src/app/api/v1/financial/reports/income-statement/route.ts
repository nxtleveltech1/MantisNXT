/**
 * Income Statement Report API
 * GET /api/v1/financial/reports/income-statement
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

    const incomeStatement = await ReportService.generateIncomeStatement(orgId, period, fiscalYear);

    return NextResponse.json({
      success: true,
      data: incomeStatement,
    });
  } catch (error) {
    console.error('Error generating income statement:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate income statement',
      },
      { status: 500 }
    );
  }
}

