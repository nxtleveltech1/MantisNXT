/**
 * Xero Report Parsers
 *
 * Parse raw Xero report data into structured, usable formats
 */

import type {
  XeroReport,
  XeroReportRow,
  ProfitLossReport,
  BalanceSheetReport,
  AgedReceivablesReport,
} from './reports';

/**
 * Parse a Profit & Loss report into structured format
 */
export function parseProfitLossReport(report: XeroReport): ProfitLossReport {
  if (!report.Rows || report.Rows.length === 0) {
    throw new Error('Invalid report: No rows found');
  }

  const reportDate = report.ReportDate || new Date().toISOString().split('T')[0];
  const sections: ProfitLossReport['sections'] = [];
  let revenue = 0;
  let costOfSales = 0;
  let operatingExpenses = 0;
  let grossProfit = 0;
  let netProfit = 0;

  // Find period information from report title
  let periodStart = reportDate;
  let periodEnd = reportDate;
  if (report.ReportTitle && report.ReportTitle.length > 0) {
    const titleMatch = report.ReportTitle[0].match(/(\d{4}-\d{2}-\d{2})\s+to\s+(\d{4}-\d{2}-\d{2})/i);
    if (titleMatch) {
      periodStart = titleMatch[1];
      periodEnd = titleMatch[2];
    }
  }

  // Parse rows recursively
  function parseRows(rows: XeroReportRow[], sectionTitle?: string): void {
    for (const row of rows) {
      if (row.RowType === 'Header') {
        // Start of a new section
        const title = row.Title || sectionTitle || 'Unknown';
        sections.push({
          title,
          total: 0,
          items: [],
        });
      } else if (row.RowType === 'Section' && row.Rows) {
        // Recursive section
        const title = row.Title || sectionTitle || 'Unknown';
        parseRows(row.Rows, title);
      } else if (row.RowType === 'SummaryRow' || row.RowType === 'Row') {
        // Data row
        if (row.Cells && row.Cells.length >= 2) {
          const accountName = row.Cells[0]?.Value || '';
          const amountStr = row.Cells[row.Cells.length - 1]?.Value || '0';
          const amount = parseFloat(amountStr.replace(/,/g, '')) || 0;

          // Determine section based on account name patterns
          const lowerName = accountName.toLowerCase();
          if (lowerName.includes('revenue') || lowerName.includes('sales') || lowerName.includes('income')) {
            revenue += Math.abs(amount);
          } else if (lowerName.includes('cost of sales') || lowerName.includes('cogs') || lowerName.includes('direct cost')) {
            costOfSales += Math.abs(amount);
          } else if (lowerName.includes('expense') || lowerName.includes('overhead')) {
            operatingExpenses += Math.abs(amount);
          }

          // Add to current section if exists
          if (sections.length > 0) {
            const currentSection = sections[sections.length - 1];
            currentSection.items.push({
              accountCode: row.Cells[1]?.Value || '',
              accountName,
              amount,
            });
            currentSection.total += Math.abs(amount);
          }
        }
      } else if (row.RowType === 'Total') {
        // Total row - update section total
        if (row.Cells && row.Cells.length > 0 && sections.length > 0) {
          const totalStr = row.Cells[row.Cells.length - 1]?.Value || '0';
          const total = parseFloat(totalStr.replace(/,/g, '')) || 0;
          sections[sections.length - 1].total = Math.abs(total);
        }
      }
    }
  }

  parseRows(report.Rows);

  // Calculate derived values
  grossProfit = revenue - costOfSales;
  netProfit = grossProfit - operatingExpenses;

  return {
    reportDate,
    periodStart,
    periodEnd,
    revenue,
    costOfSales,
    grossProfit,
    operatingExpenses,
    netProfit,
    sections,
  };
}

/**
 * Parse a Balance Sheet report into structured format
 */
