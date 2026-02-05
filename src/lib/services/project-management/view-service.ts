import { query } from '@/lib/database';

export class ViewService {
  static async list(params: { orgId: string; projectId?: string | null }) {
    const conditions = ['org_id = $1'];
    const values: unknown[] = [params.orgId];
    let index = 2;

    if (params.projectId) {
      conditions.push(`(project_id = $${index} OR project_id IS NULL)`);
      values.push(params.projectId);
      index++;
    }

    const result = await query(
      `
      SELECT view_id, org_id, project_id, name, view_type, config, owner_id, is_shared, created_at, updated_at
      FROM core.pm_view
      WHERE ${conditions.join(' AND ')}
      ORDER BY created_at DESC
      `,
      values
    );

    return result.rows.map(row => ({
      ...row,
      config: row.config || {},
    }));
  }

  static async create(params: {
    orgId: string;
    projectId?: string | null;
    name: string;
    viewType: string;
    config?: Record<string, unknown> | null;
    ownerId?: string | null;
    isShared?: boolean;
  }) {
    const result = await query(
      `
      INSERT INTO core.pm_view (view_id, org_id, project_id, name, view_type, config, owner_id, is_shared)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5::jsonb, $6, $7)
      RETURNING view_id, org_id, project_id, name, view_type, config, owner_id, is_shared, created_at, updated_at
      `,
      [
        params.orgId,
        params.projectId || null,
        params.name,
        params.viewType,
        JSON.stringify(params.config || {}),
        params.ownerId || null,
        params.isShared ?? false,
      ]
    );

    return result.rows[0];
  }

  static async update(params: {
    orgId: string;
    viewId: string;
    patch: Partial<{ name: string; view_type: string; config: Record<string, unknown>; is_shared: boolean }>;
  }) {
    const fields: string[] = [];
    const values: unknown[] = [params.orgId, params.viewId];
    let index = 3;

    const add = (field: string, value: unknown) => {
      fields.push(`${field} = $${index}`);
      values.push(value);
      index++;
    };

    if (params.patch.name !== undefined) add('name', params.patch.name);
    if (params.patch.view_type !== undefined) add('view_type', params.patch.view_type);
    if (params.patch.config !== undefined) {
      fields.push(`config = $${index}::jsonb`);
      values.push(JSON.stringify(params.patch.config));
      index++;
    }
    if (params.patch.is_shared !== undefined) add('is_shared', params.patch.is_shared);

    if (fields.length === 0) return null;

    const result = await query(
      `
      UPDATE core.pm_view
      SET ${fields.join(', ')}, updated_at = now()
      WHERE org_id = $1 AND view_id = $2
      RETURNING view_id, org_id, project_id, name, view_type, config, owner_id, is_shared, created_at, updated_at
      `,
      values
    );

    return result.rows[0] || null;
  }

  static async remove(orgId: string, viewId: string) {
    await query('DELETE FROM core.pm_view WHERE org_id = $1 AND view_id = $2', [orgId, viewId]);
  }
}
