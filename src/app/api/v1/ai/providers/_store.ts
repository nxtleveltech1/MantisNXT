import { query } from '@/lib/database';
import { resolveOrgId } from '@/lib/ai/model-utils';

export type RegistryProviderType = 'openai' | 'anthropic' | 'azure_openai' | 'bedrock';

export interface ProviderRegistryRecord {
  id: string;
  org_id: string;
  name: string;
  provider_type: RegistryProviderType;
  base_url?: string | null;
  default_model?: string | null;
  description?: string | null;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

function toIso(value: Date | string): string {
  if (value instanceof Date) return value.toISOString();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

export async function listProviderRegistry(orgId?: string | null): Promise<ProviderRegistryRecord[]> {
  const resolved = resolveOrgId(orgId);
  const { rows } = await query<unknown>(
    `SELECT * FROM ai_provider_registry WHERE org_id = $1 ORDER BY name`,
    [resolved],
  );
  return rows.map((r: unknown) => ({ ...r, created_at: toIso(r.created_at), updated_at: toIso(r.updated_at) }));
}

export async function createProviderRegistry(
  orgId: string,
  data: {
    name: string;
    provider_type: RegistryProviderType;
    base_url?: string | null;
    default_model?: string | null;
    description?: string | null;
    enabled?: boolean;
  },
): Promise<ProviderRegistryRecord> {
  const resolved = resolveOrgId(orgId);
  const { rows } = await query<unknown>(
    `INSERT INTO ai_provider_registry (org_id, name, provider_type, base_url, default_model, description, enabled)
     VALUES ($1, $2, $3::ai_provider, $4, $5, $6, COALESCE($7, TRUE))
     RETURNING *`,
    [resolved, data.name, data.provider_type, data.base_url ?? null, data.default_model ?? null, data.description ?? null, data.enabled],
  );
  const row = rows[0];
  return { ...row, created_at: toIso(row.created_at), updated_at: toIso(row.updated_at) };
}

export async function updateProviderRegistry(
  orgId: string,
  id: string,
  updates: Partial<{
    name: string;
    base_url: string | null;
    default_model: string | null;
    description: string | null;
    enabled: boolean;
  }>,
): Promise<ProviderRegistryRecord | null> {
  const resolved = resolveOrgId(orgId);

  // Build dynamic set clause
  const sets: string[] = [];
  const values: unknown[] = [resolved, id];
  let idx = 3;
  if (updates.name !== undefined) { sets.push(`name = $${idx++}`); values.push(updates.name); }
  if (updates.base_url !== undefined) { sets.push(`base_url = $${idx++}`); values.push(updates.base_url); }
  if (updates.default_model !== undefined) { sets.push(`default_model = $${idx++}`); values.push(updates.default_model); }
  if (updates.description !== undefined) { sets.push(`description = $${idx++}`); values.push(updates.description); }
  if (updates.enabled !== undefined) { sets.push(`enabled = $${idx++}`); values.push(updates.enabled); }

  if (sets.length === 0) {
    const { rows } = await query<unknown>(`SELECT * FROM ai_provider_registry WHERE org_id = $1 AND id = $2 LIMIT 1`, [resolved, id]);
    if (rows.length === 0) return null;
    const row = rows[0];
    return { ...row, created_at: toIso(row.created_at), updated_at: toIso(row.updated_at) };
  }

  const sql = `UPDATE ai_provider_registry SET ${sets.join(', ')}, updated_at = NOW() WHERE org_id = $1 AND id = $2 RETURNING *`;
  const { rows } = await query<unknown>(sql, values);
  if (rows.length === 0) return null;
  const row = rows[0];
  return { ...row, created_at: toIso(row.created_at), updated_at: toIso(row.updated_at) };
}

export async function deleteProviderRegistry(orgId: string, id: string): Promise<void> {
  const resolved = resolveOrgId(orgId);
  await query(`DELETE FROM ai_provider_registry WHERE org_id = $1 AND id = $2`, [resolved, id]);
}


