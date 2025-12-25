// UPDATE: [2025-12-25] Created Logistics PDF service with DocuStore integration

/**
 * Logistics PDF Service
 * 
 * Handles PDF generation for logistics documents:
 * - Delivery Notes
 * - Shipping Labels
 * - Packing Slips
 * - Logistics Reports
 */

import { DocumentGenerator, DOCUMENT_TYPES, formatDate, formatCurrency } from '@/lib/services/docustore';
import { renderHtmlToPdfBuffer } from '@/lib/services/pdf/html-to-pdf';
import { generateBaseDocument } from '@/lib/services/docustore/templates';

export interface DeliveryNoteData {
  deliveryId: string;
  deliveryNumber: string;
  orgId: string;
  orderId: string;
  orderNumber: string;
  customer: {
    name: string;
    company?: string;
    phone?: string;
    address?: string;
  };
  deliveryAddress: string;
  deliveryDate: string;
  deliveryContact?: string;
  items: Array<{
    name: string;
    sku?: string;
    quantity: number;
    unit?: string;
  }>;
  notes?: string;
  driver?: string;
  vehicleReg?: string;
}

export class LogisticsPDFService {
  /**
   * Generate delivery note PDF
   */
  static async generateDeliveryNote(
    data: DeliveryNoteData,
    userId?: string
  ): Promise<{ documentId: string; artifactId: string; pdfBuffer: Buffer }> {
    const htmlContent = this.generateDeliveryNoteHTML(data);
    
    const fullHtml = await generateBaseDocument({
      title: 'Delivery Note',
      documentNumber: data.deliveryNumber,
      companyName: 'NXT Level Tech',
    }, htmlContent);
    
    const pdfBuffer = await renderHtmlToPdfBuffer({ html: fullHtml });
    
    const result = await DocumentGenerator.generate({
      orgId: data.orgId,
      documentType: DOCUMENT_TYPES.DELIVERY_NOTE,
      title: `Delivery Note ${data.deliveryNumber}`,
      description: `Delivery note for order ${data.orderNumber}`,
      documentNumber: data.deliveryNumber,
      htmlContent,
      tags: ['logistics', 'delivery'],
      metadata: {
        delivery_id: data.deliveryId,
        delivery_number: data.deliveryNumber,
        order_id: data.orderId,
        order_number: data.orderNumber,
        delivery_date: data.deliveryDate,
        item_count: data.items.length,
      },
      entityLinks: [
        { entityType: 'delivery', entityId: data.deliveryId, linkType: 'primary' },
        { entityType: 'order', entityId: data.orderId, linkType: 'related' },
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
   * Generate delivery note HTML
   */
  private static generateDeliveryNoteHTML(data: DeliveryNoteData): string {
    return `
      <div class="address-section">
        <div class="address-block">
          <div class="address-label">Deliver To</div>
          <div class="address-content">
            <div class="address-name">${data.customer.company || data.customer.name}</div>
            ${data.deliveryContact ? `<div>Attn: ${data.deliveryContact}</div>` : ''}
            <div>${data.deliveryAddress}</div>
            ${data.customer.phone ? `<div>Tel: ${data.customer.phone}</div>` : ''}
          </div>
        </div>
        <div class="address-block">
          <div class="address-label">Delivery Details</div>
          <div class="address-content">
            <div><strong>Order:</strong> ${data.orderNumber}</div>
            <div><strong>Delivery Date:</strong> ${formatDate(data.deliveryDate)}</div>
            ${data.driver ? `<div><strong>Driver:</strong> ${data.driver}</div>` : ''}
            ${data.vehicleReg ? `<div><strong>Vehicle:</strong> ${data.vehicleReg}</div>` : ''}
          </div>
        </div>
      </div>
      
      <h2>Items for Delivery</h2>
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 10%;">#</th>
            <th style="width: 50%;">Item Description</th>
            <th style="width: 20%;">SKU</th>
            <th class="center" style="width: 20%;">Quantity</th>
          </tr>
        </thead>
        <tbody>
          ${data.items.map((item, index) => `
          <tr>
            <td>${index + 1}</td>
            <td class="item-name">${item.name}</td>
            <td>${item.sku || '-'}</td>
            <td class="center">${item.quantity}${item.unit ? ` ${item.unit}` : ''}</td>
          </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr style="background: #f3f4f6; font-weight: bold;">
            <td colspan="3">Total Items</td>
            <td class="center">${data.items.reduce((sum, i) => sum + i.quantity, 0)}</td>
          </tr>
        </tfoot>
      </table>
      
      ${data.notes ? `
      <div class="notes-section">
        <div class="notes-label">Delivery Instructions</div>
        <div class="notes-content">${data.notes}</div>
      </div>
      ` : ''}
      
      <div class="signature-section">
        <div class="signature-block">
          <div class="signature-line"></div>
          <div class="signature-label">Received By (Print Name)</div>
        </div>
        <div class="signature-block">
          <div class="signature-line"></div>
          <div class="signature-label">Signature & Date</div>
        </div>
      </div>
      
      <div class="highlight-box" style="margin-top: 24px;">
        <strong>Important:</strong> Please check all items upon receipt. 
        Any discrepancies must be reported within 24 hours.
      </div>
    `;
  }
}

