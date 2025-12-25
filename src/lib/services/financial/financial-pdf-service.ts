// UPDATE: [2025-12-25] Created Financial PDF service with DocuStore integration

/**
 * Financial PDF Service
 * 
 * Handles PDF generation for financial documents:
 * - Journal Entries
 * - Trial Balance
 * - AR/AP Aging Reports
 * - Balance Sheet
 * - Income Statement
 * - Cash Flow Statement
 */

import { DocumentGenerator, DOCUMENT_TYPES, formatDate, formatCurrency } from '@/lib/services/docustore';
import { renderHtmlToPdfBuffer } from '@/lib/services/pdf/html-to-pdf';
import { generateBaseDocument } from '@/lib/services/docustore/templates';

// ============================================================================
// Types
// ============================================================================

export interface JournalEntryData {
  entryId: string;
  entryNumber: string;
  orgId: string;
  entryDate: string;
  description?: string;
  reference?: string;
  currency: string;
  lines: Array<{
    accountCode: string;
    accountName: string;
    description?: string;
    debit?: number;
    credit?: number;
  }>;
  totalDebit: number;
  totalCredit: number;
  createdBy?: string;
  approvedBy?: string;
}

export interface TrialBalanceData {
  orgId: string;
  asOfDate: string;
  currency: string;
  accounts: Array<{
    code: string;
    name: string;
    type: string;
    debit?: number;
    credit?: number;
  }>;
  totalDebit: number;
  totalCredit: number;
}

export interface AgingReportData {
  reportId: string;
  orgId: string;
  asOfDate: string;
  reportType: 'ar' | 'ap';
  currency: string;
  entries: Array<{
    name: string;
    accountNumber?: string;
    current: number;
    days30: number;
    days60: number;
    days90: number;
    over90: number;
    total: number;
  }>;
  totals: {
    current: number;
    days30: number;
    days60: number;
    days90: number;
    over90: number;
    total: number;
  };
}

export interface BalanceSheetData {
  orgId: string;
  asOfDate: string;
  currency: string;
  assets: {
    current: Array<{ name: string; amount: number }>;
    fixed: Array<{ name: string; amount: number }>;
    totalCurrent: number;
    totalFixed: number;
    total: number;
  };
  liabilities: {
    current: Array<{ name: string; amount: number }>;
    longTerm: Array<{ name: string; amount: number }>;
    totalCurrent: number;
    totalLongTerm: number;
    total: number;
  };
  equity: Array<{ name: string; amount: number }>;
  totalEquity: number;
  totalLiabilitiesAndEquity: number;
}

export interface IncomeStatementData {
  periodStart: string;
  periodEnd: string;
  revenue: Array<{ name: string; amount: number }>;
  expenses: Array<{ name: string; amount: number }>;
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
}

// ============================================================================
// Financial PDF Service
// ============================================================================

export class FinancialPDFService {
  /**
   * Generate Journal Entry PDF
   */
  static async generateJournalEntry(
    data: JournalEntryData,
    userId?: string
  ): Promise<{ documentId: string; artifactId: string; pdfBuffer: Buffer }> {
    const htmlContent = this.generateJournalEntryHTML(data);
    
    const fullHtml = await generateBaseDocument({
      title: 'Journal Entry',
      documentNumber: data.entryNumber,
      companyName: 'NXT Level Tech',
    }, htmlContent);
    
    const pdfBuffer = await renderHtmlToPdfBuffer({ html: fullHtml });
    
    const result = await DocumentGenerator.generate({
      orgId: data.orgId,
      documentType: DOCUMENT_TYPES.JOURNAL_ENTRY,
      title: `Journal Entry ${data.entryNumber}`,
      description: data.description || `GL Journal Entry`,
      documentNumber: data.entryNumber,
      htmlContent,
      tags: ['financial', 'gl', 'journal-entry'],
      metadata: {
        entry_id: data.entryId,
        entry_number: data.entryNumber,
        entry_date: data.entryDate,
        total_debit: data.totalDebit,
        total_credit: data.totalCredit,
      },
      entityLinks: [
        { entityType: 'journal_entry', entityId: data.entryId, linkType: 'primary' },
      ],
      generatedBy: userId,
      companyInfo: {
        name: 'NXT Level Tech',
      },
    });
    
    return {
      documentId: result.documentId,
      artifactId: result.artifactId,
      pdfBuffer,
    };
  }
  
