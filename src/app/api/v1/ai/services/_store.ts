import { query } from '@/lib/database';
import { resolveOrgId } from '@/lib/ai/model-utils';

export interface AIServiceRow {
  id: string;
  org_id: string;
  service_key: string;
  service_label: string;
  is_enabled: boolean;
  created_at: string | Date;
  updated_at: string | Date;
}

function iso(v: unknown): string {
  return v instanceof Date ? v.toISOString() : new Date(v).toISOString();
}

export async function listServices(orgId?: string | null): Promise<AIServiceRow[]> {
  const resolved = resolveOrgId(orgId);
  const { rows } = await query<AIServiceRow>(
    `SELECT * FROM ai_service WHERE org_id = $1 ORDER BY service_label`,
    [resolved]
  );
  return rows.map((r: unknown) => ({
    ...r,
    created_at: iso(r.created_at),
    updated_at: iso(r.updated_at),
  }));
}

export async function createService(
  orgId: string,
  label: string,
  key?: string
): Promise<AIServiceRow> {
  const resolved = resolveOrgId(orgId);
  const slug =
    key ||
    label
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') ||
    'service';
  const { rows } = await query<AIServiceRow>(
    `INSERT INTO ai_service (org_id, service_key, service_label)
     VALUES ($1, $2, $3)
     ON CONFLICT (org_id, service_key) DO UPDATE SET service_label = EXCLUDED.service_label, updated_at = NOW()
     RETURNING *`,
    [resolved, slug, label]
  );
  const r = rows[0];
  return { ...r, created_at: iso(r.created_at), updated_at: iso(r.updated_at) };
}

export async function updateService(
  orgId: string,
  id: string,
  updates: Partial<{ label: string; key: string; is_enabled: boolean }>
): Promise<AIServiceRow | null> {
  const resolved = resolveOrgId(orgId);
  const sets: string[] = [];
  const values: unknown[] = [resolved, id];
  let i = 3;
  if (updates.label !== undefined) {
    sets.push(`service_label = $${i++}`);
    values.push(updates.label);
  }
  if (updates.key !== undefined) {
    sets.push(`service_key = $${i++}`);
    values.push(updates.key);
  }
  if (updates.is_enabled !== undefined) {
    sets.push(`is_enabled = $${i++}`);
    values.push(updates.is_enabled);
  }
  if (sets.length === 0) {
    const { rows } = await query<AIServiceRow>(
      `SELECT * FROM ai_service WHERE org_id = $1 AND id = $2`,
      [resolved, id]
    );
    if (!rows.length) return null;
    const r = rows[0];
    return { ...r, created_at: iso(r.created_at), updated_at: iso(r.updated_at) };
  }
  const { rows } = await query<AIServiceRow>(
    `UPDATE ai_service SET ${sets.join(', ')}, updated_at = NOW() WHERE org_id = $1 AND id = $2 RETURNING *`,
    values
  );
  if (!rows.length) return null;
  const r = rows[0];
  return { ...r, created_at: iso(r.created_at), updated_at: iso(r.updated_at) };
}

export async function deleteService(orgId: string, id: string): Promise<void> {
  const resolved = resolveOrgId(orgId);
  await query(`DELETE FROM ai_service WHERE org_id = $1 AND id = $2`, [resolved, id]);
}
