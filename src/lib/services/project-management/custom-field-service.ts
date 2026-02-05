import { query } from '@/lib/database';

export class CustomFieldService {
  static async listFields(params: { orgId: string; projectId?: string | null; entityType?: string | null }) {
    const conditions = ['org_id = $1'];
    const values: unknown[] = [params.orgId];
    let index = 2;

    if (params.projectId) {
      conditions.push(`project_id = $${index}`);
      values.push(params.projectId);
      index++;
    }

    if (params.entityType) {
      conditions.push(`entity_type = $${index}`);
      values.push(params.entityType);
      index++;
    }

    const result = await query(
      `
      SELECT field_id, org_id, project_id, entity_type, name, key, type, options, is_required, created_at, updated_at
      FROM core.pm_custom_field
      WHERE ${conditions.join(' AND ')}
      ORDER BY created_at DESC
      `,
      values
    );

    return result.rows.map(row => ({
      ...row,
      options: row.options || [],
    }));
  }

  static async createField(params: {
    orgId: string;
    projectId?: string | null;
    entityType: 'project' | 'task';
    name: string;
    key: string;
    type: string;
    options?: Record<string, unknown> | null;
    isRequired?: boolean;
  }) {
    const result = await query(
      `
      INSERT INTO core.pm_custom_field (org_id, project_id, entity_type, name, key, type, options, is_required)
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)
      RETURNING field_id, org_id, project_id, entity_type, name, key, type, options, is_required, created_at, updated_at
      `,
      [
        params.orgId,
        params.projectId || null,
        params.entityType,
        params.name,
        params.key,
        params.type,
        JSON.stringify(params.options || {}),
        params.isRequired ?? false,
      ]
    );

    return result.rows[0];
  }

  static async updateField(params: {
    orgId: string;
    fieldId: string;
    patch: Partial<{
      name: string;
      key: string;
      type: string;
      options: Record<string, unknown> | null;
      is_required: boolean;
    }>;
  }) {
    const fields: string[] = [];
    const values: unknown[] = [params.orgId, params.fieldId];
    let index = 3;

    const add = (field: string, value: unknown) => {
      fields.push(`${field} = $${index}`);
      values.push(value);
      index++;
    };

    if (params.patch.name !== undefined) add('name', params.patch.name);
    if (params.patch.key !== undefined) add('key', params.patch.key);
    if (params.patch.type !== undefined) add('type', params.patch.type);
    if (params.patch.options !== undefined) {
      fields.push(`options = $${index}::jsonb`);
      values.push(JSON.stringify(params.patch.options));
      index++;
    }
    if (params.patch.is_required !== undefined) add('is_required', params.patch.is_required);

    if (fields.length === 0) return null;

    const result = await query(
      `
      UPDATE core.pm_custom_field
      SET ${fields.join(', ')}, updated_at = now()
      WHERE org_id = $1 AND field_id = $2
      RETURNING field_id, org_id, project_id, entity_type, name, key, type, options, is_required, created_at, updated_at
      `,
      values
    );

    return result.rows[0] || null;
  }

  static async deleteField(orgId: string, fieldId: string) {
    await query('DELETE FROM core.pm_custom_field WHERE org_id = $1 AND field_id = $2', [orgId, fieldId]);
  }

  static async getValues(params: { orgId: string; entityType: string; entityId: string }) {
    const result = await query(
      `
      SELECT value_id, field_id, entity_type, entity_id, value, updated_at
      FROM core.pm_custom_field_value
      WHERE entity_type = $1 AND entity_id = $2
      `,
      [params.entityType, params.entityId]
    );
    return result.rows;
  }

  static async setValue(params: {
    orgId: string;
    fieldId: string;
    entityType: string;
    entityId: string;
    value: Record<string, unknown> | string | number | boolean | null;
  }) {
    const result = await query(
      `
      INSERT INTO core.pm_custom_field_value (value_id, field_id, entity_type, entity_id, value, updated_at)
      VALUES (gen_random_uuid(), $1, $2, $3, $4::jsonb, now())
      ON CONFLICT (field_id, entity_type, entity_id)
      DO UPDATE SET value = EXCLUDED.value, updated_at = now()
      RETURNING value_id, field_id, entity_type, entity_id, value, updated_at
      `,
      [params.fieldId, params.entityType, params.entityId, JSON.stringify(params.value)]
    );

    return result.rows[0];
  }
}