  /**
   * Generate Trial Balance PDF
   */
  static async generateTrialBalance(
    data: TrialBalanceData,
    userId?: string
  ): Promise<{ documentId: string; artifactId: string; pdfBuffer: Buffer }> {
    const htmlContent = this.generateTrialBalanceHTML(data);
    const documentNumber = `TB-${data.asOfDate}`;
    
    const fullHtml = await generateBaseDocument({
      title: 'Trial Balance',
      documentNumber,
      companyName: 'NXT Level Tech',
    }, htmlContent);
    
    const pdfBuffer = await renderHtmlToPdfBuffer({ html: fullHtml });
    
    const result = await DocumentGenerator.generate({
      orgId: data.orgId,
      documentType: DOCUMENT_TYPES.TRIAL_BALANCE,
      title: `Trial Balance - ${data.asOfDate}`,
      description: `Trial Balance as of ${data.asOfDate}`,
      documentNumber,
      htmlContent,
      tags: ['financial', 'gl', 'trial-balance'],
      metadata: {
        as_of_date: data.asOfDate,
        total_debit: data.totalDebit,
        total_credit: data.totalCredit,
        account_count: data.accounts.length,
      },
      entityLinks: [
        { entityType: 'trial_balance', entityId: `${data.orgId}-${data.asOfDate}`, linkType: 'primary' },
      ],
      generatedBy: userId,
      companyInfo: {
        name: 'NXT Level Tech',
      },
    });
    
    return {
      documentId: result.documentId,
      artifactId: result.artifactId,
      pdfBuffer,
    };
  }
  
  /**
   * Generate AR/AP Aging Report PDF
   */
  static async generateAgingReport(
    data: AgingReportData,
    userId?: string
  ): Promise<{ documentId: string; artifactId: string; pdfBuffer: Buffer }> {
    const htmlContent = this.generateAgingReportHTML(data);
    const reportType = data.reportType === 'ar' ? DOCUMENT_TYPES.AR_AGING_REPORT : DOCUMENT_TYPES.AP_AGING_REPORT;
    const documentNumber = `${data.reportType.toUpperCase()}-AGING-${data.asOfDate}`;
    const title = data.reportType === 'ar' ? 'AR Aging Report' : 'AP Aging Report';
    
    const fullHtml = await generateBaseDocument({
      title,
      documentNumber,
      companyName: 'NXT Level Tech',
    }, htmlContent);
    
    const pdfBuffer = await renderHtmlToPdfBuffer({ html: fullHtml });
    
    const result = await DocumentGenerator.generate({
      orgId: data.orgId,
      documentType: reportType,
      title: `${title} - ${data.asOfDate}`,
      description: `${data.reportType.toUpperCase()} Aging Report as of ${data.asOfDate}`,
      documentNumber,
      htmlContent,
      tags: ['financial', data.reportType, 'aging'],
      metadata: {
        report_type: data.reportType,
        as_of_date: data.asOfDate,
        total_due: data.totals.total,
        entry_count: data.entries.length,
      },
      entityLinks: [
        { entityType: `${data.reportType}_aging`, entityId: data.reportId, linkType: 'primary' },
      ],
      generatedBy: userId,
      companyInfo: {
        name: 'NXT Level Tech',
      },
    });
    
    return {
      documentId: result.documentId,
      artifactId: result.artifactId,
      pdfBuffer,
    };
  }
  
  /**
   * Generate Balance Sheet PDF
   */
  static async generateBalanceSheet(
    data: BalanceSheetData,
    userId?: string
  ): Promise<{ documentId: string; artifactId: string; pdfBuffer: Buffer }> {
    const htmlContent = this.generateBalanceSheetHTML(data);
    const documentNumber = `BS-${data.asOfDate}`;
    
    const fullHtml = await generateBaseDocument({
      title: 'Balance Sheet',
      documentNumber,
      companyName: 'NXT Level Tech',
    }, htmlContent);
    
    const pdfBuffer = await renderHtmlToPdfBuffer({ html: fullHtml });
    
    const result = await DocumentGenerator.generate({
      orgId: data.orgId,
      documentType: DOCUMENT_TYPES.BALANCE_SHEET,
      title: `Balance Sheet - ${data.asOfDate}`,
      description: `Balance Sheet as of ${data.asOfDate}`,
      documentNumber,
      htmlContent,
      tags: ['financial', 'report', 'balance-sheet'],
      metadata: {
        as_of_date: data.asOfDate,
        total_assets: data.assets.total,
        total_liabilities: data.liabilities.total,
        total_equity: data.totalEquity,
      },
      entityLinks: [
        { entityType: 'balance_sheet', entityId: `${data.orgId}-${data.asOfDate}`, linkType: 'primary' },
      ],
      generatedBy: userId,
      companyInfo: {
        name: 'NXT Level Tech',
      },
    });
    
    return {
      documentId: result.documentId,
      artifactId: result.artifactId,
      pdfBuffer,
    };
  }
  
