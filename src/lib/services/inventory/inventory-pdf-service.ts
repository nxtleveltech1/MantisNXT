// UPDATE: [2025-12-25] Created Inventory PDF service with DocuStore integration

/**
 * Inventory PDF Service
 * 
 * Handles PDF generation for inventory documents:
 * - Stock Adjustments
 * - Stock Take Reports
 * - Inventory Valuation
 * - Inventory Reports
 */

import { DocumentGenerator, DOCUMENT_TYPES, formatDate, formatCurrency } from '@/lib/services/docustore';
import { renderHtmlToPdfBuffer } from '@/lib/services/pdf/html-to-pdf';
import { generateBaseDocument } from '@/lib/services/docustore/templates';

export interface StockAdjustmentData {
  adjustmentId: string;
  adjustmentNumber: string;
  orgId: string;
  adjustmentType: 'increase' | 'decrease' | 'write_off' | 'transfer';
  reason: string;
  date: string;
  items: Array<{
    productName: string;
    sku: string;
    previousQty: number;
    adjustedQty: number;
    newQty: number;
    unitCost?: number;
    totalValue?: number;
  }>;
  approvedBy?: string;
  notes?: string;
}

export interface InventoryReportData {
  reportId: string;
  orgId: string;
  asOfDate: string;
  categories: Array<{
    name: string;
    items: Array<{
      name: string;
      sku: string;
      quantity: number;
      unitCost: number;
      totalValue: number;
    }>;
    totalValue: number;
  }>;
  grandTotal: number;
}

