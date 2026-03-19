/**
 * GET /api/v1/financial/tax/reports/[type]/pdf
 * Generate and return tax report PDF (vat | income | paye | liability)
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getOrgId } from '../../../../_helpers';
import { TaxService } from '@/lib/services/financial';
import { renderHtmlToPdfBuffer } from '@/lib/services/pdf/html-to-pdf';
import { getPlatformBranding } from '@/lib/services/pdf/platform-branding';

type PlatformBranding = Awaited<ReturnType<typeof getPlatformBranding>>;

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID_TYPES = ['vat', 'income', 'paye', 'liability'] as const;

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
  }).format(amount);
}

function buildVATReportHTML(
  data: { period: string; input_tax: number; output_tax: number; net_tax_due: number; transactions_count: number },
  _branding: PlatformBranding
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>VAT Summary - ${data.period}</title>
  <style>
    body { font-family: system-ui, sans-serif; padding: 40px; color: #1a1a1a; }
    .header { text-align: center; margin-bottom: 32px; }
    .header h1 { font-size: 1.5rem; margin: 0; }
    .header p { color: #666; margin: 4px 0 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 24px; }
    th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #e5e5e5; }
    th { font-weight: 600; color: #666; }
    .amount { text-align: right; font-variant-numeric: tabular-nums; }
    .footer { margin-top: 32px; font-size: 0.75rem; color: #999; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Tax Report</h1>
    <p>VAT Summary — Period: ${data.period}</p>
  </div>
  <p style="margin: 0; color: #666;">Summary of VAT collected and paid</p>
  <table>
    <tr><th>Output Tax (VAT on sales)</th><td class="amount">${formatCurrency(data.output_tax)}</td></tr>
    <tr><th>Input Tax (VAT on purchases)</th><td class="amount">${formatCurrency(data.input_tax)}</td></tr>
    <tr><th>Net VAT Due</th><td class="amount">${formatCurrency(data.net_tax_due)}</td></tr>
    <tr><th>Transactions</th><td class="amount">${data.transactions_count}</td></tr>
  </table>
  <div class="footer">Generated ${new Date().toISOString().slice(0, 10)}</div>
</body>
</html>`;
}

function buildStubReportHTML(
  reportName: string,
  description: string,
  _branding: PlatformBranding
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${reportName}</title>
  <style>
    body { font-family: system-ui, sans-serif; padding: 40px; color: #1a1a1a; }
    .header { text-align: center; margin-bottom: 32px; }
    .header h1 { font-size: 1.5rem; margin: 0; }
    .header p { color: #666; margin: 4px 0 0; }
    .notice { background: #f5f5f5; padding: 16px; border-radius: 8px; margin-top: 24px; color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Tax Report</h1>
    <p>${reportName}</p>
  </div>
  <p>${description}</p>
  <div class="notice">This report type is not yet populated with data. Connect your accounting source or import tax data to generate a full report.</div>
  <div style="margin-top: 24px; font-size: 0.75rem; color: #999;">Generated ${new Date().toISOString().slice(0, 10)}</div>
</body>
</html>`;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ type: string }> }
) {
  try {
    const { type } = await context.params;
    if (!VALID_TYPES.includes(type as (typeof VALID_TYPES)[number])) {
      return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
    }

    const orgId = await getOrgId(request);
    const branding = await getPlatformBranding();

    const now = new Date();
    const period = now.toISOString().slice(0, 7);
    const fiscalYear = now.getFullYear();

    let html: string;

    if (type === 'vat') {
      const data = await TaxService.generateTaxReport(orgId, period, fiscalYear);
      html = buildVATReportHTML(data, branding);
    } else if (type === 'income') {
      html = buildStubReportHTML(
        'Income Tax Summary',
        'Annual income tax summary. Data will be populated when tax returns are filed.',
        branding
      );
    } else if (type === 'paye') {
      html = buildStubReportHTML(
        'PAYE Summary',
        'Employee payroll tax summary. Data will be populated when payroll records are available.',
        branding
      );
    } else {
      html = buildStubReportHTML(
        'Tax Liability Report',
        'Outstanding tax liabilities. Data will be populated when tax returns and payments are recorded.',
        branding
      );
    }

    const pdfBuffer = await renderHtmlToPdfBuffer({ html });
    const filename = `tax-report-${type}-${period}.pdf`;

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error) {
    console.error('Tax report PDF error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}
