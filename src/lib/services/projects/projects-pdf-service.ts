/**
 * Projects PDF Service
 * 
 * Handles PDF generation and DocuStore storage for project documents:
 * - Project Reports
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
    const projectResult = await query<{
      project_id: string;
      org_id: string;
      name: string;
      description: string | null;
      status: string;
      start_date: string | null;
      target_date: string | null;
      completed_at: string | null;
    }>(
      `
      SELECT project_id, org_id, name, description, status, start_date, target_date, completed_at
      FROM core.pm_project
      WHERE org_id = $1 AND project_id = $2
      `,
      [orgId, projectId]
    );

    if (projectResult.rows.length === 0) {
      throw new Error('Project not found');
    }

    const taskResult = await query(
      `
      SELECT t.task_id, t.title, t.priority, t.due_date, t.completed_at,
             s.name AS status_name, s.status_type
      FROM core.pm_task t
      LEFT JOIN core.pm_status s ON s.status_id = t.status_id
      WHERE t.org_id = $1 AND t.project_id = $2
      ORDER BY t.created_at ASC
      `,
      [orgId, projectId]
    );

    const milestoneResult = await query(
      `
      SELECT milestone_id, name, due_date, status, completed_at
      FROM core.pm_milestone
      WHERE org_id = $1 AND project_id = $2
      ORDER BY due_date NULLS LAST
      `,
      [orgId, projectId]
    );

    const branding = await getPlatformBranding();
    const html = this.generateProjectReportHTML(
      projectResult.rows[0],
      taskResult.rows,
      milestoneResult.rows,
      branding
    );
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
   * Generate Milestone Report PDF
   */
  static async generateMilestoneReportPDF(
    milestoneId: string,
    orgId: string,
    userId?: string
  ): Promise<GenerateProjectsPDFResult> {
    const milestoneResult = await query<{
      milestone_id: string;
      project_id: string;
      name: string;
      description: string | null;
      due_date: string | null;
      status: string;
      completed_at: string | null;
    }>(
      `
      SELECT milestone_id, project_id, name, description, due_date, status, completed_at
      FROM core.pm_milestone
      WHERE org_id = $1 AND milestone_id = $2
      `,
      [orgId, milestoneId]
    );

    if (milestoneResult.rows.length === 0) {
      throw new Error('Milestone not found');
    }

    const taskResult = await query(
      `
      SELECT t.task_id, t.title, t.priority, t.due_date, t.completed_at,
             s.name AS status_name, s.status_type
      FROM core.pm_task t
      LEFT JOIN core.pm_status s ON s.status_id = t.status_id
      WHERE t.org_id = $1 AND t.milestone_id = $2
      ORDER BY t.created_at ASC
      `,
      [orgId, milestoneId]
    );

    const branding = await getPlatformBranding();
    const html = this.generateMilestoneReportHTML(milestoneResult.rows[0], taskResult.rows, branding);
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

  private static generateProjectReportHTML(
    project: {
      project_id: string;
      name: string;
      description: string | null;
      status: string;
      start_date: string | null;
      target_date: string | null;
      completed_at: string | null;
    },
    tasks: Array<{
      task_id: string;
      title: string;
      priority: string | null;
      due_date: string | null;
      completed_at: string | null;
      status_name: string | null;
      status_type: string | null;
    }>,
    milestones: Array<{
      milestone_id: string;
      name: string;
      due_date: string | null;
      status: string;
      completed_at: string | null;
    }>,
    branding: any
  ): string {
    const taskRows = tasks
      .map(
        task => `
        <tr>
          <td>${task.title}</td>
          <td>${task.status_name || '-'}</td>
          <td>${task.priority || '-'}</td>
          <td>${task.due_date ? new Date(task.due_date).toLocaleDateString() : '-'}</td>
          <td>${task.completed_at ? 'Yes' : 'No'}</td>
        </tr>
      `
      )
      .join('');

    const milestoneRows = milestones
      .map(
        milestone => `
        <tr>
          <td>${milestone.name}</td>
          <td>${milestone.status}</td>
          <td>${milestone.due_date ? new Date(milestone.due_date).toLocaleDateString() : '-'}</td>
          <td>${milestone.completed_at ? 'Yes' : 'No'}</td>
        </tr>
      `
      )
      .join('');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Project Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; }
            .header { text-align: center; margin-bottom: 40px; }
            .section { margin-top: 30px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
            th { background-color: #f5f5f5; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${branding.name || 'Project Report'}</h1>
            <p>${project.name}</p>
            <p>Status: ${project.status}</p>
            <p>Start: ${project.start_date ? new Date(project.start_date).toLocaleDateString() : '-'}</p>
            <p>Target: ${project.target_date ? new Date(project.target_date).toLocaleDateString() : '-'}</p>
          </div>
          <div class="section">
            <h2>Tasks</h2>
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Due</th>
                  <th>Done</th>
                </tr>
              </thead>
              <tbody>
                ${taskRows || '<tr><td colspan=\"5\">No tasks</td></tr>'}
              </tbody>
            </table>
          </div>
          <div class="section">
            <h2>Milestones</h2>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Due</th>
                  <th>Completed</th>
                </tr>
              </thead>
              <tbody>
                ${milestoneRows || '<tr><td colspan=\"4\">No milestones</td></tr>'}
              </tbody>
            </table>
          </div>
        </body>
      </html>
    `;
  }

  private static generateMilestoneReportHTML(
    milestone: {
      milestone_id: string;
      name: string;
      description: string | null;
      due_date: string | null;
      status: string;
      completed_at: string | null;
    },
    tasks: Array<{
      task_id: string;
      title: string;
      priority: string | null;
      due_date: string | null;
      completed_at: string | null;
      status_name: string | null;
      status_type: string | null;
    }>,
    branding: any
  ): string {
    const taskRows = tasks
      .map(
        task => `
        <tr>
          <td>${task.title}</td>
          <td>${task.status_name || '-'}</td>
          <td>${task.priority || '-'}</td>
          <td>${task.due_date ? new Date(task.due_date).toLocaleDateString() : '-'}</td>
          <td>${task.completed_at ? 'Yes' : 'No'}</td>
        </tr>
      `
      )
      .join('');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Milestone Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; }
            .header { text-align: center; margin-bottom: 40px; }
            .section { margin-top: 30px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
            th { background-color: #f5f5f5; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${branding.name || 'Milestone Report'}</h1>
            <p>${milestone.name}</p>
            <p>Status: ${milestone.status}</p>
            <p>Due: ${milestone.due_date ? new Date(milestone.due_date).toLocaleDateString() : '-'}</p>
          </div>
          <div class="section">
            <h2>Tasks</h2>
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Due</th>
                  <th>Done</th>
                </tr>
              </thead>
              <tbody>
                ${taskRows || '<tr><td colspan=\"5\">No tasks</td></tr>'}
              </tbody>
            </table>
          </div>
        </body>
      </html>
    `;
  }
}

