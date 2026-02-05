import { query } from '@/lib/database';

export class LabelService {
  static async list(orgId: string, projectId: string) {
    const result = await query(
      `SELECT label_id, name, color, description FROM core.pm_label WHERE org_id = $1 AND project_id = $2 ORDER BY name`,
      [orgId, projectId]
    );

    return result.rows;
  }

  static async create(params: {
    orgId: string;
    projectId: string;
    name: string;
    color?: string;
    description?: string | null;
  }) {
    const result = await query(
      `
      INSERT INTO core.pm_label (org_id, project_id, name, color, description)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING label_id, name, color, description
      `,
      [params.orgId, params.projectId, params.name, params.color || '#0ea5e9', params.description || null]
    );

    return result.rows[0];
  }

  static async remove(orgId: string, labelId: string) {
    await query('DELETE FROM core.pm_label WHERE org_id = $1 AND label_id = $2', [orgId, labelId]);
  }
}
