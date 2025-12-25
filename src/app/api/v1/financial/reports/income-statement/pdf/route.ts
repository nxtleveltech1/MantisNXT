// UPDATE: [2025-12-25] Created income statement PDF route with DocuStore integration

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getOrgId } from '../../../_helpers';
import { FinancialPDFService } from '@/lib/services/financial/financial-pdf-service';
import { query } from '@/lib/database/unified-connection';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface AccountRow {
  account_type: string;
  account_name: string;
  balance: number;
}

export async function GET(request: NextRequest) {
  try {
    const orgId = await getOrgId(request);
    const userId = request.headers.get('x-user-id') || undefined;
    
    const periodStart = request.nextUrl.searchParams.get('start') || 
      new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10);
    const periodEnd = request.nextUrl.searchParams.get('end') || 
      new Date().toISOString().slice(0, 10);

    // Fetch income and expense accounts
    const balancesResult = await query<AccountRow>(
      `SELECT 
        a.account_type,
        a.account_name,
        COALESCE(SUM(ab.balance), 0) as balance
      FROM financial.accounts a
      LEFT JOIN financial.account_balances ab ON ab.account_id = a.id
        AND ab.period_date BETWEEN $2 AND $3
      WHERE a.org_id = $1 AND a.is_active = true
        AND a.account_type IN ('revenue', 'expense')
      GROUP BY a.id, a.account_type, a.account_name
      HAVING COALESCE(SUM(ab.balance), 0) != 0
      ORDER BY a.account_type DESC, a.account_code`,
      [orgId, periodStart, periodEnd]
    );

    const accounts = balancesResult.rows;
    const revenueAccounts = accounts.filter(a => a.account_type === 'revenue');
    const expenseAccounts = accounts.filter(a => a.account_type === 'expense');

    const totalRevenue = revenueAccounts.reduce((sum, a) => sum + Math.abs(a.balance || 0), 0);
    const totalExpenses = expenseAccounts.reduce((sum, a) => sum + Math.abs(a.balance || 0), 0);
    const netIncome = totalRevenue - totalExpenses;

    const htmlContent = FinancialPDFService.generateIncomeStatementHTML({
      periodStart,
      periodEnd,
      revenue: revenueAccounts.map(a => ({ name: a.account_name, amount: Math.abs(a.balance) })),
      expenses: expenseAccounts.map(a => ({ name: a.account_name, amount: Math.abs(a.balance) })),
      totalRevenue,
      totalExpenses,
      netIncome,
    });

    const documentNumber = `IS-${periodStart}-${periodEnd}`;
    const result = await FinancialPDFService.generate({
      orgId,
      documentType: 'income_statement',
      documentNumber,
      title: `Income Statement ${periodStart} to ${periodEnd}`,
      description: `Profit and loss statement for the period`,
      htmlContent,
      metadata: {
        period_start: periodStart,
        period_end: periodEnd,
        total_revenue: totalRevenue,
        total_expenses: totalExpenses,
        net_income: netIncome,
      },
      entityLinks: [
        { entityType: 'income_statement', entityId: `${orgId}-${periodStart}-${periodEnd}`, linkType: 'primary' },
      ],
      userId,
    });

    return new NextResponse(result.pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${documentNumber}.pdf"`,
        'Cache-Control': 'no-store, max-age=0',
        'X-DocuStore-Document-Id': result.documentId,
        'X-DocuStore-Artifact-Id': result.artifactId,
      },
    });
  } catch (error) {
    console.error('Error generating income statement PDF:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}

