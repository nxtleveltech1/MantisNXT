// UPDATE: [2025-12-25] Created QuotationPDFService for generating and storing quotation documents

/**
 * Quotation PDF Generation Service
 * 
 * Generates PDF documents for quotations and stores them in DocuStore
 * with proper entity links
 */

import { DocumentService } from './document-service';
import { StorageFactory, DatabaseStorage } from '@/lib/docustore/storage';
import { query } from '@/lib/database';
import { renderHtmlToPdfBuffer } from '@/lib/services/pdf/html-to-pdf';
import { v4 as uuidv4 } from 'uuid';
import type { DocumentArtifact } from './types';

interface QuotationItem {
  name: string;
  description?: string;
  sku?: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  tax_amount: number;
  subtotal: number;
  total: number;
  is_delivery?: boolean;
}

interface QuotationData {
  id: string;
  document_number: string;
  reference_number?: string;
  status: string;
  customer: {
    id: string;
    name: string;
    company?: string;
    email?: string;
    phone?: string;
  };
  items: QuotationItem[];
  subtotal: number;
  total_tax: number;
  total: number;
  currency: string;
  valid_until?: string;
  notes?: string;
  delivery_options?: {
    delivery_address?: Record<string, unknown>;
    delivery_contact_name?: string;
    delivery_contact_phone?: string;
    delivery_cost?: number;
    service_tier?: string;
  };
  created_at: string;
  org_name?: string;
  org_address?: string;
  org_phone?: string;
  org_email?: string;
}

