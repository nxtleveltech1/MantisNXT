// UPDATE: [2025-12-25] Created unified Sales PDF service with DocuStore integration

/**
 * Sales PDF Service
 * 
 * Handles PDF generation and DocuStore storage for all sales documents:
 * - Quotations
 * - Sales Invoices
 * - Proforma Invoices
 * - Sales Orders
 * - Credit Notes
 */

import { DocumentGenerator, DOCUMENT_TYPES, type DocumentType } from '@/lib/services/docustore';
import { renderHtmlToPdfBuffer } from '@/lib/services/pdf/html-to-pdf';
import { getPlatformBranding } from '@/lib/services/pdf/platform-branding';
import { renderSalesDocumentHtml, type SalesDocumentTemplateInput, type SalesDocumentKind } from './sales-document-template';
import { query } from '@/lib/database/unified-connection';

// ============================================================================
// Types
// ============================================================================

export interface SalesDocument {
  id: string;
  org_id: string;
  customer_id: string;
  document_number: string;
  reference_number?: string;
  status: string;
  currency: string;
  subtotal: number;
  total_tax: number;
  total: number;
  amount_paid?: number;
  amount_due?: number;
  notes?: string;
  valid_until?: string;
  due_date?: string;
  created_at: string;
  metadata?: Record<string, unknown>;
}

export interface SalesDocumentItem {
  line_number?: number;
  sku?: string;
  name: string;
  description?: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  tax_amount: number;
  subtotal: number;
  total: number;
  metadata?: Record<string, unknown>;
}

export interface CustomerInfo {
  id: string;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  };
}

export interface GenerateSalesPDFInput {
  document: SalesDocument;
  items: SalesDocumentItem[];
  customer: CustomerInfo;
  documentKind: SalesDocumentKind;
  storeInDocuStore?: boolean;
  userId?: string;
}

export interface GenerateSalesPDFResult {
  pdfBuffer: Buffer;
  documentId?: string;
  artifactId?: string;
}

// ============================================================================
// Sales PDF Service
// ============================================================================

export class SalesPDFService {
  /**
   * Generate a sales document PDF and optionally store in DocuStore
   */
  static async generatePDF(input: GenerateSalesPDFInput): Promise<GenerateSalesPDFResult> {
    const branding = await getPlatformBranding();
    
    // Build template input
    const templateInput = this.buildTemplateInput(input, branding);
    
    // Generate HTML
    const html = renderSalesDocumentHtml(templateInput);
    
    // Convert to PDF
    const pdfBuffer = await renderHtmlToPdfBuffer({ html });
    
    // If not storing in DocuStore, return just the buffer
    if (!input.storeInDocuStore) {
      return { pdfBuffer };
    }
    
    // Store in DocuStore
    const documentType = this.getDocumentType(input.documentKind);
    const result = await DocumentGenerator.generate({
      orgId: input.document.org_id,
      documentType,
      title: `${this.getDocumentLabel(input.documentKind)} ${input.document.document_number}`,
      description: `${this.getDocumentLabel(input.documentKind)} for ${input.customer.company || input.customer.name}`,
      documentNumber: input.document.document_number,
      htmlContent: html,
      tags: ['sales', input.documentKind, input.document.status],
      metadata: {
        document_id: input.document.id,
        document_number: input.document.document_number,
        reference_number: input.document.reference_number,
        customer_id: input.customer.id,
        customer_name: input.customer.name,
        total: input.document.total,
        currency: input.document.currency,
        status: input.document.status,
      },
      entityLinks: [
        { entityType: input.documentKind, entityId: input.document.id, linkType: 'primary' },
        { entityType: 'customer', entityId: input.customer.id, linkType: 'related' },
      ],
      generatedBy: input.userId,
      companyInfo: {
        name: 'NXT Level Tech',
      },
    });
    
    return {
      pdfBuffer,
      documentId: result.documentId,
      artifactId: result.artifactId,
    };
  }
  
  /**
   * Generate PDF without base template wrapper (uses sales template directly)
   */
  static async generatePDFRaw(input: GenerateSalesPDFInput): Promise<Buffer> {
    const branding = await getPlatformBranding();
    const templateInput = this.buildTemplateInput(input, branding);
    const html = renderSalesDocumentHtml(templateInput);
    return renderHtmlToPdfBuffer({ html });
  }
  
