// UPDATE: [2025-12-25] Created repair PDF service with DocuStore integration

/**
 * Repair PDF Service
 * 
 * Handles PDF generation for repair orders and invoices with DocuStore integration
 */

import { DocumentGenerator, DOCUMENT_TYPES, formatDate, formatCurrency } from '@/lib/services/docustore';
import { query } from '@/lib/database/unified-connection';

export interface RepairOrder {
  order_id: string;
  org_id: string;
  order_number: string;
  customer_id: string;
  equipment_name: string;
  equipment_model?: string;
  equipment_serial?: string;
  issue_description: string;
  diagnosis?: string;
  status: string;
  priority: string;
  labor_hours?: number;
  labor_rate?: number;
  parts_total?: number;
  subtotal: number;
  total_tax: number;
  total: number;
  notes?: string;
  estimated_completion_date?: string;
  actual_completion_date?: string;
  created_at: string;
}

export interface RepairOrderItem {
  item_id: string;
  part_name: string;
  part_number?: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
}

export interface CustomerInfo {
  id: string;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
}

/**
 * Generate repair order PDF and store in DocuStore
 */
export async function generateRepairOrderPDF(
  order: RepairOrder,
  items: RepairOrderItem[],
  customer: CustomerInfo,
  userId?: string
): Promise<{ documentId: string; artifactId: string; pdfBuffer: Buffer }> {
  const htmlContent = generateRepairOrderHTML(order, items, customer);
  
  const result = await DocumentGenerator.generate({
    orgId: order.org_id,
    documentType: DOCUMENT_TYPES.REPAIR_ORDER,
    title: `Repair Order ${order.order_number}`,
    description: `Repair order for ${order.equipment_name}`,
    documentNumber: order.order_number,
    htmlContent,
    tags: ['repair', 'service', order.status, order.priority],
    metadata: {
      order_id: order.order_id,
      order_number: order.order_number,
      customer_id: order.customer_id,
      customer_name: customer.name,
      equipment_name: order.equipment_name,
      status: order.status,
      total: order.total,
    },
    entityLinks: [
      { entityType: 'repair_order', entityId: order.order_id, linkType: 'primary' },
      { entityType: 'customer', entityId: order.customer_id, linkType: 'related' },
    ],
    generatedBy: userId,
    companyInfo: {
      name: 'NXT Level Tech',
    },
  });
  
  // Get PDF buffer for return
  const { renderHtmlToPdfBuffer } = await import('@/lib/services/pdf/html-to-pdf');
  const { generateBaseDocument } = await import('@/lib/services/docustore/templates');
  const fullHtml = await generateBaseDocument({
    title: 'Repair Order',
    documentNumber: order.order_number,
    companyName: 'NXT Level Tech',
  }, htmlContent);
  const pdfBuffer = await renderHtmlToPdfBuffer({ html: fullHtml });
  
  return {
    documentId: result.documentId,
    artifactId: result.artifactId,
    pdfBuffer,
  };
}

/**
 * Generate repair invoice PDF and store in DocuStore
 */
export async function generateRepairInvoicePDF(
  order: RepairOrder,
  items: RepairOrderItem[],
  customer: CustomerInfo,
  userId?: string
): Promise<{ documentId: string; artifactId: string; pdfBuffer: Buffer }> {
  const htmlContent = generateRepairInvoiceHTML(order, items, customer);
  
  const result = await DocumentGenerator.generate({
    orgId: order.org_id,
    documentType: DOCUMENT_TYPES.REPAIR_INVOICE,
    title: `Repair Invoice ${order.order_number}`,
    description: `Repair invoice for ${order.equipment_name}`,
    documentNumber: `INV-${order.order_number}`,
    htmlContent,
    tags: ['repair', 'invoice', 'service'],
    metadata: {
      order_id: order.order_id,
      order_number: order.order_number,
      customer_id: order.customer_id,
      customer_name: customer.name,
      total: order.total,
    },
    entityLinks: [
      { entityType: 'repair_order', entityId: order.order_id, linkType: 'primary' },
      { entityType: 'customer', entityId: order.customer_id, linkType: 'related' },
    ],
    generatedBy: userId,
    companyInfo: {
      name: 'NXT Level Tech',
    },
  });
  
  const { renderHtmlToPdfBuffer } = await import('@/lib/services/pdf/html-to-pdf');
  const { generateBaseDocument } = await import('@/lib/services/docustore/templates');
  const fullHtml = await generateBaseDocument({
    title: 'Repair Invoice',
    documentNumber: `INV-${order.order_number}`,
    companyName: 'NXT Level Tech',
  }, htmlContent);
  const pdfBuffer = await renderHtmlToPdfBuffer({ html: fullHtml });
  
  return {
    documentId: result.documentId,
    artifactId: result.artifactId,
    pdfBuffer,
  };
}