export class QuotationPDFService {
  /**
   * Generate and store a quotation PDF in DocuStore
   */
  static async generateQuotationPDF(
    quotationData: QuotationData,
    orgId: string,
    generatedBy?: string
  ): Promise<{ documentId: string; artifactId: string }> {
    // Generate PDF HTML content
    const html = this.generateQuotationHTML(quotationData);
    
    // Convert HTML to PDF
    const pdfBuffer = await renderHtmlToPdfBuffer({ html });

    // Create document in DocuStore
    const document = await DocumentService.createDocument({
      org_id: orgId,
      title: `Quotation ${quotationData.document_number}`,
      description: `Quotation for ${quotationData.customer.company || quotationData.customer.name}`,
      document_type: 'quotation',
      tags: ['quotation', 'sales', quotationData.status],
      metadata: {
        quotation_id: quotationData.id,
        document_number: quotationData.document_number,
        reference_number: quotationData.reference_number,
        customer_id: quotationData.customer.id,
        customer_name: quotationData.customer.name,
        total: quotationData.total,
        currency: quotationData.currency,
        valid_until: quotationData.valid_until,
      },
      created_by: generatedBy,
    });

    // Store PDF as artifact
    const storage = StorageFactory.getDefault();
    const filename = `quotation-${quotationData.document_number}-${Date.now()}.pdf`;
    const storeResult = await storage.store(
      document.id,
      'artifact',
      filename,
      pdfBuffer,
      'application/pdf'
    );

    if (!storeResult.success || !storeResult.path) {
      throw new Error(`Failed to store PDF: ${storeResult.error || 'Unknown error'}`);
    }

    // Get file metadata
    const fileMetadata = await storage.getMetadata(storeResult.path);
    if (!fileMetadata) {
      throw new Error('Failed to retrieve PDF metadata');
    }

    // Create artifact record
    const artifactId = uuidv4();
    const storageProvider = (process.env.DOCUSTORE_STORAGE_PROVIDER as string) || 'database';
    const finalStoragePath = storageProvider === 'database'
      ? `db://artifact/${artifactId}`
      : storeResult.path;

    const artifactResult = await query<DocumentArtifact>(
      `INSERT INTO docustore.document_artifacts (
        id, document_id, artifact_type, storage_path, storage_provider,
        filename, mime_type, file_size, checksum_sha256, metadata, generated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        artifactId,
        document.id,
        'quotation_pdf',
        finalStoragePath,
        storageProvider,
        filename,
        'application/pdf',
        fileMetadata.size,
        fileMetadata.checksum || null,
        JSON.stringify({
          generated_at: new Date().toISOString(),
          document_number: quotationData.document_number,
          total: quotationData.total,
        }),
        generatedBy || null,
      ]
    );

    // If using database storage, persist content
    if (storageProvider === 'database' && storage instanceof DatabaseStorage) {
      await (storage as DatabaseStorage).persistContent(artifactId, 'artifact', pdfBuffer);
    }

    // Create links to quotation and customer
    await DocumentService.createLink({
      document_id: document.id,
      entity_type: 'quotation',
      entity_id: quotationData.id,
      link_type: 'primary',
      created_by: generatedBy,
    });

    await DocumentService.createLink({
      document_id: document.id,
      entity_type: 'customer',
      entity_id: quotationData.customer.id,
      link_type: 'related',
      created_by: generatedBy,
    });

    // Log PDF generation event
    await query(
      `SELECT docustore.log_document_event($1, 'pdf_generated', $2, $3::jsonb)`,
      [
        document.id,
        generatedBy || null,
        JSON.stringify({ artifact_id: artifactId, artifact_type: 'quotation_pdf' }),
      ]
    );

    return {
      documentId: document.id,
      artifactId,
    };
  }

  /**
   * Generate HTML content for quotation PDF
   */
  private static generateQuotationHTML(quotation: QuotationData): string {
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('en-ZA', {
        style: 'currency',
        currency: quotation.currency || 'ZAR',
      }).format(amount);
    };

    const productItems = quotation.items.filter(item => !item.is_delivery);
    const deliveryItem = quotation.items.find(item => item.is_delivery);

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Quotation ${quotation.document_number}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.5;
      color: #1a1a1a;
      padding: 40px;
      background: white;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 3px solid #2563eb;
    }
    .company-info {
      flex: 1;
    }
    .company-name {
      font-size: 24pt;
      font-weight: bold;
      color: #2563eb;
      margin-bottom: 8px;
    }
    .company-details {
      font-size: 9pt;
      color: #666;
    }
    .document-info {
      text-align: right;
    }
    .document-title {
      font-size: 28pt;
      font-weight: bold;
      color: #1a1a1a;
      margin-bottom: 10px;
    }
    .document-number {
      font-size: 14pt;
      font-weight: 600;
      color: #2563eb;
    }
    .document-meta {
      font-size: 9pt;
      color: #666;
      margin-top: 10px;
    }
    .addresses {
      display: flex;
      justify-content: space-between;
      margin-bottom: 30px;
    }
    .address-block {
      flex: 1;
      max-width: 45%;
    }
    .address-label {
      font-size: 9pt;
      font-weight: 600;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }
    .address-content {
      background: #f8fafc;
      padding: 15px;
      border-radius: 6px;
      border-left: 3px solid #2563eb;
    }
    .customer-name {
      font-weight: 600;
      font-size: 12pt;
      margin-bottom: 5px;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    .items-table th {
      background: #2563eb;
      color: white;
      font-weight: 600;
      font-size: 9pt;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 12px 10px;
      text-align: left;
    }
    .items-table th.number {
      text-align: right;
    }
    .items-table td {
      padding: 12px 10px;
      border-bottom: 1px solid #e5e7eb;
      vertical-align: top;
    }
    .items-table td.number {
      text-align: right;
      font-variant-numeric: tabular-nums;
    }
    .items-table tr:nth-child(even) {
      background: #f9fafb;
    }
    .items-table .item-name {
      font-weight: 500;
    }
    .items-table .item-sku {
      font-size: 9pt;
      color: #666;
    }
    .items-table .item-description {
      font-size: 9pt;
      color: #666;
      margin-top: 3px;
    }
    .items-table .delivery-row {
      background: #eff6ff !important;
    }
    .items-table .delivery-row td {
      border-top: 2px solid #2563eb;
    }
    .totals-section {
      display: flex;
      justify-content: flex-end;
    }
    .totals-table {
      width: 300px;
    }
    .totals-table td {
      padding: 8px 12px;
    }
    .totals-table .label {
      text-align: left;
      color: #666;
    }
    .totals-table .value {
      text-align: right;
      font-variant-numeric: tabular-nums;
    }
    .totals-table .total-row {
      font-size: 14pt;
      font-weight: bold;
      border-top: 2px solid #1a1a1a;
    }
    .totals-table .total-row .value {
      color: #2563eb;
    }
    .notes-section {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
    }
    .notes-label {
      font-size: 9pt;
      font-weight: 600;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }
    .notes-content {
      background: #f8fafc;
      padding: 15px;
      border-radius: 6px;
      font-size: 10pt;
    }
    .footer {
      margin-top: 60px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      font-size: 9pt;
      color: #666;
    }
    .validity {
      display: inline-block;
      background: #fef3c7;
      color: #92400e;
      padding: 8px 16px;
      border-radius: 20px;
      font-weight: 500;
      margin-bottom: 10px;
    }
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 9pt;
      font-weight: 600;
      text-transform: uppercase;
    }
    .status-draft { background: #e5e7eb; color: #374151; }
    .status-sent { background: #dbeafe; color: #1d4ed8; }
    .status-accepted { background: #d1fae5; color: #059669; }
    .status-rejected { background: #fee2e2; color: #dc2626; }
    .status-expired { background: #f3f4f6; color: #6b7280; }
  </style>
</head>
<body>
  <div class="header">
    <div class="company-info">
      <div class="company-name">${quotation.org_name || 'Your Company'}</div>
      <div class="company-details">
        ${quotation.org_address ? `<div>${quotation.org_address}</div>` : ''}
        ${quotation.org_phone ? `<div>Tel: ${quotation.org_phone}</div>` : ''}
        ${quotation.org_email ? `<div>Email: ${quotation.org_email}</div>` : ''}
      </div>
    </div>
    <div class="document-info">
      <div class="document-title">QUOTATION</div>
      <div class="document-number">${quotation.document_number}</div>
      ${quotation.reference_number ? `<div class="document-meta">Ref: ${quotation.reference_number}</div>` : ''}
      <div class="document-meta">
        Date: ${new Date(quotation.created_at).toLocaleDateString('en-ZA', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}
      </div>
      <div style="margin-top: 10px;">
        <span class="status-badge status-${quotation.status}">${quotation.status}</span>
      </div>
    </div>
  </div>

  <div class="addresses">
    <div class="address-block">
      <div class="address-label">Quote To</div>
      <div class="address-content">
        <div class="customer-name">${quotation.customer.company || quotation.customer.name}</div>
        ${quotation.customer.company && quotation.customer.name !== quotation.customer.company 
          ? `<div>Attn: ${quotation.customer.name}</div>` 
          : ''}
        ${quotation.customer.email ? `<div>${quotation.customer.email}</div>` : ''}
        ${quotation.customer.phone ? `<div>${quotation.customer.phone}</div>` : ''}
      </div>
    </div>
    ${quotation.delivery_options?.delivery_address ? `
    <div class="address-block">
      <div class="address-label">Delivery To</div>
      <div class="address-content">
        ${quotation.delivery_options.delivery_contact_name 
          ? `<div class="customer-name">${quotation.delivery_options.delivery_contact_name}</div>` 
          : ''}
        <div>${JSON.stringify(quotation.delivery_options.delivery_address).replace(/[{}"]/g, '').replace(/,/g, ', ')}</div>
        ${quotation.delivery_options.delivery_contact_phone 
          ? `<div>${quotation.delivery_options.delivery_contact_phone}</div>` 
          : ''}
      </div>
    </div>
    ` : ''}
  </div>

  ${quotation.valid_until ? `
  <div style="margin-bottom: 20px; text-align: center;">
    <span class="validity">
      Valid until: ${new Date(quotation.valid_until).toLocaleDateString('en-ZA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })}
    </span>
  </div>
  ` : ''}

  <table class="items-table">
    <thead>
      <tr>
        <th style="width: 40%;">Description</th>
        <th class="number" style="width: 12%;">Qty</th>
        <th class="number" style="width: 16%;">Unit Price</th>
        <th class="number" style="width: 16%;">VAT</th>
        <th class="number" style="width: 16%;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${productItems.map(item => `
      <tr>
        <td>
          <div class="item-name">${item.name}</div>
          ${item.sku ? `<div class="item-sku">SKU: ${item.sku}</div>` : ''}
          ${item.description ? `<div class="item-description">${item.description}</div>` : ''}
        </td>
        <td class="number">${item.quantity}</td>
        <td class="number">${formatCurrency(item.unit_price)}</td>
        <td class="number">${formatCurrency(item.tax_amount)}</td>
        <td class="number">${formatCurrency(item.total)}</td>
      </tr>
      `).join('')}
      ${deliveryItem ? `
      <tr class="delivery-row">
        <td>
          <div class="item-name">🚚 ${deliveryItem.name}</div>
          ${deliveryItem.description ? `<div class="item-description">${deliveryItem.description}</div>` : ''}
        </td>
        <td class="number">${deliveryItem.quantity}</td>
        <td class="number">${formatCurrency(deliveryItem.unit_price)}</td>
        <td class="number">${formatCurrency(deliveryItem.tax_amount)}</td>
        <td class="number">${formatCurrency(deliveryItem.total)}</td>
      </tr>
      ` : ''}
    </tbody>
  </table>

  <div class="totals-section">
    <table class="totals-table">
      <tr>
        <td class="label">Subtotal:</td>
        <td class="value">${formatCurrency(quotation.subtotal)}</td>
      </tr>
      <tr>
        <td class="label">VAT (15%):</td>
        <td class="value">${formatCurrency(quotation.total_tax)}</td>
      </tr>
      <tr class="total-row">
        <td class="label">TOTAL:</td>
        <td class="value">${formatCurrency(quotation.total)}</td>
      </tr>
    </table>
  </div>

  ${quotation.notes ? `
  <div class="notes-section">
    <div class="notes-label">Notes & Terms</div>
    <div class="notes-content">${quotation.notes.replace(/\n/g, '<br>')}</div>
  </div>
  ` : ''}

  <div class="footer">
    <p>Thank you for your business!</p>
    <p style="margin-top: 10px; font-size: 8pt;">
      Document generated on ${new Date().toLocaleString('en-ZA')}
    </p>
  </div>
</body>
</html>
    `.trim();

    return html;
  }

  /**
   * Get quotation data formatted for PDF generation
   */
  static async getQuotationForPDF(quotationId: string): Promise<QuotationData | null> {
    // Fetch quotation with related data
    const result = await query<QuotationData>(
      `SELECT 
        q.id,
        q.document_number,
        q.reference_number,
        q.status,
        q.subtotal,
        q.total_tax,
        q.total,
        q.currency,
        q.valid_until,
        q.notes,
        q.created_at,
        jsonb_build_object(
          'id', c.id,
          'name', c.name,
          'company', c.company,
          'email', c.email,
          'phone', c.phone
        ) as customer,
        COALESCE(
          (SELECT json_agg(
            jsonb_build_object(
              'name', qi.name,
              'description', qi.description,
              'sku', qi.sku,
              'quantity', qi.quantity,
              'unit_price', qi.unit_price,
              'tax_rate', qi.tax_rate,
              'tax_amount', qi.tax_amount,
              'subtotal', qi.subtotal,
              'total', qi.total
            ) ORDER BY qi.line_number
          ) FROM quotation_items qi WHERE qi.quotation_id = q.id),
          '[]'::json
        ) as items,
        (SELECT jsonb_build_object(
          'delivery_address', qdo.delivery_address,
          'delivery_contact_name', qdo.delivery_contact_name,
          'delivery_contact_phone', qdo.delivery_contact_phone,
          'delivery_cost', qdo.delivery_cost,
          'service_tier', qdo.service_tier_id
        ) FROM quotation_delivery_options qdo WHERE qdo.quotation_id = q.id) as delivery_options,
        o.name as org_name,
        o.address as org_address,
        o.phone as org_phone,
        o.email as org_email
      FROM quotations q
      LEFT JOIN customers c ON c.id = q.customer_id
      LEFT JOIN organization o ON o.id = q.org_id
      WHERE q.id = $1`,
      [quotationId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  }
}