  /**
   * Build template input from sales document
   */
  private static buildTemplateInput(
    input: GenerateSalesPDFInput,
    branding: { logoDataUri: string; accentHex: string }
  ): SalesDocumentTemplateInput {
    const meta = input.document.metadata;
    const source = meta && typeof meta.source === 'string' ? meta.source : null;
    const salesperson = meta && typeof meta.salesperson === 'string' ? meta.salesperson : null;
    
    return {
      kind: input.documentKind,
      logoDataUri: branding.logoDataUri,
      accentHex: branding.accentHex,
      companyDisplayName: 'NXT Level Tech',
      customer: {
        name: input.customer.name,
        company: input.customer.company || null,
        email: input.customer.email || null,
        phone: input.customer.phone || null,
        addressLines: this.normalizeAddressLines(input.customer.address),
      },
      header: {
        documentNumber: input.document.document_number,
        status: input.document.status,
        currency: input.document.currency,
        issueDate: input.document.created_at,
        dueDate: input.document.due_date || null,
        validUntil: input.document.valid_until || null,
        referenceNumber: input.document.reference_number || null,
        source,
        salesperson,
      },
      items: input.items.map(item => ({
        line_number: item.line_number || null,
        sku: item.sku || null,
        name: item.name,
        description: item.description || null,
        quantity: item.quantity,
        unit_price: item.unit_price,
        tax_rate: item.tax_rate,
        tax_amount: item.tax_amount,
        subtotal: item.subtotal,
        total: item.total,
        metadata: item.metadata || null,
      })),
      totals: {
        subtotal: input.document.subtotal,
        totalTax: input.document.total_tax,
        total: input.document.total,
        amountPaid: input.document.amount_paid,
        amountDue: input.document.amount_due,
      },
      notes: input.document.notes || null,
    };
  }
  
  /**
   * Normalize address to array of lines
   */
  private static normalizeAddressLines(address?: Record<string, string>): string[] | null {
    if (!address) return null;
    
    const parts = [
      address.street,
      address.city,
      address.state,
      address.postal_code,
      address.country,
    ].filter((x): x is string => Boolean(x && x.trim()));
    
    return parts.length > 0 ? parts : null;
  }
  
  /**
   * Get document type for DocuStore
   */
  private static getDocumentType(kind: SalesDocumentKind | string): DocumentType {
    switch (kind) {
      case 'quotation':
        return DOCUMENT_TYPES.QUOTATION;
      case 'invoice':
        return DOCUMENT_TYPES.SALES_INVOICE;
      case 'proforma':
      case 'proforma_invoice':
        return DOCUMENT_TYPES.PROFORMA_INVOICE;
      case 'sales_order':
        return DOCUMENT_TYPES.SALES_ORDER;
      case 'credit_note':
        return DOCUMENT_TYPES.CREDIT_NOTE;
      default:
        return DOCUMENT_TYPES.SALES_INVOICE;
    }
  }
  
  /**
   * Get human-readable label for document kind
   */
  private static getDocumentLabel(kind: SalesDocumentKind | string): string {
    switch (kind) {
      case 'quotation':
        return 'Quotation';
      case 'invoice':
        return 'Invoice';
      case 'proforma':
      case 'proforma_invoice':
        return 'Proforma Invoice';
      case 'sales_order':
        return 'Sales Order';
      case 'credit_note':
        return 'Credit Note';
      default:
        return 'Document';
    }
  }
  
  /**
   * Get customer info from database
   */
  static async getCustomerInfo(orgId: string, customerId: string): Promise<CustomerInfo | null> {
    const result = await query<{
      id: string;
      name: string;
      company: string | null;
      email: string | null;
      phone: string | null;
      address: Record<string, string> | null;
    }>(
      `SELECT id, name, company, email, phone, address
       FROM customers.customers
       WHERE id = $1 AND org_id = $2`,
      [customerId, orgId]
    );
    
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    return {
      id: row.id,
      name: row.name,
      company: row.company || undefined,
      email: row.email || undefined,
      phone: row.phone || undefined,
      address: row.address || undefined,
    };
  }
}

