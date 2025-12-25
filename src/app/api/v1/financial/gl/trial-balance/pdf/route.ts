// UPDATE: [2025-12-25] Created trial balance PDF route with DocuStore integration

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getOrgId } from '../../../_helpers';
import { FinancialPDFService } from '@/lib/services/financial/financial-pdf-service';
import { query } from '@/lib/database/unified-connection';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface AccountBalanceRow {
  account_code: string;
  account_name: string;
  debit_balance: number;
  credit_balance: number;
}

export async function GET(request: NextRequest) {
  try {
    const orgId = await getOrgId(request);
    const userId = request.headers.get('x-user-id') || undefined;
    
    const period = request.nextUrl.searchParams.get('period') || new Date().toISOString().slice(0, 7);
    const asOfDate = request.nextUrl.searchParams.get('asOf') || new Date().toISOString().slice(0, 10);

    // Fetch account balances
    const balancesResult = await query<AccountBalanceRow>(
      `SELECT 
        a.account_code,
        a.account_name,
        COALESCE(SUM(CASE WHEN ab.balance_type = 'debit' THEN ab.balance ELSE 0 END), 0) as debit_balance,
        COALESCE(SUM(CASE WHEN ab.balance_type = 'credit' THEN ab.balance ELSE 0 END), 0) as credit_balance
      FROM financial.accounts a
      LEFT JOIN financial.account_balances ab ON ab.account_id = a.id AND ab.period_date <= $2
      WHERE a.org_id = $1 AND a.is_active = true
      GROUP BY a.id, a.account_code, a.account_name
      HAVING COALESCE(SUM(CASE WHEN ab.balance_type = 'debit' THEN ab.balance ELSE 0 END), 0) != 0
         OR COALESCE(SUM(CASE WHEN ab.balance_type = 'credit' THEN ab.balance ELSE 0 END), 0) != 0
      ORDER BY a.account_code`,
      [orgId, asOfDate]
    );

    const accounts = balancesResult.rows;
    const totalDebit = accounts.reduce((sum, acc) => sum + (acc.debit_balance || 0), 0);
    const totalCredit = accounts.reduce((sum, acc) => sum + (acc.credit_balance || 0), 0);

    const htmlContent = FinancialPDFService.generateTrialBalanceHTML({
      period,
      asOfDate,
      accounts: accounts.map(acc => ({
        code: acc.account_code,
        name: acc.account_name,
        debit: acc.debit_balance || 0,
        credit: acc.credit_balance || 0,
      })),
      totalDebit,
      totalCredit,
    });

    const documentNumber = `TB-${period}`;
    const result = await FinancialPDFService.generate({
      orgId,
      documentType: 'trial_balance',
      documentNumber,
      title: `Trial Balance - ${period}`,
      description: `Trial balance report as of ${asOfDate}`,
      htmlContent,
      metadata: {
        period,
        as_of_date: asOfDate,
        total_debit: totalDebit,
        total_credit: totalCredit,
        account_count: accounts.length,
        is_balanced: Math.abs(totalDebit - totalCredit) < 0.01,
      },
      entityLinks: [
        { entityType: 'trial_balance', entityId: `${orgId}-${period}`, linkType: 'primary' },
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
    console.error('Error generating trial balance PDF:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}

