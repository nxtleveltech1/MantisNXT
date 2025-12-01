import { query as dbQuery } from '@/lib/database/unified-connection';

type CoreTagRecord = {
  tag_id: string;
  name: string;
  type: string;
  product_count: number;
};

const ENSURE_INFRA_SQL = `
  CREATE TABLE IF NOT EXISTS core.ai_tag_library (
    tag_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'custom',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS core.ai_tag_assignment (
    supplier_product_id UUID NOT NULL REFERENCES core.supplier_product(supplier_product_id) ON DELETE CASCADE,
    tag_id TEXT NOT NULL,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    assigned_by TEXT,
    PRIMARY KEY (supplier_product_id, tag_id)
  );

  CREATE INDEX IF NOT EXISTS idx_ai_tag_assignment_tag ON core.ai_tag_assignment(tag_id);
  CREATE INDEX IF NOT EXISTS idx_ai_tag_assignment_product ON core.ai_tag_assignment(supplier_product_id);

  CREATE TABLE IF NOT EXISTS core.ai_tag_rule (
    rule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kind TEXT NOT NULL DEFAULT 'keyword',
    keyword TEXT NOT NULL,
    tag_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_ai_tag_rule_keyword ON core.ai_tag_rule(keyword);
`;

export async function ensureCoreTagInfrastructure() {
  await dbQuery(ENSURE_INFRA_SQL);
}

