// UPDATE: [2025-12-25] Created Purchase Order PDF service with DocuStore integration

/**
 * Purchase Order PDF Service
 * 
 * Handles PDF generation for purchase order documents:
 * - Purchase Orders
 * - Goods Received Notes
 */

import { DocumentGenerator, DOCUMENT_TYPES, formatDate, formatCurrency } from '@/lib/services/docustore';
import { renderHtmlToPdfBuffer } from '@/lib/services/pdf/html-to-pdf';
import { generateBaseDocument } from '@/lib/services/docustore/templates';

export interface PurchaseOrderData {
  purchaseOrderId: string;
  poNumber: string;
  orgId: string;
  status: string;
  supplier: {
    id: string;
    name: string;
    contactName?: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  shipTo?: {
    name: string;
    address: string;
  };
  orderDate: string;
  expectedDate?: string;
  currency: string;
  items: Array<{
    lineNumber: number;
    productName: string;
    sku?: string;
    description?: string;
    quantity: number;
    unit?: string;
    unitPrice: number;
    taxRate?: number;
    taxAmount?: number;
    subtotal: number;
    total: number;
  }>;
  subtotal: number;
  totalTax: number;
  total: number;
  notes?: string;
  terms?: string;
}

export class PurchaseOrderPDFService {
  /**
   * Generate purchase order PDF
   */
  static async generatePurchaseOrder(
    data: PurchaseOrderData,
    userId?: string
  ): Promise<{ documentId: string; artifactId: string; pdfBuffer: Buffer }> {
    const htmlContent = this.generatePurchaseOrderHTML(data);
    
    const fullHtml = await generateBaseDocument({
      title: 'Purchase Order',
      documentNumber: data.poNumber,
      companyName: 'NXT Level Tech',
    }, htmlContent);
    
    const pdfBuffer = await renderHtmlToPdfBuffer({ html: fullHtml });
    
    const result = await DocumentGenerator.generate({
      orgId: data.orgId,
      documentType: DOCUMENT_TYPES.PURCHASE_ORDER,
      title: `Purchase Order ${data.poNumber}`,
      description: `PO to ${data.supplier.name}`,
      documentNumber: data.poNumber,
      htmlContent,
      tags: ['purchasing', 'po', data.status],
      metadata: {
        purchase_order_id: data.purchaseOrderId,
        po_number: data.poNumber,
        supplier_id: data.supplier.id,
        supplier_name: data.supplier.name,
        status: data.status,
        order_date: data.orderDate,
        total: data.total,
        item_count: data.items.length,
      },
      entityLinks: [
        { entityType: 'purchase_order', entityId: data.purchaseOrderId, linkType: 'primary' },
        { entityType: 'supplier', entityId: data.supplier.id, linkType: 'related' },
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
   * Generate purchase order HTML
   */
  private static generatePurchaseOrderHTML(data: PurchaseOrderData): string {
    const c = (amount: number) => formatCurrency(amount, data.currency);
    
    const statusColors: Record<string, string> = {
      draft: '#6b7280',
      pending: '#f59e0b',
      approved: '#3b82f6',
      sent: '#8b5cf6',
      partially_received: '#f59e0b',
      received: '#059669',
      cancelled: '#dc2626',
    };
    
    const statusColor = statusColors[data.status.toLowerCase()] || '#6b7280';
    
    return `
      <div class="address-section">
        <div class="address-block">
          <div class="address-label">Supplier</div>
          <div class="address-content">
            <div class="address-name">${data.supplier.name}</div>
            ${data.supplier.contactName ? `<div>Attn: ${data.supplier.contactName}</div>` : ''}
            ${data.supplier.address ? `<div>${data.supplier.address}</div>` : ''}
            ${data.supplier.email ? `<div>${data.supplier.email}</div>` : ''}
            ${data.supplier.phone ? `<div>${data.supplier.phone}</div>` : ''}
          </div>
        </div>
        ${data.shipTo ? `
        <div class="address-block">
          <div class="address-label">Ship To</div>
          <div class="address-content">
            <div class="address-name">${data.shipTo.name}</div>
            <div>${data.shipTo.address}</div>
          </div>
        </div>
        ` : ''}
      </div>
      
      <div class="meta-info" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; padding: 16px; background: #f9fafb; border-radius: 8px;">
        <div>
          <div class="meta-label" style="font-size: 11px; color: #6b7280; text-transform: uppercase;">Order Date</div>
          <div class="meta-value" style="font-weight: 500;">${formatDate(data.orderDate)}</div>
        </div>
        <div>
          <div class="meta-label" style="font-size: 11px; color: #6b7280; text-transform: uppercase;">Expected By</div>
          <div class="meta-value" style="font-weight: 500;">${data.expectedDate ? formatDate(data.expectedDate) : 'TBD'}</div>
        </div>
        <div>
          <div class="meta-label" style="font-size: 11px; color: #6b7280; text-transform: uppercase;">Currency</div>
          <div class="meta-value" style="font-weight: 500;">${data.currency}</div>
        </div>
        <div>
          <div class="meta-label" style="font-size: 11px; color: #6b7280; text-transform: uppercase;">Status</div>
          <div class="meta-value" style="font-weight: 500; color: ${statusColor}; text-transform: uppercase;">${data.status}</div>
        </div>
      </div>
      
      <h2>Order Items</h2>
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 5%;">#</th>
            <th style="width: 35%;">Item</th>
            <th style="width: 12%;">SKU</th>
            <th class="right" style="width: 10%;">Qty</th>
            <th class="right" style="width: 12%;">Unit Price</th>
            <th class="right" style="width: 10%;">Tax</th>
            <th class="right" style="width: 16%;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${data.items.map(item => `
          <tr>
            <td>${item.lineNumber}</td>
            <td>
              <div class="item-name">${item.productName}</div>
              ${item.description ? `<div class="item-description">${item.description}</div>` : ''}
            </td>
            <td>${item.sku || '-'}</td>
            <td class="right">${item.quantity}${item.unit ? ` ${item.unit}` : ''}</td>
            <td class="right">${c(item.unitPrice)}</td>
            <td class="right">${item.taxRate ? `${item.taxRate}%` : '-'}</td>
            <td class="right">${c(item.total)}</td>
          </tr>
          `).join('')}
        </tbody>
      </table>
      
      <div class="totals-section">
        <table class="totals-table">
          <tr>
            <td class="label">Subtotal:</td>
            <td class="value">${c(data.subtotal)}</td>
          </tr>
          <tr>
            <td class="label">Tax:</td>
            <td class="value">${c(data.totalTax)}</td>
          </tr>
          <tr class="total-row">
            <td class="label">TOTAL:</td>
            <td class="value">${c(data.total)}</td>
          </tr>
        </table>
      </div>
      
      ${data.notes ? `
      <div class="notes-section">
        <div class="notes-label">Notes</div>
        <div class="notes-content">${data.notes}</div>
      </div>
      ` : ''}
      
      ${data.terms ? `
      <div class="notes-section">
        <div class="notes-label">Terms & Conditions</div>
        <div class="notes-content">${data.terms}</div>
      </div>
      ` : ''}
      
      <div class="signature-section">
        <div class="signature-block">
          <div class="signature-line"></div>
          <div class="signature-label">Authorized Signature</div>
        </div>
        <div class="signature-block">
          <div class="signature-line"></div>
          <div class="signature-label">Date</div>
        </div>
      </div>
    `;
  }
}

