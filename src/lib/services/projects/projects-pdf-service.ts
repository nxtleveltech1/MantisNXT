/**
 * Projects PDF Service
 * 
 * Handles PDF generation and DocuStore storage for project documents:
 * - Project Reports
 * - Timesheet Reports
 * - Milestone Reports
 */

import { DocumentGenerator, DOCUMENT_TYPES } from '@/lib/services/docustore';
import { renderHtmlToPdfBuffer } from '@/lib/services/pdf/html-to-pdf';
import { getPlatformBranding } from '@/lib/services/pdf/platform-branding';
import { query } from '@/lib/database';

export interface ProjectDocument {
  id: string;
  org_id: string;
  project_name: string;
  status: string;
  start_date: string;
  end_date?: string;
  budget: number;
  actual_cost: number;
  created_at: string;
  metadata?: Record<string, unknown>;
}

export interface GenerateProjectsPDFResult {
  pdfBuffer: Buffer;
  documentId?: string;
  artifactId?: string;
}

export class ProjectsPDFService {
  /**
   * Generate Project Report PDF
   */
  static async generateProjectReportPDF(
    projectId: string,
    orgId: string,
    userId?: string
  ): Promise<GenerateProjectsPDFResult> {
    // TODO: Fetch project data
    const branding = await getPlatformBranding();
    const html = this.generateProjectReportHTML({ id: projectId }, branding);
    const pdfBuffer = await renderHtmlToPdfBuffer({ html });

    const result = await DocumentGenerator.generate({
      documentType: DOCUMENT_TYPES.PROJECT_REPORT,
      entityType: 'project',
      entityId: projectId,
      orgId,
      userId,
      file: pdfBuffer,
      filename: `project-report-${projectId}.pdf`,
      mimeType: 'application/pdf',
    });

    return {
      pdfBuffer,
      documentId: result.document.id,
      artifactId: result.artifact?.id,
    };
  }

  /**
   * Generate Timesheet Report PDF
   */
  static async generateTimesheetReportPDF(
    timesheetId: string,
    orgId: string,
    userId?: string
  ): Promise<GenerateProjectsPDFResult> {
    // TODO: Fetch timesheet data
    const branding = await getPlatformBranding();
    const html = this.generateTimesheetReportHTML({ id: timesheetId }, branding);
    const pdfBuffer = await renderHtmlToPdfBuffer({ html });

    const result = await DocumentGenerator.generate({
      documentType: DOCUMENT_TYPES.TIMESHEET_REPORT,
      entityType: 'timesheet',
      entityId: timesheetId,
      orgId,
      userId,
      file: pdfBuffer,
      filename: `timesheet-report-${timesheetId}.pdf`,
      mimeType: 'application/pdf',
    });

    return {
      pdfBuffer,
      documentId: result.document.id,
      artifactId: result.artifact?.id,
    };
  }

  /**
   * Generate Milestone Report PDF
   */
  static async generateMilestoneReportPDF(
    milestoneId: string,
    orgId: string,
    userId?: string
  ): Promise<GenerateProjectsPDFResult> {
    // TODO: Fetch milestone data
    const branding = await getPlatformBranding();
    const html = this.generateMilestoneReportHTML({ id: milestoneId }, branding);
    const pdfBuffer = await renderHtmlToPdfBuffer({ html });

    const result = await DocumentGenerator.generate({
      documentType: DOCUMENT_TYPES.MILESTONE_REPORT,
      entityType: 'milestone',
      entityId: milestoneId,
      orgId,
      userId,
      file: pdfBuffer,
      filename: `milestone-report-${milestoneId}.pdf`,
      mimeType: 'application/pdf',
    });

    return {
      pdfBuffer,
      documentId: result.document.id,
      artifactId: result.artifact?.id,
    };
  }

  private static generateProjectReportHTML(project: { id: string }, branding: any): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Project Report</title>
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
            <h1>${branding.name || 'Project Report'}</h1>
            <p>Project ID: ${project.id}</p>
          </div>
        </body>
      </html>
    `;
  }

  private static generateTimesheetReportHTML(timesheet: { id: string }, branding: any): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Timesheet Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; }
            .header { text-align: center; margin-bottom: 40px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${branding.name || 'Timesheet Report'}</h1>
            <p>Timesheet ID: ${timesheet.id}</p>
          </div>
        </body>
      </html>
    `;
  }

  private static generateMilestoneReportHTML(milestone: { id: string }, branding: any): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Milestone Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; }
            .header { text-align: center; margin-bottom: 40px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${branding.name || 'Milestone Report'}</h1>
            <p>Milestone ID: ${milestone.id}</p>
          </div>
        </body>
      </html>
    `;
  }
}