function slugifyTag(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function listCoreTags(): Promise<CoreTagRecord[]> {
  await ensureCoreTagInfrastructure();

  const libraryRes = await dbQuery<{
    tag_id: string;
    name: string;
    type: string;
    product_count: number;
  }>(`
    WITH counts AS (
      SELECT tag_id, COUNT(*) AS product_count
      FROM core.ai_tag_assignment
      GROUP BY tag_id
    )
    SELECT
      l.tag_id,
      l.name,
      l.type,
      COALESCE(c.product_count, 0)::bigint AS product_count
    FROM core.ai_tag_library l
    LEFT JOIN counts c ON c.tag_id = l.tag_id
    ORDER BY l.name
  `);

  const autoRes = await dbQuery<{ tag: string; product_count: number }>(`
    SELECT LOWER(TRIM(tag_value)) AS tag,
           COUNT(*)::bigint AS product_count
    FROM core.supplier_product sp
    CROSS JOIN LATERAL (
      SELECT jsonb_array_elements_text(sp.attrs_json->'tags') AS tag_value
      WHERE sp.attrs_json ? 'tags'
    ) tag_values
    WHERE tag_value IS NOT NULL AND TRIM(tag_value) <> ''
    GROUP BY LOWER(TRIM(tag_value))
    ORDER BY product_count DESC
  `);

  const tagMap = new Map<string, CoreTagRecord>();

  for (const row of libraryRes.rows) {
    tagMap.set(row.tag_id, {
      tag_id: row.tag_id,
      name: row.name,
      type: row.type ?? 'custom',
      product_count: Number(row.product_count ?? 0),
    });
  }

  for (const auto of autoRes.rows) {
    const slug = slugifyTag(auto.tag);
    if (!slug) continue;
    const tagId = slug.startsWith('tag-') ? slug : `tag-${slug}`;
    const existing = tagMap.get(tagId);
    const productCount = Number(auto.product_count ?? 0);
    if (existing) {
      existing.product_count += productCount;
    } else {
      tagMap.set(tagId, {
        tag_id: tagId,
        name: auto.tag.replace(/\b\w/g, char => char.toUpperCase()),
        type: 'auto',
        product_count: productCount,
      });
    }
  }

  return Array.from(tagMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export async function createCoreTag(name: string, type?: string) {
  await ensureCoreTagInfrastructure();
  const slug = slugifyTag(name);
  if (!slug) throw new Error('Tag name must contain alphanumeric characters.');
  const tagId = slug.startsWith('tag-') ? slug : `tag-${slug}`;

  const result = await dbQuery<{
    tag_id: string;
    name: string;
    type: string;
  }>(
    `
      INSERT INTO core.ai_tag_library (tag_id, name, type)
      VALUES ($1, $2, COALESCE($3, 'custom'))
      ON CONFLICT (tag_id) DO UPDATE
      SET name = EXCLUDED.name,
          type = EXCLUDED.type
      RETURNING tag_id, name, type
    `,
    [tagId, name.trim(), type ?? 'custom']
  );

  return result.rows[0];
}

export async function assignCoreTag(
  supplierProductId: string,
  tagId: string,
  options: { assignedBy?: string } = {}
) {
  await ensureCoreTagInfrastructure();

  const productRes = await dbQuery<{ supplier_product_id: string }>(
    `
      SELECT supplier_product_id
      FROM core.supplier_product
      WHERE supplier_product_id = $1
    `,
    [supplierProductId]
  );

  if (productRes.rows.length === 0) {
    throw new Error('Supplier product not found');
  }

  await dbQuery(
    `
      INSERT INTO core.ai_tag_assignment (supplier_product_id, tag_id, assigned_at, assigned_by)
      VALUES ($1, $2, NOW(), $3)
      ON CONFLICT (supplier_product_id, tag_id) DO NOTHING
    `,
    [supplierProductId, tagId, options.assignedBy ?? 'manual']
  );

  // Mirror assignment into attrs_json for quick lookup
  await dbQuery(
    `
      UPDATE core.supplier_product
      SET attrs_json = COALESCE(attrs_json, '{}'::jsonb) || jsonb_build_object(
        'tags',
        CASE
          WHEN attrs_json ? 'tags' THEN (
            SELECT jsonb_agg(DISTINCT tag_val)
            FROM (
              SELECT jsonb_array_elements_text(attrs_json->'tags') AS tag_val
              UNION ALL
              SELECT $2
            ) merged
          )
          ELSE jsonb_build_array($2)
        END
      ),
      updated_at = NOW()
      WHERE supplier_product_id = $1
    `,
    [supplierProductId, tagId]
  );
}

export async function removeCoreTagAssignment(supplierProductId: string, tagId: string) {
  await ensureCoreTagInfrastructure();
  await dbQuery(
    `
      DELETE FROM core.ai_tag_assignment
      WHERE supplier_product_id = $1 AND tag_id = $2
    `,
    [supplierProductId, tagId]
  );
}

export async function listCoreTagRules() {
  await ensureCoreTagInfrastructure();
  const { rows } = await dbQuery<{
    rule_id: string;
    kind: string;
    keyword: string;
    tag_id: string;
    tag_name: string | null;
  }>(`
    SELECT
      r.rule_id,
      r.kind,
      r.keyword,
      r.tag_id,
      l.name AS tag_name
    FROM core.ai_tag_rule r
    LEFT JOIN core.ai_tag_library l ON l.tag_id = r.tag_id
    ORDER BY r.created_at DESC
  `);

  return rows.map(row => ({
    id: row.rule_id,
    kind: row.kind,
    keyword: row.keyword,
    tagId: row.tag_id,
    tagName: row.tag_name ?? row.tag_id,
  }));
}

export async function createCoreTagRule(keyword: string, tagId: string) {
  await ensureCoreTagInfrastructure();
  const trimmed = keyword.trim();
  if (!trimmed) throw new Error('Keyword is required');

  await dbQuery(
    `
      INSERT INTO core.ai_tag_rule (keyword, tag_id)
      VALUES ($1, $2)
    `,
    [trimmed, tagId]
  );
}

export async function applyCoreTagRules() {
  await ensureCoreTagInfrastructure();
  await dbQuery(
    `
      INSERT INTO core.ai_tag_assignment (supplier_product_id, tag_id, assigned_at, assigned_by)
      SELECT sp.supplier_product_id, r.tag_id, NOW(), 'rule'
      FROM core.supplier_product sp
      JOIN core.ai_tag_rule r
        ON LOWER(sp.name_from_supplier) LIKE '%' || LOWER(r.keyword) || '%'
        OR LOWER(COALESCE(sp.ai_reasoning, '')) LIKE '%' || LOWER(r.keyword) || '%'
      ON CONFLICT (supplier_product_id, tag_id) DO NOTHING
    `
  );
}

export async function predictiveAssignCoreTags() {
  await ensureCoreTagInfrastructure();

  await dbQuery(
    `
      INSERT INTO core.ai_tag_assignment (supplier_product_id, tag_id, assigned_at, assigned_by)
      SELECT sp.supplier_product_id,
             CASE
               WHEN LOWER(sp.name_from_supplier) LIKE '%preorder%' THEN 'tag-preorder'
               WHEN LOWER(sp.name_from_supplier) LIKE '%summer%' THEN 'tag-summer'
               WHEN LOWER(sp.name_from_supplier) LIKE '%winter%' THEN 'tag-winter'
               ELSE NULL
             END AS tag_id,
             NOW(),
             'predictive'
      FROM core.supplier_product sp
      WHERE (
        LOWER(sp.name_from_supplier) LIKE '%preorder%'
        OR LOWER(sp.name_from_supplier) LIKE '%summer%'
        OR LOWER(sp.name_from_supplier) LIKE '%winter%'
      )
      AND sp.supplier_product_id NOT IN (
        SELECT supplier_product_id
        FROM core.ai_tag_assignment
        WHERE tag_id IN ('tag-preorder', 'tag-summer', 'tag-winter')
      )
      AND (
        CASE
          WHEN LOWER(sp.name_from_supplier) LIKE '%preorder%' THEN 'tag-preorder'
          WHEN LOWER(sp.name_from_supplier) LIKE '%summer%' THEN 'tag-summer'
          WHEN LOWER(sp.name_from_supplier) LIKE '%winter%' THEN 'tag-winter'
          ELSE NULL
        END
      ) IS NOT NULL
      ON CONFLICT DO NOTHING
    `
  );
}

export async function getCoreTag(tagId: string) {
  await ensureCoreTagInfrastructure();
  const result = await dbQuery<{
    tag_id: string;
    name: string;
    type: string;
    description: string | null;
    color: string | null;
    icon: string | null;
    parent_tag_id: string | null;
    metadata: Record<string, unknown> | null;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
    product_count: number;
  }>(
    `
      SELECT 
        l.tag_id,
        l.name,
        l.type,
        l.description,
        l.color,
        l.icon,
        l.parent_tag_id,
        l.metadata,
        l.is_active,
        l.created_at,
        l.updated_at,
        COALESCE(COUNT(DISTINCT a.supplier_product_id), 0)::bigint AS product_count
      FROM core.ai_tag_library l
      LEFT JOIN core.ai_tag_assignment a ON l.tag_id = a.tag_id
      WHERE l.tag_id = $1
      GROUP BY l.tag_id, l.name, l.type, l.description, l.color, l.icon, 
               l.parent_tag_id, l.metadata, l.is_active, l.created_at, l.updated_at
    `,
    [tagId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return {
    ...result.rows[0],
    product_count: Number(result.rows[0].product_count),
  };
}

export async function updateCoreTag(
  tagId: string,
  updates: {
    name?: string;
    type?: string;
    description?: string;
    color?: string;
    icon?: string;
    parent_tag_id?: string | null;
    metadata?: Record<string, unknown>;
    is_active?: boolean;
  }
) {
  await ensureCoreTagInfrastructure();

  const updateFields: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (updates.name !== undefined) {
    updateFields.push(`name = $${paramIndex++}`);
    params.push(updates.name.trim());
  }
  if (updates.type !== undefined) {
    updateFields.push(`type = $${paramIndex++}`);
    params.push(updates.type);
  }
  if (updates.description !== undefined) {
    updateFields.push(`description = $${paramIndex++}`);
    params.push(updates.description || null);
  }
  if (updates.color !== undefined) {
    updateFields.push(`color = $${paramIndex++}`);
    params.push(updates.color || null);
  }
  if (updates.icon !== undefined) {
    updateFields.push(`icon = $${paramIndex++}`);
    params.push(updates.icon || null);
  }
  if (updates.parent_tag_id !== undefined) {
    updateFields.push(`parent_tag_id = $${paramIndex++}`);
    params.push(updates.parent_tag_id);
  }
  if (updates.metadata !== undefined) {
    updateFields.push(`metadata = $${paramIndex++}::jsonb`);
    params.push(JSON.stringify(updates.metadata));
  }
  if (updates.is_active !== undefined) {
    updateFields.push(`is_active = $${paramIndex++}`);
    params.push(updates.is_active);
  }

  if (updateFields.length === 0) {
    throw new Error('No fields to update');
  }

  updateFields.push(`updated_at = NOW()`);
  params.push(tagId);

  const result = await dbQuery<{
    tag_id: string;
    name: string;
    type: string;
  }>(
    `
      UPDATE core.ai_tag_library
      SET ${updateFields.join(', ')}
      WHERE tag_id = $${paramIndex}
      RETURNING tag_id, name, type
    `,
    params
  );

  if (result.rows.length === 0) {
    throw new Error(`Tag not found: ${tagId}`);
  }

  return result.rows[0];
}

export async function deleteCoreTag(tagId: string, cascade = false) {
  await ensureCoreTagInfrastructure();

  // Check if tag has assignments
  const assignmentCount = await dbQuery<{ count: number }>(
    `SELECT COUNT(*)::bigint AS count FROM core.ai_tag_assignment WHERE tag_id = $1`,
    [tagId]
  );

  const count = Number(assignmentCount.rows[0]?.count || 0);

  if (count > 0 && !cascade) {
    throw new Error(
      `Cannot delete tag: ${count} product(s) are assigned this tag. Use cascade=true to remove assignments.`
    );
  }

  // If cascade, remove assignments first
  if (cascade) {
    await dbQuery(`DELETE FROM core.ai_tag_assignment WHERE tag_id = $1`, [tagId]);
    await dbQuery(`DELETE FROM core.ai_tag_metadata WHERE tag_id = $1`, [tagId]);
    await dbQuery(`DELETE FROM core.ai_tag_rule WHERE tag_id = $1`, [tagId]);
  }

  // Soft delete by setting is_active = false (safer than hard delete)
  await dbQuery(
    `UPDATE core.ai_tag_library SET is_active = false, updated_at = NOW() WHERE tag_id = $1`,
    [tagId]
  );

  return { deleted: true, assignmentsRemoved: cascade ? count : 0 };
}

export async function getTagHierarchy() {
  await ensureCoreTagInfrastructure();
  const result = await dbQuery<{
    tag_id: string;
    name: string;
    type: string;
    parent_tag_id: string | null;
    level: number;
    product_count: number;
  }>(
    `
      WITH RECURSIVE tag_tree AS (
        -- Root tags (no parent)
        SELECT 
          tag_id,
          name,
          type,
          parent_tag_id,
          0 AS level,
          COALESCE(COUNT(DISTINCT a.supplier_product_id), 0)::bigint AS product_count
        FROM core.ai_tag_library t
        LEFT JOIN core.ai_tag_assignment a ON t.tag_id = a.tag_id
        WHERE parent_tag_id IS NULL AND is_active = true
        GROUP BY t.tag_id, t.name, t.type, t.parent_tag_id
        
        UNION ALL
        
        -- Child tags
        SELECT 
          t.tag_id,
          t.name,
          t.type,
          t.parent_tag_id,
          tt.level + 1,
          COALESCE(COUNT(DISTINCT a.supplier_product_id), 0)::bigint AS product_count
        FROM core.ai_tag_library t
        JOIN tag_tree tt ON t.parent_tag_id = tt.tag_id
        LEFT JOIN core.ai_tag_assignment a ON t.tag_id = a.tag_id
        WHERE t.is_active = true
        GROUP BY t.tag_id, t.name, t.type, t.parent_tag_id, tt.level
      )
      SELECT * FROM tag_tree
      ORDER BY level, name
    `
  );

  return result.rows.map(row => ({
    ...row,
    product_count: Number(row.product_count),
  }));
}

export async function bulkAssignTags(
  productIds: string[],
  tagIds: string[],
  options: { assignedBy?: string } = {}
) {
  await ensureCoreTagInfrastructure();

  if (productIds.length === 0 || tagIds.length === 0) {
    return { assigned: 0 };
  }

  const assignments: Array<[string, string]> = [];
  for (const productId of productIds) {
    for (const tagId of tagIds) {
      assignments.push([productId, tagId]);
    }
  }

  let assigned = 0;
  for (const [productId, tagId] of assignments) {
    try {
      await assignCoreTag(productId, tagId, options);
      assigned++;
    } catch (error) {
      console.error(`Failed to assign tag ${tagId} to product ${productId}:`, error);
    }
  }

  return { assigned };
}

export async function bulkRemoveTags(productIds: string[], tagIds: string[]) {
  await ensureCoreTagInfrastructure();

  if (productIds.length === 0 || tagIds.length === 0) {
    return { removed: 0 };
  }

  let removed = 0;
  for (const productId of productIds) {
    for (const tagId of tagIds) {
      try {
        await removeCoreTagAssignment(productId, tagId);
        removed++;
      } catch (error) {
        console.error(`Failed to remove tag ${tagId} from product ${productId}:`, error);
      }
    }
  }

  return { removed };
}

export async function getTagAnalytics(tagId?: string, dateRange?: { start: Date; end: Date }) {
  await ensureCoreTagInfrastructure();

  // Refresh materialized view
  await dbQuery(`SELECT core.refresh_tag_analytics()`);

  if (tagId) {
    const result = await dbQuery<{
      tag_id: string;
      tag_name: string;
      tag_type: string;
      product_count: number;
      active_product_count: number;
      first_assignment: Date | null;
      last_assignment: Date | null;
      days_with_assignments: number;
    }>(`SELECT * FROM core.tag_analytics WHERE tag_id = $1`, [tagId]);

    if (result.rows.length === 0) {
      return null;
    }

    return {
      ...result.rows[0],
      product_count: Number(result.rows[0].product_count),
      active_product_count: Number(result.rows[0].active_product_count),
      days_with_assignments: Number(result.rows[0].days_with_assignments),
    };
  }

  // Get all analytics
  const result = await dbQuery<{
    tag_id: string;
    tag_name: string;
    tag_type: string;
    product_count: number;
    active_product_count: number;
    first_assignment: Date | null;
    last_assignment: Date | null;
    days_with_assignments: number;
  }>(`SELECT * FROM core.tag_analytics ORDER BY product_count DESC`);

  return result.rows.map(row => ({
    ...row,
    product_count: Number(row.product_count),
    active_product_count: Number(row.active_product_count),
    days_with_assignments: Number(row.days_with_assignments),
  }));
}