export class InventoryPDFService {
  /**
   * Generate stock adjustment PDF
   */
  static async generateStockAdjustment(
    data: StockAdjustmentData,
    userId?: string
  ): Promise<{ documentId: string; artifactId: string; pdfBuffer: Buffer }> {
    const htmlContent = this.generateStockAdjustmentHTML(data);
    
    const fullHtml = await generateBaseDocument({
      title: 'Stock Adjustment',
      documentNumber: data.adjustmentNumber,
      companyName: 'NXT Level Tech',
    }, htmlContent);
    
    const pdfBuffer = await renderHtmlToPdfBuffer({ html: fullHtml });
    
    const result = await DocumentGenerator.generate({
      orgId: data.orgId,
      documentType: DOCUMENT_TYPES.STOCK_ADJUSTMENT,
      title: `Stock Adjustment ${data.adjustmentNumber}`,
      description: `${data.adjustmentType} adjustment: ${data.reason}`,
      documentNumber: data.adjustmentNumber,
      htmlContent,
      tags: ['inventory', 'adjustment', data.adjustmentType],
      metadata: {
        adjustment_id: data.adjustmentId,
        adjustment_number: data.adjustmentNumber,
        adjustment_type: data.adjustmentType,
        reason: data.reason,
        date: data.date,
        item_count: data.items.length,
      },
      entityLinks: [
        { entityType: 'stock_adjustment', entityId: data.adjustmentId, linkType: 'primary' },
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
   * Generate inventory valuation report PDF
   */
  static async generateInventoryReport(
    data: InventoryReportData,
    userId?: string
  ): Promise<{ documentId: string; artifactId: string; pdfBuffer: Buffer }> {
    const htmlContent = this.generateInventoryReportHTML(data);
    const documentNumber = `INV-RPT-${data.asOfDate}`;
    
    const fullHtml = await generateBaseDocument({
      title: 'Inventory Report',
      documentNumber,
      companyName: 'NXT Level Tech',
    }, htmlContent);
    
    const pdfBuffer = await renderHtmlToPdfBuffer({ html: fullHtml });
    
    const result = await DocumentGenerator.generate({
      orgId: data.orgId,
      documentType: DOCUMENT_TYPES.INVENTORY_REPORT,
      title: `Inventory Report - ${data.asOfDate}`,
      description: `Inventory valuation report as of ${data.asOfDate}`,
      documentNumber,
      htmlContent,
      tags: ['inventory', 'report', 'valuation'],
      metadata: {
        as_of_date: data.asOfDate,
        category_count: data.categories.length,
        grand_total: data.grandTotal,
      },
      entityLinks: [
        { entityType: 'inventory_report', entityId: data.reportId, linkType: 'primary' },
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
   * Generate stock adjustment HTML
   */
  private static generateStockAdjustmentHTML(data: StockAdjustmentData): string {
    const typeLabels: Record<string, string> = {
      increase: 'Stock Increase',
      decrease: 'Stock Decrease',
      write_off: 'Stock Write-Off',
      transfer: 'Stock Transfer',
    };
    
    const typeColors: Record<string, string> = {
      increase: 'success',
      decrease: 'danger',
      write_off: 'danger',
      transfer: 'info',
    };
    
    const totalValue = data.items.reduce((sum, i) => sum + (i.totalValue || 0), 0);
    
    return `
      <div class="highlight-box ${typeColors[data.adjustmentType] || ''}">
        <strong>${typeLabels[data.adjustmentType] || 'Stock Adjustment'}</strong><br>
        <span class="text-small">${data.reason}</span>
      </div>
      
      <div style="margin-bottom: 24px;">
        <strong>Adjustment Date:</strong> ${formatDate(data.date)}
        ${data.approvedBy ? `<br><strong>Approved By:</strong> ${data.approvedBy}` : ''}
      </div>
      
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 30%;">Product</th>
            <th style="width: 15%;">SKU</th>
            <th class="right" style="width: 13%;">Previous</th>
            <th class="right" style="width: 13%;">Adjustment</th>
            <th class="right" style="width: 13%;">New Qty</th>
            <th class="right" style="width: 16%;">Value</th>
          </tr>
        </thead>
        <tbody>
          ${data.items.map(item => {
            const diff = item.adjustedQty;
            const diffClass = diff > 0 ? 'color: #059669;' : diff < 0 ? 'color: #dc2626;' : '';
            return `
            <tr>
              <td class="item-name">${item.productName}</td>
              <td>${item.sku}</td>
              <td class="right">${item.previousQty}</td>
              <td class="right" style="${diffClass}">${diff > 0 ? '+' : ''}${diff}</td>
              <td class="right"><strong>${item.newQty}</strong></td>
              <td class="right">${item.totalValue ? formatCurrency(item.totalValue) : '-'}</td>
            </tr>
            `;
          }).join('')}
        </tbody>
        ${totalValue > 0 ? `
        <tfoot>
          <tr style="background: #f3f4f6; font-weight: bold;">
            <td colspan="5">Total Adjustment Value</td>
            <td class="right">${formatCurrency(totalValue)}</td>
          </tr>
        </tfoot>
        ` : ''}
      </table>
      
      ${data.notes ? `
      <div class="notes-section">
        <div class="notes-label">Notes</div>
        <div class="notes-content">${data.notes}</div>
      </div>
      ` : ''}
      
      <div class="signature-section">
        <div class="signature-block">
          <div class="signature-line"></div>
          <div class="signature-label">Prepared By</div>
        </div>
        <div class="signature-block">
          <div class="signature-line"></div>
          <div class="signature-label">Verified By</div>
        </div>
      </div>
    `;
  }
  
  /**
   * Generate inventory report HTML
   */
  private static generateInventoryReportHTML(data: InventoryReportData): string {
    return `
      <div class="highlight-box info">
        <strong>Inventory Valuation Report</strong><br>
        As of ${formatDate(data.asOfDate)}
      </div>
      
      ${data.categories.map(category => `
      <h2>${category.name}</h2>
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 40%;">Product</th>
            <th style="width: 15%;">SKU</th>
            <th class="right" style="width: 15%;">Qty on Hand</th>
            <th class="right" style="width: 15%;">Unit Cost</th>
            <th class="right" style="width: 15%;">Total Value</th>
          </tr>
        </thead>
        <tbody>
          ${category.items.map(item => `
          <tr>
            <td class="item-name">${item.name}</td>
            <td>${item.sku}</td>
            <td class="right">${item.quantity}</td>
            <td class="right">${formatCurrency(item.unitCost)}</td>
            <td class="right">${formatCurrency(item.totalValue)}</td>
          </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr style="background: #f3f4f6; font-weight: bold;">
            <td colspan="4">Category Total</td>
            <td class="right">${formatCurrency(category.totalValue)}</td>
          </tr>
        </tfoot>
      </table>
      `).join('')}
      
      <div class="totals-section">
        <table class="totals-table">
          <tr class="total-row">
            <td class="label">GRAND TOTAL INVENTORY VALUE:</td>
            <td class="value">${formatCurrency(data.grandTotal)}</td>
          </tr>
        </table>
      </div>
    `;
  }
}

