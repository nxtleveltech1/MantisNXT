// UPDATE: [2025-12-25] Created AR aging report PDF route with DocuStore integration

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getOrgId } from '../../../_helpers';
import { FinancialPDFService } from '@/lib/services/financial/financial-pdf-service';
import { query } from '@/lib/database/unified-connection';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface AgingRow {
  customer_name: string;
  current_amount: number;
  days_30: number;
  days_60: number;
  days_90: number;
  over_90: number;
  total: number;
}

export async function GET(request: NextRequest) {
  try {
    const orgId = await getOrgId(request);
    const userId = request.headers.get('x-user-id') || undefined;
    const asOfDate = request.nextUrl.searchParams.get('asOf') || new Date().toISOString().slice(0, 10);

    // Fetch AR aging data
    const agingResult = await query<AgingRow>(
      `SELECT 
        c.name as customer_name,
        COALESCE(SUM(CASE WHEN CURRENT_DATE - i.due_date <= 0 THEN i.amount_due ELSE 0 END), 0) as current_amount,
        COALESCE(SUM(CASE WHEN CURRENT_DATE - i.due_date BETWEEN 1 AND 30 THEN i.amount_due ELSE 0 END), 0) as days_30,
        COALESCE(SUM(CASE WHEN CURRENT_DATE - i.due_date BETWEEN 31 AND 60 THEN i.amount_due ELSE 0 END), 0) as days_60,
        COALESCE(SUM(CASE WHEN CURRENT_DATE - i.due_date BETWEEN 61 AND 90 THEN i.amount_due ELSE 0 END), 0) as days_90,
        COALESCE(SUM(CASE WHEN CURRENT_DATE - i.due_date > 90 THEN i.amount_due ELSE 0 END), 0) as over_90,
        COALESCE(SUM(i.amount_due), 0) as total
      FROM financial.ar_invoices i
      JOIN customer c ON c.id = i.customer_id
      WHERE i.org_id = $1 AND i.status NOT IN ('paid', 'cancelled', 'voided')
      GROUP BY c.id, c.name
      HAVING COALESCE(SUM(i.amount_due), 0) > 0
      ORDER BY total DESC`,
      [orgId]
    );

    const entries = agingResult.rows;
    const totals = {
      current: entries.reduce((sum, e) => sum + (e.current_amount || 0), 0),
      days30: entries.reduce((sum, e) => sum + (e.days_30 || 0), 0),
      days60: entries.reduce((sum, e) => sum + (e.days_60 || 0), 0),
      days90: entries.reduce((sum, e) => sum + (e.days_90 || 0), 0),
      over90: entries.reduce((sum, e) => sum + (e.over_90 || 0), 0),
      total: entries.reduce((sum, e) => sum + (e.total || 0), 0),
    };

    const htmlContent = FinancialPDFService.generateAgingReportHTML({
      type: 'ar',
      asOfDate,
      entries: entries.map(e => ({
        name: e.customer_name,
        current: e.current_amount || 0,
        days30: e.days_30 || 0,
        days60: e.days_60 || 0,
        days90: e.days_90 || 0,
        over90: e.over_90 || 0,
        total: e.total || 0,
      })),
      totals,
    });

    const documentNumber = `AR-AGING-${asOfDate}`;
    const result = await FinancialPDFService.generate({
      orgId,
      documentType: 'ar_aging',
      documentNumber,
      title: `AR Aging Report - ${asOfDate}`,
      description: `Accounts receivable aging report as of ${asOfDate}`,
      htmlContent,
      metadata: {
        as_of_date: asOfDate,
        customer_count: entries.length,
        total_outstanding: totals.total,
        total_overdue: totals.days30 + totals.days60 + totals.days90 + totals.over90,
      },
      entityLinks: [
        { entityType: 'ar_aging', entityId: `${orgId}-${asOfDate}`, linkType: 'primary' },
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
    console.error('Error generating AR aging PDF:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}

