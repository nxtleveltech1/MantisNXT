// UPDATE: [2025-12-25] Created balance sheet PDF route with DocuStore integration

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getOrgId } from '../../../_helpers';
import { FinancialPDFService } from '@/lib/services/financial/financial-pdf-service';
import { query } from '@/lib/database/unified-connection';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface AccountRow {
  account_type: string;
  account_subtype: string;
  account_name: string;
  balance: number;
}

export async function GET(request: NextRequest) {
  try {
    const orgId = await getOrgId(request);
    const userId = request.headers.get('x-user-id') || undefined;
    const asOfDate = request.nextUrl.searchParams.get('asOf') || new Date().toISOString().slice(0, 10);

    // Fetch account balances by type
    const balancesResult = await query<AccountRow>(
      `SELECT 
        a.account_type,
        a.account_subtype,
        a.account_name,
        COALESCE(ab.balance, 0) as balance
      FROM financial.accounts a
      LEFT JOIN financial.account_balances ab ON ab.account_id = a.id
      WHERE a.org_id = $1 AND a.is_active = true
        AND a.account_type IN ('asset', 'liability', 'equity')
      ORDER BY a.account_type, a.account_subtype, a.account_code`,
      [orgId]
    );

    const accounts = balancesResult.rows;
    
    // Group accounts
    const currentAssets = accounts.filter(a => a.account_type === 'asset' && a.account_subtype === 'current');
    const fixedAssets = accounts.filter(a => a.account_type === 'asset' && a.account_subtype !== 'current');
    const currentLiabilities = accounts.filter(a => a.account_type === 'liability' && a.account_subtype === 'current');
    const longTermLiabilities = accounts.filter(a => a.account_type === 'liability' && a.account_subtype !== 'current');
    const equityAccounts = accounts.filter(a => a.account_type === 'equity');

    const sumBalance = (accs: AccountRow[]) => accs.reduce((sum, a) => sum + (a.balance || 0), 0);

    const totalCurrentAssets = sumBalance(currentAssets);
    const totalFixedAssets = sumBalance(fixedAssets);
    const totalAssets = totalCurrentAssets + totalFixedAssets;
    const totalCurrentLiabilities = sumBalance(currentLiabilities);
    const totalLongTermLiabilities = sumBalance(longTermLiabilities);
    const totalLiabilities = totalCurrentLiabilities + totalLongTermLiabilities;
    const totalEquity = sumBalance(equityAccounts);

    const htmlContent = FinancialPDFService.generateBalanceSheetHTML({
      asOfDate,
      assets: {
        current: currentAssets.map(a => ({ name: a.account_name, amount: a.balance })),
        fixed: fixedAssets.map(a => ({ name: a.account_name, amount: a.balance })),
        totalCurrent: totalCurrentAssets,
        totalFixed: totalFixedAssets,
        total: totalAssets,
      },
      liabilities: {
        current: currentLiabilities.map(a => ({ name: a.account_name, amount: a.balance })),
        longTerm: longTermLiabilities.map(a => ({ name: a.account_name, amount: a.balance })),
        totalCurrent: totalCurrentLiabilities,
        totalLongTerm: totalLongTermLiabilities,
        total: totalLiabilities,
      },
      equity: {
        items: equityAccounts.map(a => ({ name: a.account_name, amount: a.balance })),
        total: totalEquity,
      },
    });

    const documentNumber = `BS-${asOfDate}`;
    const result = await FinancialPDFService.generate({
      orgId,
      documentType: 'balance_sheet',
      documentNumber,
      title: `Balance Sheet - ${asOfDate}`,
      description: `Balance sheet report as of ${asOfDate}`,
      htmlContent,
      metadata: {
        as_of_date: asOfDate,
        total_assets: totalAssets,
        total_liabilities: totalLiabilities,
        total_equity: totalEquity,
        is_balanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01,
      },
      entityLinks: [
        { entityType: 'balance_sheet', entityId: `${orgId}-${asOfDate}`, linkType: 'primary' },
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
    console.error('Error generating balance sheet PDF:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}

