// UPDATE: [2025-12-25] Created Customer PDF service with DocuStore integration

/**
 * Customer PDF Service
 * 
 * Handles PDF generation for customer documents:
 * - Customer Statements
 * - Account Summaries
 */

import { DocumentGenerator, DOCUMENT_TYPES, formatDate, formatCurrency } from '@/lib/services/docustore';
import { renderHtmlToPdfBuffer } from '@/lib/services/pdf/html-to-pdf';
import { generateBaseDocument } from '@/lib/services/docustore/templates';

export interface CustomerStatementData {
  customerId: string;
  orgId: string;
  customer: {
    name: string;
    company?: string;
    email?: string;
    phone?: string;
    address?: string;
    accountNumber?: string;
  };
  periodStart: string;
  periodEnd: string;
  openingBalance: number;
  closingBalance: number;
  currency: string;
  transactions: Array<{
    date: string;
    type: string;
    reference: string;
    description: string;
    debit?: number;
    credit?: number;
    balance: number;
  }>;
  agingSummary?: {
    current: number;
    days30: number;
    days60: number;
    days90: number;
    over90: number;
    total: number;
  };
}

export class CustomerPDFService {
  /**
   * Generate customer statement PDF
   */
  static async generateStatement(
    data: CustomerStatementData,
    userId?: string
  ): Promise<{ documentId: string; artifactId: string; pdfBuffer: Buffer }> {
    const htmlContent = this.generateStatementHTML(data);
    const documentNumber = `STMT-${data.customer.accountNumber || data.customerId.slice(0, 8)}-${data.periodEnd}`;
    
    const fullHtml = await generateBaseDocument({
      title: 'Customer Statement',
      documentNumber,
      companyName: 'NXT Level Tech',
    }, htmlContent);
    
    const pdfBuffer = await renderHtmlToPdfBuffer({ html: fullHtml });
    
    const result = await DocumentGenerator.generate({
      orgId: data.orgId,
      documentType: DOCUMENT_TYPES.CUSTOMER_STATEMENT,
      title: `Statement - ${data.customer.company || data.customer.name}`,
      description: `Customer statement for period ${data.periodStart} to ${data.periodEnd}`,
      documentNumber,
      htmlContent,
      tags: ['customer', 'statement', 'ar'],
      metadata: {
        customer_id: data.customerId,
        customer_name: data.customer.company || data.customer.name,
        period_start: data.periodStart,
        period_end: data.periodEnd,
        opening_balance: data.openingBalance,
        closing_balance: data.closingBalance,
        transaction_count: data.transactions.length,
      },
      entityLinks: [
        { entityType: 'customer', entityId: data.customerId, linkType: 'primary' },
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
   * Generate statement HTML
   */
  private static generateStatementHTML(data: CustomerStatementData): string {
    const c = (amount: number | undefined) => amount !== undefined ? formatCurrency(amount, data.currency) : '';
    
    return `
      <div class="address-section">
        <div class="address-block">
          <div class="address-label">Statement For</div>
          <div class="address-content">
            <div class="address-name">${data.customer.company || data.customer.name}</div>
            ${data.customer.accountNumber ? `<div>Account #: ${data.customer.accountNumber}</div>` : ''}
            ${data.customer.address ? `<div>${data.customer.address}</div>` : ''}
            ${data.customer.email ? `<div>${data.customer.email}</div>` : ''}
            ${data.customer.phone ? `<div>${data.customer.phone}</div>` : ''}
          </div>
        </div>
        <div class="address-block">
          <div class="address-label">Statement Period</div>
          <div class="address-content">
            <div><strong>From:</strong> ${formatDate(data.periodStart)}</div>
            <div><strong>To:</strong> ${formatDate(data.periodEnd)}</div>
          </div>
        </div>
      </div>
      
      <div class="highlight-box" style="margin-bottom: 24px;">
        <strong>Opening Balance:</strong> ${c(data.openingBalance)} | 
        <strong>Closing Balance:</strong> ${c(data.closingBalance)}
      </div>
      
      <h2>Transaction History</h2>
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 12%;">Date</th>
            <th style="width: 12%;">Type</th>
            <th style="width: 15%;">Reference</th>
            <th style="width: 25%;">Description</th>
            <th class="right" style="width: 12%;">Debit</th>
            <th class="right" style="width: 12%;">Credit</th>
            <th class="right" style="width: 12%;">Balance</th>
          </tr>
        </thead>
        <tbody>
          <tr style="background: #f9fafb; font-style: italic;">
            <td colspan="6">Opening Balance</td>
            <td class="right">${c(data.openingBalance)}</td>
          </tr>
          ${data.transactions.map(tx => `
          <tr>
            <td>${formatDate(tx.date)}</td>
            <td>${tx.type}</td>
            <td>${tx.reference}</td>
            <td>${tx.description}</td>
            <td class="right">${tx.debit ? c(tx.debit) : ''}</td>
            <td class="right">${tx.credit ? c(tx.credit) : ''}</td>
            <td class="right">${c(tx.balance)}</td>
          </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr style="background: #f3f4f6; font-weight: bold;">
            <td colspan="6">Closing Balance</td>
            <td class="right">${c(data.closingBalance)}</td>
          </tr>
        </tfoot>
      </table>
      
      ${data.agingSummary ? `
      <h2>Aging Summary</h2>
      <table class="data-table">
        <thead>
          <tr>
            <th class="right">Current</th>
            <th class="right">1-30 Days</th>
            <th class="right">31-60 Days</th>
            <th class="right">61-90 Days</th>
            <th class="right">Over 90 Days</th>
            <th class="right">Total Due</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="right">${c(data.agingSummary.current)}</td>
            <td class="right">${c(data.agingSummary.days30)}</td>
            <td class="right">${c(data.agingSummary.days60)}</td>
            <td class="right">${c(data.agingSummary.days90)}</td>
            <td class="right">${c(data.agingSummary.over90)}</td>
            <td class="right"><strong>${c(data.agingSummary.total)}</strong></td>
          </tr>
        </tbody>
      </table>
      ` : ''}
      
      <div class="notes-section" style="margin-top: 32px;">
        <div class="notes-label">Payment Information</div>
        <div class="notes-content">
          Please remit payment to: NXT Level Tech<br>
          Account queries: accounts@nxtleveltech.com
        </div>
      </div>
    `;
  }
}