export function parseBalanceSheetReport(report: XeroReport): BalanceSheetReport {
  if (!report.Rows || report.Rows.length === 0) {
    throw new Error('Invalid report: No rows found');
  }

  const reportDate = report.ReportDate || new Date().toISOString().split('T')[0];
  const sections: BalanceSheetReport['sections'] = [];
  let currentAssets = 0;
  let fixedAssets = 0;
  let currentLiabilities = 0;
  let nonCurrentLiabilities = 0;
  let equity = 0;

  let currentSection: 'assets' | 'liabilities' | 'equity' | null = null;

  function parseRows(rows: XeroReportRow[]): void {
    for (const row of rows) {
      if (row.RowType === 'Header') {
        const title = row.Title || '';
        const lowerTitle = title.toLowerCase();

        if (lowerTitle.includes('asset')) {
          currentSection = 'assets';
        } else if (lowerTitle.includes('liabilit')) {
          currentSection = 'liabilities';
        } else if (lowerTitle.includes('equity')) {
          currentSection = 'equity';
        }

        sections.push({
          title,
          total: 0,
          items: [],
        });
      } else if (row.RowType === 'Section' && row.Rows) {
        parseRows(row.Rows);
      } else if (row.RowType === 'SummaryRow' || row.RowType === 'Row') {
        if (row.Cells && row.Cells.length >= 2) {
          const accountName = row.Cells[0]?.Value || '';
          const amountStr = row.Cells[row.Cells.length - 1]?.Value || '0';
          const amount = parseFloat(amountStr.replace(/,/g, '')) || 0;

          const lowerName = accountName.toLowerCase();
          if (currentSection === 'assets') {
            if (lowerName.includes('current') || lowerName.includes('bank') || lowerName.includes('receivable')) {
              currentAssets += Math.abs(amount);
            } else if (lowerName.includes('fixed') || lowerName.includes('property') || lowerName.includes('plant')) {
              fixedAssets += Math.abs(amount);
            }
          } else if (currentSection === 'liabilities') {
            if (lowerName.includes('current') || lowerName.includes('payable')) {
              currentLiabilities += Math.abs(amount);
            } else {
              nonCurrentLiabilities += Math.abs(amount);
            }
          } else if (currentSection === 'equity') {
            equity += Math.abs(amount);
          }

          if (sections.length > 0) {
            const currentSectionData = sections[sections.length - 1];
            currentSectionData.items.push({
              accountCode: row.Cells[1]?.Value || '',
              accountName,
              amount,
            });
            currentSectionData.total += Math.abs(amount);
          }
        }
      } else if (row.RowType === 'Total') {
        if (row.Cells && row.Cells.length > 0 && sections.length > 0) {
          const totalStr = row.Cells[row.Cells.length - 1]?.Value || '0';
          const total = parseFloat(totalStr.replace(/,/g, '')) || 0;
          sections[sections.length - 1].total = Math.abs(total);
        }
      }
    }
  }

  parseRows(report.Rows);

  return {
    reportDate,
    assets: {
      current: currentAssets,
      fixed: fixedAssets,
      total: currentAssets + fixedAssets,
    },
    liabilities: {
      current: currentLiabilities,
      nonCurrent: nonCurrentLiabilities,
      total: currentLiabilities + nonCurrentLiabilities,
    },
    equity,
    sections,
  };
}

/**
 * Parse an Aged Receivables report into structured format
 */
export function parseAgedReceivablesReport(report: XeroReport): AgedReceivablesReport {
  if (!report.Rows || report.Rows.length === 0) {
    throw new Error('Invalid report: No rows found');
  }

  const reportDate = report.ReportDate || new Date().toISOString().split('T')[0];
  const contacts: AgedReceivablesReport['contacts'] = [];
  let totalOutstanding = 0;

  function parseRows(rows: XeroReportRow[]): void {
    for (const row of rows) {
      if (row.RowType === 'Row' && row.Cells && row.Cells.length >= 6) {
        // Contact row with aging buckets
        const contactName = row.Cells[0]?.Value || '';
        const contactId = row.Cells[0]?.Attributes?.[0]?.Id || '';
        const current = parseFloat(row.Cells[1]?.Value?.replace(/,/g, '') || '0') || 0;
        const thirtyDays = parseFloat(row.Cells[2]?.Value?.replace(/,/g, '') || '0') || 0;
        const sixtyDays = parseFloat(row.Cells[3]?.Value?.replace(/,/g, '') || '0') || 0;
        const ninetyDays = parseFloat(row.Cells[4]?.Value?.replace(/,/g, '') || '0') || 0;
        const older = parseFloat(row.Cells[5]?.Value?.replace(/,/g, '') || '0') || 0;
        const total = current + thirtyDays + sixtyDays + ninetyDays + older;

        if (contactName && total > 0) {
          contacts.push({
            contactId,
            contactName,
            current: Math.abs(current),
            thirtyDays: Math.abs(thirtyDays),
            sixtyDays: Math.abs(sixtyDays),
            ninetyDays: Math.abs(ninetyDays),
            older: Math.abs(older),
            total: Math.abs(total),
          });
          totalOutstanding += Math.abs(total);
        }
      } else if (row.RowType === 'Section' && row.Rows) {
        parseRows(row.Rows);
      }
    }
  }

  parseRows(report.Rows);

  return {
    reportDate,
    totalOutstanding,
    contacts,
  };
}
