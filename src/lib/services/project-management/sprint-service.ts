import { query } from '@/lib/database';
import { ActivityService } from './activity-service';

export class SprintService {
  static async list(orgId: string, projectId: string) {
    const result = await query(
      `SELECT * FROM core.pm_sprint WHERE org_id = $1 AND project_id = $2 ORDER BY start_date DESC`,
      [orgId, projectId]
    );
    return result.rows;
  }

  static async create(params: {
    orgId: string;
    projectId: string;
    name: string;
    goal?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    status?: 'planned' | 'active' | 'closed';
    actorId?: string | null;
  }) {
    const result = await query(
      `
      INSERT INTO core.pm_sprint (org_id, project_id, name, goal, start_date, end_date, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
      `,
      [
        params.orgId,
        params.projectId,
        params.name,
        params.goal || null,
        params.startDate || null,
        params.endDate || null,
        params.status || 'planned',
      ]
    );

    await ActivityService.log({
      orgId: params.orgId,
      actorId: params.actorId || null,
      entityType: 'sprint',
      entityId: result.rows[0].sprint_id,
      action: 'created',
      metadata: { project_id: params.projectId },
    });

    return result.rows[0];
  }

  static async update(orgId: string, sprintId: string, patch: Record<string, unknown>) {
    const fields: string[] = [];
    const values: unknown[] = [orgId, sprintId];
    let index = 3;

    for (const [key, value] of Object.entries(patch)) {
      fields.push(`${key} = $${index++}`);
      values.push(value);
    }

    if (fields.length === 0) return null;

    const result = await query(
      `UPDATE core.pm_sprint SET ${fields.join(', ')} WHERE org_id = $1 AND sprint_id = $2 RETURNING *`,
      values
    );

    return result.rows[0] || null;
  }
}
