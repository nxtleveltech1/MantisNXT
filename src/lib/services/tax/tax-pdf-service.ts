/**
 * Tax PDF Service
 * 
 * Handles PDF generation and DocuStore storage for tax documents:
 * - Tax Returns
 * - Tax Reports
 * - VAT Reconciliation Reports
 */

import { DocumentGenerator, DOCUMENT_TYPES } from '@/lib/services/docustore';
import { renderHtmlToPdfBuffer } from '@/lib/services/pdf/html-to-pdf';
import { getPlatformBranding } from '@/lib/services/pdf/platform-branding';
import { query } from '@/lib/database';

export interface TaxDocument {
  id: string;
  org_id: string;
  tax_period: string;
  tax_type: 'vat' | 'income' | 'payroll' | 'other';
  status: string;
  total_amount: number;
  tax_amount: number;
  created_at: string;
  metadata?: Record<string, unknown>;
}

export interface GenerateTaxPDFInput {
  document: TaxDocument;
  storeInDocuStore?: boolean;
  userId?: string;
}

export interface GenerateTaxPDFResult {
  pdfBuffer: Buffer;
  documentId?: string;
  artifactId?: string;
}

export class TaxPDFService {
  /**
   * Generate Tax Return PDF
   */
  static async generateTaxReturnPDF(
    taxReturnId: string,
    orgId: string,
    userId?: string
  ): Promise<GenerateTaxPDFResult> {
    // Fetch tax return data
    const taxResult = await query<TaxDocument>(
      `SELECT * FROM tax_returns WHERE id = $1 AND org_id = $2`,
      [taxReturnId, orgId]
    );

    if (taxResult.rows.length === 0) {
      throw new Error('Tax return not found');
    }

    const taxReturn = taxResult.rows[0];
    const branding = await getPlatformBranding();

    // Generate HTML
    const html = this.generateTaxReturnHTML(taxReturn, branding);

    // Convert to PDF
    const pdfBuffer = await renderHtmlToPdfBuffer({ html });

    // Store in DocuStore if requested
    if (true) { // Always store
      const result = await DocumentGenerator.generate({
        documentType: DOCUMENT_TYPES.TAX_RETURN,
        entityType: 'tax_return',
        entityId: taxReturnId,
        orgId,
        userId,
        file: pdfBuffer,
        filename: `tax-return-${taxReturn.tax_period}.pdf`,
        mimeType: 'application/pdf',
        metadata: {
          tax_period: taxReturn.tax_period,
          tax_type: taxReturn.tax_type,
          total_amount: taxReturn.total_amount,
        },
      });

      return {
        pdfBuffer,
        documentId: result.document.id,
        artifactId: result.artifact?.id,
      };
    }

    return { pdfBuffer };
  }

  /**
   * Generate Tax Report PDF
   */
  static async generateTaxReportPDF(
    reportId: string,
    orgId: string,
    userId?: string
  ): Promise<GenerateTaxPDFResult> {
    // TODO: Fetch tax report data
    const branding = await getPlatformBranding();
    const html = this.generateTaxReportHTML({ id: reportId }, branding);
    const pdfBuffer = await renderHtmlToPdfBuffer({ html });

    const result = await DocumentGenerator.generate({
      documentType: DOCUMENT_TYPES.TAX_REPORT,
      entityType: 'tax_report',
      entityId: reportId,
      orgId,
      userId,
      file: pdfBuffer,
      filename: `tax-report-${Date.now()}.pdf`,
      mimeType: 'application/pdf',
    });

    return {
      pdfBuffer,
      documentId: result.document.id,
      artifactId: result.artifact?.id,
    };
  }

  /**
   * Generate VAT Reconciliation PDF
   */
  static async generateVATReconciliationPDF(
    reconciliationId: string,
    orgId: string,
    userId?: string
  ): Promise<GenerateTaxPDFResult> {
    // TODO: Fetch VAT reconciliation data
    const branding = await getPlatformBranding();
    const html = this.generateVATReconciliationHTML({ id: reconciliationId }, branding);
    const pdfBuffer = await renderHtmlToPdfBuffer({ html });

    const result = await DocumentGenerator.generate({
      documentType: DOCUMENT_TYPES.VAT_RECONCILIATION,
      entityType: 'vat_reconciliation',
      entityId: reconciliationId,
      orgId,
      userId,
      file: pdfBuffer,
      filename: `vat-reconciliation-${Date.now()}.pdf`,
      mimeType: 'application/pdf',
    });

    return {
      pdfBuffer,
      documentId: result.document.id,
      artifactId: result.artifact?.id,
    };
  }

  private static generateTaxReturnHTML(taxReturn: TaxDocument, branding: any): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Tax Return - ${taxReturn.tax_period}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; }
            .header { text-align: center; margin-bottom: 40px; }
            .section { margin-bottom: 30px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
            th { background-color: #f5f5f5; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${branding.name || 'Tax Return'}</h1>
            <p>Tax Period: ${taxReturn.tax_period}</p>
          </div>
          <div class="section">
            <h2>Tax Return Details</h2>
            <table>
              <tr><th>Tax Type</th><td>${taxReturn.tax_type.toUpperCase()}</td></tr>
              <tr><th>Total Amount</th><td>${taxReturn.total_amount.toFixed(2)}</td></tr>
              <tr><th>Tax Amount</th><td>${taxReturn.tax_amount.toFixed(2)}</td></tr>
              <tr><th>Status</th><td>${taxReturn.status}</td></tr>
            </table>
          </div>
        </body>
      </html>
    `;
  }

  private static generateTaxReportHTML(report: { id: string }, branding: any): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Tax Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; }
            .header { text-align: center; margin-bottom: 40px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${branding.name || 'Tax Report'}</h1>
            <p>Report ID: ${report.id}</p>
          </div>
        </body>
      </html>
    `;
  }

  private static generateVATReconciliationHTML(reconciliation: { id: string }, branding: any): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>VAT Reconciliation</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; }
            .header { text-align: center; margin-bottom: 40px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${branding.name || 'VAT Reconciliation'}</h1>
            <p>Reconciliation ID: ${reconciliation.id}</p>
          </div>
        </body>
      </html>
    `;
  }
}

