/**
 * Integrations PDF Service
 * 
 * Handles PDF generation and DocuStore storage for integration documents:
 * - Sync Reports
 * - Integration Logs
 */

import { DocumentGenerator, DOCUMENT_TYPES } from '@/lib/services/docustore';
import { renderHtmlToPdfBuffer } from '@/lib/services/pdf/html-to-pdf';
import { getPlatformBranding } from '@/lib/services/pdf/platform-branding';
import { query } from '@/lib/database';

export interface IntegrationDocument {
  id: string;
  org_id: string;
  integration_type: string;
  status: string;
  sync_date: string;
  records_synced: number;
  errors: number;
  created_at: string;
  metadata?: Record<string, unknown>;
}

export interface GenerateIntegrationsPDFResult {
  pdfBuffer: Buffer;
  documentId?: string;
  artifactId?: string;
}

export class IntegrationsPDFService {
  /**
   * Generate Sync Report PDF
   */
  static async generateSyncReportPDF(
    syncId: string,
    orgId: string,
    userId?: string
  ): Promise<GenerateIntegrationsPDFResult> {
    // TODO: Fetch sync data
    const branding = await getPlatformBranding();
    const html = this.generateSyncReportHTML({ id: syncId }, branding);
    const pdfBuffer = await renderHtmlToPdfBuffer({ html });

    const result = await DocumentGenerator.generate({
      documentType: DOCUMENT_TYPES.SYNC_REPORT,
      entityType: 'sync',
      entityId: syncId,
      orgId,
      userId,
      file: pdfBuffer,
      filename: `sync-report-${syncId}.pdf`,
      mimeType: 'application/pdf',
    });

    return {
      pdfBuffer,
      documentId: result.document.id,
      artifactId: result.artifact?.id,
    };
  }

  /**
   * Generate Integration Log PDF
   */
  static async generateIntegrationLogPDF(
    logId: string,
    orgId: string,
    userId?: string
  ): Promise<GenerateIntegrationsPDFResult> {
    // TODO: Fetch integration log data
    const branding = await getPlatformBranding();
    const html = this.generateIntegrationLogHTML({ id: logId }, branding);
    const pdfBuffer = await renderHtmlToPdfBuffer({ html });

    const result = await DocumentGenerator.generate({
      documentType: DOCUMENT_TYPES.INTEGRATION_LOG,
      entityType: 'integration_log',
      entityId: logId,
      orgId,
      userId,
      file: pdfBuffer,
      filename: `integration-log-${logId}.pdf`,
      mimeType: 'application/pdf',
    });

    return {
      pdfBuffer,
      documentId: result.document.id,
      artifactId: result.artifact?.id,
    };
  }

  private static generateSyncReportHTML(sync: { id: string }, branding: any): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Sync Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; }
            .header { text-align: center; margin-bottom: 40px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
            th { background-color: #f5f5f5; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${branding.name || 'Sync Report'}</h1>
            <p>Sync ID: ${sync.id}</p>
            <p>Generated: ${new Date().toLocaleDateString()}</p>
          </div>
        </body>
      </html>
    `;
  }

  private static generateIntegrationLogHTML(log: { id: string }, branding: any): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Integration Log</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; }
            .header { text-align: center; margin-bottom: 40px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${branding.name || 'Integration Log'}</h1>
            <p>Log ID: ${log.id}</p>
          </div>
        </body>
      </html>
    `;
  }
}