  /**
   * Generate Income Statement HTML (for API route usage)
   */
  static generateIncomeStatementHTML(data: IncomeStatementData): string {
    const c = (amount: number) => formatCurrency(amount);
    
    return `
      <div class="highlight-box info">
        <strong>Period:</strong> ${formatDate(data.periodStart)} to ${formatDate(data.periodEnd)}
      </div>
      
      <h2>Revenue</h2>
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 70%;">Account</th>
            <th class="right" style="width: 30%;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${data.revenue.map(item => `
          <tr>
            <td>${item.name}</td>
            <td class="right">${c(item.amount)}</td>
          </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr style="background: #d1fae5; font-weight: bold;">
            <td>Total Revenue</td>
            <td class="right">${c(data.totalRevenue)}</td>
          </tr>
        </tfoot>
      </table>
      
      <h2>Expenses</h2>
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 70%;">Account</th>
            <th class="right" style="width: 30%;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${data.expenses.map(item => `
          <tr>
            <td>${item.name}</td>
            <td class="right">${c(item.amount)}</td>
          </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr style="background: #fee2e2; font-weight: bold;">
            <td>Total Expenses</td>
            <td class="right">${c(data.totalExpenses)}</td>
          </tr>
        </tfoot>
      </table>
      
      <div class="totals-section">
        <table class="totals-table">
          <tr>
            <td class="label">Total Revenue:</td>
            <td class="value">${c(data.totalRevenue)}</td>
          </tr>
          <tr>
            <td class="label">Total Expenses:</td>
            <td class="value">${c(data.totalExpenses)}</td>
          </tr>
          <tr class="total-row" style="${data.netIncome >= 0 ? 'color: #059669;' : 'color: #dc2626;'}">
            <td class="label">NET ${data.netIncome >= 0 ? 'INCOME' : 'LOSS'}:</td>
            <td class="value">${c(Math.abs(data.netIncome))}</td>
          </tr>
        </table>
      </div>
    `;
  }
  
  /**
   * Generate with DocumentGenerator and return result
   */
  static async generate(input: {
    orgId: string;
    documentType: string;
    documentNumber: string;
    title: string;
    description: string;
    htmlContent: string;
    metadata: Record<string, unknown>;
    entityLinks: Array<{ entityType: string; entityId: string; linkType: 'primary' | 'related' }>;
    userId?: string;
  }): Promise<{ documentId: string; artifactId: string; pdfBuffer: Buffer }> {
    const fullHtml = await generateBaseDocument({
      title: input.title,
      documentNumber: input.documentNumber,
      companyName: 'NXT Level Tech',
    }, input.htmlContent);
    
    const pdfBuffer = await renderHtmlToPdfBuffer({ html: fullHtml });
    
    const result = await DocumentGenerator.generate({
      orgId: input.orgId,
      documentType: input.documentType as any,
      title: input.title,
      description: input.description,
      documentNumber: input.documentNumber,
      htmlContent: input.htmlContent,
      tags: ['financial'],
      metadata: input.metadata,
      entityLinks: input.entityLinks,
      generatedBy: input.userId,
      companyInfo: { name: 'NXT Level Tech' },
    });
    
    return {
      documentId: result.documentId,
      artifactId: result.artifactId,
      pdfBuffer,
    };
  }
  
  // ============================================================================
  // HTML Generation Methods
  // ============================================================================
  
  private static generateJournalEntryHTML(data: JournalEntryData): string {
    const c = (amount?: number) => amount !== undefined ? formatCurrency(amount, data.currency) : '';
    
    return `
      <div style="margin-bottom: 24px;">
        <p><strong>Entry Date:</strong> ${formatDate(data.entryDate)}</p>
        ${data.reference ? `<p><strong>Reference:</strong> ${data.reference}</p>` : ''}
        ${data.description ? `<p><strong>Description:</strong> ${data.description}</p>` : ''}
      </div>
      
      <h2>Entry Lines</h2>
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 15%;">Account</th>
            <th style="width: 35%;">Name</th>
            <th style="width: 20%;">Description</th>
            <th class="right" style="width: 15%;">Debit</th>
            <th class="right" style="width: 15%;">Credit</th>
          </tr>
        </thead>
        <tbody>
          ${data.lines.map(line => `
          <tr>
            <td><strong>${line.accountCode}</strong></td>
            <td>${line.accountName}</td>
            <td class="text-muted">${line.description || ''}</td>
            <td class="right">${line.debit ? c(line.debit) : ''}</td>
            <td class="right">${line.credit ? c(line.credit) : ''}</td>
          </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr style="background: #f3f4f6; font-weight: bold;">
            <td colspan="3">Totals</td>
            <td class="right">${c(data.totalDebit)}</td>
            <td class="right">${c(data.totalCredit)}</td>
          </tr>
        </tfoot>
      </table>
      
      ${data.approvedBy ? `
      <div class="notes-section">
        <div class="notes-label">Approval</div>
        <div class="notes-content">Approved by: ${data.approvedBy}</div>
      </div>
      ` : ''}
    `;
  }
  
  private static generateTrialBalanceHTML(data: TrialBalanceData): string {
    const c = (amount?: number) => amount !== undefined ? formatCurrency(amount, data.currency) : '';
    
    // Group accounts by type
    const accountsByType = new Map<string, typeof data.accounts>();
    data.accounts.forEach(acc => {
      const existing = accountsByType.get(acc.type) || [];
      existing.push(acc);
      accountsByType.set(acc.type, existing);
    });
    
    return `
      <div class="highlight-box info">
        <strong>As of:</strong> ${formatDate(data.asOfDate)}
      </div>
      
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 15%;">Code</th>
            <th style="width: 45%;">Account Name</th>
            <th class="right" style="width: 20%;">Debit</th>
            <th class="right" style="width: 20%;">Credit</th>
          </tr>
        </thead>
        <tbody>
          ${data.accounts.map(acc => `
          <tr>
            <td><strong>${acc.code}</strong></td>
            <td>${acc.name}</td>
            <td class="right">${acc.debit ? c(acc.debit) : ''}</td>
            <td class="right">${acc.credit ? c(acc.credit) : ''}</td>
          </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr style="background: #f3f4f6; font-weight: bold; font-size: 11pt;">
            <td colspan="2">Totals</td>
            <td class="right">${c(data.totalDebit)}</td>
            <td class="right">${c(data.totalCredit)}</td>
          </tr>
        </tfoot>
      </table>
      
      <div class="highlight-box ${data.totalDebit === data.totalCredit ? 'success' : 'danger'}" style="margin-top: 24px;">
        ${data.totalDebit === data.totalCredit 
          ? '<strong>✓ Trial Balance is in balance</strong>' 
          : `<strong>⚠ Out of balance by ${c(Math.abs(data.totalDebit - data.totalCredit))}</strong>`
        }
      </div>
    `;
  }
  
  private static generateAgingReportHTML(data: AgingReportData): string {
    const c = (amount: number) => formatCurrency(amount, data.currency);
    const reportTitle = data.reportType === 'ar' ? 'Accounts Receivable' : 'Accounts Payable';
    
    return `
      <div class="highlight-box info">
        <strong>${reportTitle} Aging Report</strong><br>
        As of ${formatDate(data.asOfDate)}
      </div>
      
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 25%;">${data.reportType === 'ar' ? 'Customer' : 'Supplier'}</th>
            <th class="right" style="width: 12.5%;">Current</th>
            <th class="right" style="width: 12.5%;">1-30 Days</th>
            <th class="right" style="width: 12.5%;">31-60 Days</th>
            <th class="right" style="width: 12.5%;">61-90 Days</th>
            <th class="right" style="width: 12.5%;">90+ Days</th>
            <th class="right" style="width: 12.5%;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${data.entries.map(entry => `
          <tr>
            <td>
              <div class="item-name">${entry.name}</div>
              ${entry.accountNumber ? `<div class="text-muted text-small">${entry.accountNumber}</div>` : ''}
            </td>
            <td class="right">${c(entry.current)}</td>
            <td class="right">${c(entry.days30)}</td>
            <td class="right">${c(entry.days60)}</td>
            <td class="right">${c(entry.days90)}</td>
            <td class="right" style="${entry.over90 > 0 ? 'color: #dc2626; font-weight: bold;' : ''}">${c(entry.over90)}</td>
            <td class="right"><strong>${c(entry.total)}</strong></td>
          </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr style="background: #f3f4f6; font-weight: bold;">
            <td>Totals</td>
            <td class="right">${c(data.totals.current)}</td>
            <td class="right">${c(data.totals.days30)}</td>
            <td class="right">${c(data.totals.days60)}</td>
            <td class="right">${c(data.totals.days90)}</td>
            <td class="right" style="color: #dc2626;">${c(data.totals.over90)}</td>
            <td class="right">${c(data.totals.total)}</td>
          </tr>
        </tfoot>
      </table>
      
      <h2>Summary</h2>
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
        <div style="background: #f9fafb; padding: 16px; border-radius: 8px; text-align: center;">
          <div style="font-size: 24pt; font-weight: bold; color: #059669;">${c(data.totals.current)}</div>
          <div style="color: #6b7280; font-size: 10pt;">Current</div>
        </div>
        <div style="background: #fef3c7; padding: 16px; border-radius: 8px; text-align: center;">
          <div style="font-size: 24pt; font-weight: bold; color: #f59e0b;">${c(data.totals.days30 + data.totals.days60)}</div>
          <div style="color: #6b7280; font-size: 10pt;">1-60 Days</div>
        </div>
        <div style="background: #fee2e2; padding: 16px; border-radius: 8px; text-align: center;">
          <div style="font-size: 24pt; font-weight: bold; color: #dc2626;">${c(data.totals.days90 + data.totals.over90)}</div>
          <div style="color: #6b7280; font-size: 10pt;">60+ Days</div>
        </div>
      </div>
    `;
  }
  
  private static generateBalanceSheetHTML(data: BalanceSheetData): string {
    const c = (amount: number) => formatCurrency(amount, data.currency);
    
    return `
      <div class="highlight-box info">
        <strong>As of:</strong> ${formatDate(data.asOfDate)}
      </div>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
        <div>
          <h2>Assets</h2>
          
          <h3>Current Assets</h3>
          <table class="data-table">
            <tbody>
              ${data.assets.current.map(item => `
              <tr>
                <td>${item.name}</td>
                <td class="right">${c(item.amount)}</td>
              </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr style="background: #f3f4f6;">
                <td><strong>Total Current Assets</strong></td>
                <td class="right"><strong>${c(data.assets.totalCurrent)}</strong></td>
              </tr>
            </tfoot>
          </table>
          
          <h3>Fixed Assets</h3>
          <table class="data-table">
            <tbody>
              ${data.assets.fixed.map(item => `
              <tr>
                <td>${item.name}</td>
                <td class="right">${c(item.amount)}</td>
              </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr style="background: #f3f4f6;">
                <td><strong>Total Fixed Assets</strong></td>
                <td class="right"><strong>${c(data.assets.totalFixed)}</strong></td>
              </tr>
            </tfoot>
          </table>
          
          <div style="background: #dbeafe; padding: 12px; border-radius: 6px; margin-top: 16px;">
            <strong>TOTAL ASSETS: ${c(data.assets.total)}</strong>
          </div>
        </div>
        
        <div>
          <h2>Liabilities & Equity</h2>
          
          <h3>Current Liabilities</h3>
          <table class="data-table">
            <tbody>
              ${data.liabilities.current.map(item => `
              <tr>
                <td>${item.name}</td>
                <td class="right">${c(item.amount)}</td>
              </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr style="background: #f3f4f6;">
                <td><strong>Total Current Liabilities</strong></td>
                <td class="right"><strong>${c(data.liabilities.totalCurrent)}</strong></td>
              </tr>
            </tfoot>
          </table>
          
          <h3>Long-Term Liabilities</h3>
          <table class="data-table">
            <tbody>
              ${data.liabilities.longTerm.map(item => `
              <tr>
                <td>${item.name}</td>
                <td class="right">${c(item.amount)}</td>
              </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr style="background: #f3f4f6;">
                <td><strong>Total Long-Term Liabilities</strong></td>
                <td class="right"><strong>${c(data.liabilities.totalLongTerm)}</strong></td>
              </tr>
            </tfoot>
          </table>
          
          <h3>Equity</h3>
          <table class="data-table">
            <tbody>
              ${data.equity.map(item => `
              <tr>
                <td>${item.name}</td>
                <td class="right">${c(item.amount)}</td>
              </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr style="background: #f3f4f6;">
                <td><strong>Total Equity</strong></td>
                <td class="right"><strong>${c(data.totalEquity)}</strong></td>
              </tr>
            </tfoot>
          </table>
          
          <div style="background: #dbeafe; padding: 12px; border-radius: 6px; margin-top: 16px;">
            <strong>TOTAL LIABILITIES & EQUITY: ${c(data.totalLiabilitiesAndEquity)}</strong>
          </div>
        </div>
      </div>
      
      <div class="highlight-box ${data.assets.total === data.totalLiabilitiesAndEquity ? 'success' : 'danger'}" style="margin-top: 24px; text-align: center;">
        ${data.assets.total === data.totalLiabilitiesAndEquity 
          ? '<strong>✓ Balance Sheet is balanced</strong>' 
          : `<strong>⚠ Out of balance by ${c(Math.abs(data.assets.total - data.totalLiabilitiesAndEquity))}</strong>`
        }
      </div>
    `;
  }
}