/**
 * Get customer info for repair order
 */
export async function getCustomerForRepair(customerId: string): Promise<CustomerInfo | null> {
  const result = await query<CustomerInfo>(
    `SELECT id, name, company, email, phone FROM customer WHERE id = $1`,
    [customerId]
  );
  return result.rows[0] || null;
}

/**
 * Generate HTML for repair order
 */
function generateRepairOrderHTML(
  order: RepairOrder,
  items: RepairOrderItem[],
  customer: CustomerInfo
): string {
  const laborCost = (order.labor_hours || 0) * (order.labor_rate || 0);
  
  return `
    <div class="address-section">
      <div class="address-block">
        <div class="address-label">Customer</div>
        <div class="address-content">
          <div class="address-name">${customer.company || customer.name}</div>
          ${customer.company && customer.name !== customer.company 
            ? `<div>Attn: ${customer.name}</div>` 
            : ''}
          ${customer.email ? `<div>${customer.email}</div>` : ''}
          ${customer.phone ? `<div>${customer.phone}</div>` : ''}
        </div>
      </div>
      <div class="address-block">
        <div class="address-label">Equipment Details</div>
        <div class="address-content">
          <div class="address-name">${order.equipment_name}</div>
          ${order.equipment_model ? `<div>Model: ${order.equipment_model}</div>` : ''}
          ${order.equipment_serial ? `<div>S/N: ${order.equipment_serial}</div>` : ''}
        </div>
      </div>
    </div>
    
    <div class="highlight-box">
      <strong>Issue Description:</strong><br>
      ${order.issue_description}
    </div>
    
    ${order.diagnosis ? `
    <div class="highlight-box info">
      <strong>Diagnosis:</strong><br>
      ${order.diagnosis}
    </div>
    ` : ''}
    
    <div style="display: flex; gap: 24px; margin-bottom: 24px;">
      <div><strong>Status:</strong> <span class="status-badge status-${order.status}">${order.status}</span></div>
      <div><strong>Priority:</strong> ${order.priority}</div>
      ${order.estimated_completion_date ? `<div><strong>Est. Completion:</strong> ${formatDate(order.estimated_completion_date)}</div>` : ''}
    </div>
    
    ${items.length > 0 ? `
    <h2>Parts Used</h2>
    <table class="data-table">
      <thead>
        <tr>
          <th style="width: 40%;">Part</th>
          <th style="width: 20%;">Part Number</th>
          <th class="right" style="width: 12%;">Qty</th>
          <th class="right" style="width: 14%;">Unit Cost</th>
          <th class="right" style="width: 14%;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${items.map(item => `
        <tr>
          <td class="item-name">${item.part_name}</td>
          <td>${item.part_number || '-'}</td>
          <td class="right">${item.quantity}</td>
          <td class="right">${formatCurrency(item.unit_cost)}</td>
          <td class="right">${formatCurrency(item.total_cost)}</td>
        </tr>
        `).join('')}
      </tbody>
    </table>
    ` : ''}
    
    <div class="totals-section">
      <table class="totals-table">
        ${items.length > 0 ? `
        <tr>
          <td class="label">Parts Total:</td>
          <td class="value">${formatCurrency(order.parts_total || 0)}</td>
        </tr>
        ` : ''}
        ${order.labor_hours ? `
        <tr>
          <td class="label">Labor (${order.labor_hours}h @ ${formatCurrency(order.labor_rate || 0)}/h):</td>
          <td class="value">${formatCurrency(laborCost)}</td>
        </tr>
        ` : ''}
        <tr>
          <td class="label">Subtotal:</td>
          <td class="value">${formatCurrency(order.subtotal)}</td>
        </tr>
        <tr>
          <td class="label">VAT (15%):</td>
          <td class="value">${formatCurrency(order.total_tax)}</td>
        </tr>
        <tr class="total-row">
          <td class="label">TOTAL:</td>
          <td class="value">${formatCurrency(order.total)}</td>
        </tr>
      </table>
    </div>
    
    ${order.notes ? `
    <div class="notes-section">
      <div class="notes-label">Notes</div>
      <div class="notes-content">${order.notes}</div>
    </div>
    ` : ''}
    
    <div class="signature-section">
      <div class="signature-block">
        <div class="signature-line"></div>
        <div class="signature-label">Customer Signature</div>
      </div>
      <div class="signature-block">
        <div class="signature-line"></div>
        <div class="signature-label">Technician Signature</div>
      </div>
    </div>
  `;
}

/**
 * Generate HTML for repair invoice
 */
function generateRepairInvoiceHTML(
  order: RepairOrder,
  items: RepairOrderItem[],
  customer: CustomerInfo
): string {
  const laborCost = (order.labor_hours || 0) * (order.labor_rate || 0);
  
  return `
    <div class="address-section">
      <div class="address-block">
        <div class="address-label">Bill To</div>
        <div class="address-content">
          <div class="address-name">${customer.company || customer.name}</div>
          ${customer.company && customer.name !== customer.company 
            ? `<div>Attn: ${customer.name}</div>` 
            : ''}
          ${customer.email ? `<div>${customer.email}</div>` : ''}
          ${customer.phone ? `<div>${customer.phone}</div>` : ''}
        </div>
      </div>
      <div class="address-block">
        <div class="address-label">Service Details</div>
        <div class="address-content">
          <div><strong>Repair Order:</strong> ${order.order_number}</div>
          <div><strong>Equipment:</strong> ${order.equipment_name}</div>
          ${order.actual_completion_date ? `<div><strong>Completed:</strong> ${formatDate(order.actual_completion_date)}</div>` : ''}
        </div>
      </div>
    </div>
    
    <h2>Services & Parts</h2>
    <table class="data-table">
      <thead>
        <tr>
          <th style="width: 50%;">Description</th>
          <th class="right" style="width: 15%;">Qty</th>
          <th class="right" style="width: 17%;">Unit Price</th>
          <th class="right" style="width: 18%;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${order.labor_hours ? `
        <tr>
          <td>
            <div class="item-name">Labor - Repair Services</div>
            <div class="item-description">Diagnosis and repair of ${order.equipment_name}</div>
          </td>
          <td class="right">${order.labor_hours} hrs</td>
          <td class="right">${formatCurrency(order.labor_rate || 0)}</td>
          <td class="right">${formatCurrency(laborCost)}</td>
        </tr>
        ` : ''}
        ${items.map(item => `
        <tr>
          <td>
            <div class="item-name">${item.part_name}</div>
            ${item.part_number ? `<div class="item-sku">Part #: ${item.part_number}</div>` : ''}
          </td>
          <td class="right">${item.quantity}</td>
          <td class="right">${formatCurrency(item.unit_cost)}</td>
          <td class="right">${formatCurrency(item.total_cost)}</td>
        </tr>
        `).join('')}
      </tbody>
    </table>
    
    <div class="totals-section">
      <table class="totals-table">
        <tr>
          <td class="label">Subtotal:</td>
          <td class="value">${formatCurrency(order.subtotal)}</td>
        </tr>
        <tr>
          <td class="label">VAT (15%):</td>
          <td class="value">${formatCurrency(order.total_tax)}</td>
        </tr>
        <tr class="total-row">
          <td class="label">TOTAL DUE:</td>
          <td class="value">${formatCurrency(order.total)}</td>
        </tr>
      </table>
    </div>
    
    <div class="highlight-box info" style="margin-top: 32px;">
      <strong>Payment Terms:</strong> Payment due within 30 days of invoice date.
    </div>
  `;
}

