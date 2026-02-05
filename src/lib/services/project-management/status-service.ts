import { query } from '@/lib/database';

export class StatusService {
  static async list(orgId: string, projectId: string) {
    const result = await query(
      `
      SELECT status_id, name, status_key, status_type, color, position, is_default, is_archived
      FROM core.pm_status
      WHERE org_id = $1 AND project_id = $2 AND is_archived = false
      ORDER BY position ASC
      `,
      [orgId, projectId]
    );

    return result.rows;
  }

  static async create(params: {
    orgId: string;
    projectId: string;
    name: string;
    statusKey: string;
    statusType: 'todo' | 'in_progress' | 'done';
    color?: string;
    position?: number;
    isDefault?: boolean;
  }) {
    const result = await query(
      `
      INSERT INTO core.pm_status (org_id, project_id, name, status_key, status_type, color, position, is_default)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING status_id, name, status_key, status_type, color, position, is_default, is_archived
      `,
      [
        params.orgId,
        params.projectId,
        params.name,
        params.statusKey,
        params.statusType,
        params.color || '#64748b',
        params.position ?? 0,
        params.isDefault ?? false,
      ]
    );

    return result.rows[0];
  }

  static async reorder(orgId: string, projectId: string, orderedIds: string[]) {
    const updates: Promise<unknown>[] = [];
    orderedIds.forEach((statusId, index) => {
      updates.push(
        query(
          `UPDATE core.pm_status SET position = $1 WHERE org_id = $2 AND project_id = $3 AND status_id = $4`,
          [index, orgId, projectId, statusId]
        )
      );
    });

    await Promise.all(updates);
  }
}
