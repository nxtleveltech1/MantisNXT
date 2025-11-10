import { query } from "@/lib/database"
import { executeSupplierRules } from "./supplier-rules-engine"
import type { Product, Tag } from "./types"

// Utilities
function slugifyId(name: string) {
  return `tag-${name.toLowerCase().replace(/\s+/g, "-")}`
}

// Core data access
export async function getProduct(sku: string) {
  const result = await query<Product & { tags?: string[] }>(`
    select p.sku, p.supplier_id as "supplierId", p.category_id as "categoryId",
           p.description, p.brand, p.series_range as "seriesRange", p.price, p.stock_type as "stockType", p.image_url as "imageUrl",
           coalesce(array_agg(ta.tag_id) filter (where ta.tag_id is not null), '{}') as tags
    from products p
    left join tag_assignments ta on ta.sku = p.sku
    where p.sku = $1
    group by p.sku
  `, [sku])
  return result.rows[0]
}

export async function getProducts({
  uncategorized = false,
}: { uncategorized?: boolean } = {}) {
  const sqlQuery = uncategorized
    ? `
    select p.sku, p.description, p.brand, p.series_range as "seriesRange", p.category_id as "categoryId",
           coalesce(array_agg(ta.tag_id) filter (where ta.tag_id is not null), '{}') as tags
    from products p
    left join tag_assignments ta on ta.sku = p.sku
    where p.category_id is null
    group by p.sku
    order by p.sku
  `
    : `
    select p.sku, p.description, p.brand, p.series_range as "seriesRange", p.category_id as "categoryId",
           coalesce(array_agg(ta.tag_id) filter (where ta.tag_id is not null), '{}') as tags
    from products p
    left join tag_assignments ta on ta.sku = p.sku
    group by p.sku
    order by p.sku
  `
  const result = await query<{
    sku: string
    description: string
    brand?: string
    seriesRange?: string
    categoryId: string | null
    tags: string[]
  }>(sqlQuery)
  return result.rows
}

export async function getCategories() {
  const result = await query<{ id: string; name: string; parentId: string | null; path: string }>(`
    select id, name, parent_id as "parentId", path from categories order by path
  `)
  return result.rows
}

export async function addTag(name: string, type?: Tag["type"]) {
  const id = slugifyId(name)
  await query(`
    insert into tags (id, name, type) values ($1, $2, $3)
    on conflict (id) do update set name = excluded.name, type = excluded.type
  `, [id, name, type ?? "custom"])
  const result = await query<Tag>(`select id, name, type from tags where id = $1`, [id])
  return result.rows[0]
}

export async function listTags() {
  const result = await query<Tag>(`select id, name, type from tags order by name`)
  return result.rows
}

export async function assignTag(sku: string, tagId: string) {
  await query(`
    insert into tag_assignments (sku, tag_id) values ($1, $2)
    on conflict (sku, tag_id) do nothing
  `, [sku, tagId])
}

export async function removeTag(sku: string, tagId: string) {
  await query(`delete from tag_assignments where sku = $1 and tag_id = $2`, [sku, tagId])
}

export async function upsertProductAttributes(
  p: Partial<Product> & { sku: string; supplierId?: string },
  context?: { approved_by?: string; approver_role?: string }
) {
  const sku = p.sku

  // Execute supplier rules if supplierId is provided
  if (p.supplierId) {
    // Extract cost from attributes if available
    const cost =
      (p.attributes as any)?.cost ||
      (p.attributes as any)?.dealerPrice ||
      undefined

    const ruleData = {
      sku: p.sku,
      supplierId: p.supplierId,
      description: p.description,
      brand: p.brand,
      seriesRange: p.seriesRange,
      price: p.price,
      cost,
      stockType: p.stockType,
      imageUrl: p.imageUrl,
      attributes: p.attributes,
    }

    const ruleResult = await executeSupplierRules(
      p.supplierId,
      "upsert",
      ruleData,
      context
    )

    // If blocked by rules, return error
    if (ruleResult.blocked) {
      return {
        inserted: false,
        updated: false,
        conflict: {
          sku,
          type: "rule_blocked",
          message: ruleResult.errors.join("; "),
        },
      }
    }

    // Apply transformations from rules
    if (ruleResult.transformedData) {
      Object.assign(p, ruleResult.transformedData)
    }
  }

  const existingResult = await query<{
    sku: string
    supplierId: string
    description: string | null
    brand: string | null
    seriesRange: string | null
    price: number | null
    stockType: string | null
    imageUrl: string | null
    attributes: any | null
  }>(`
    select sku,
           supplier_id as "supplierId",
           description,
           brand,
           series_range as "seriesRange",
           price,
           stock_type as "stockType",
           image_url as "imageUrl",
           attributes
    from products
    where sku = $1
  `, [sku])
  const existing = existingResult.rows
  const attrs = p.attributes ? JSON.stringify(p.attributes) : null

  if (existing.length === 0) {
    if (!p.supplierId) throw new Error("supplierId required for new product")

    // ensure supplier exists
    await query(`
      insert into suppliers (id, name) values ($1, $2)
      on conflict (id) do nothing
    `, [p.supplierId, p.supplierId])

    await query(`
      insert into products (sku, supplier_id, category_id, description, brand, series_range, price, stock_type, image_url, attributes, updated_at)
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, now())
    `, [
      sku,
      p.supplierId,
      p.categoryId ?? null,
      p.description ?? "",
      p.brand ?? null,
      p.seriesRange ?? null,
      p.price ?? null,
      p.stockType ?? null,
      p.imageUrl ?? null,
      attrs,
    ])
    return { inserted: true, updated: false as const }
  } else {
    const exists = existing[0]

    // Immutable supplier enforcement
    if (p.supplierId && p.supplierId !== exists.supplierId) {
      const details = JSON.stringify({
        existingSupplier: exists.supplierId,
        attemptedSupplier: p.supplierId,
      })
      await query(`
        insert into conflicts (sku, type, message, details, reported_at)
        values ($1, 'duplicate', 'SKU already exists from a different supplier. New SKU required.', $2::jsonb, now())
      `, [sku, details])
      return {
        inserted: false,
        updated: false,
        conflict: {
          sku,
          type: "duplicate",
          message:
            "SKU already exists from a different supplier. New SKU required.",
        },
      }
    }

    // Core field immutability for existing SKUs: differences are conflicts, not updates
    const coreChanges: Record<string, { existing: any; attempted: any }> = {}
    const compare = (
      field: "description" | "price" | "stockType" | "imageUrl",
      attempted: any
    ) => {
      // only compare if provided on import
      if (attempted === undefined || attempted === null || attempted === "")
        return
      const ex = (exists as any)[field]
      const same =
        field === "price"
          ? Number(ex ?? null) === Number(attempted)
          : String(ex ?? "").trim() === String(attempted ?? "").trim()
      if (!same) {
        coreChanges[field] = { existing: ex, attempted }
      }
    }

    compare("description", p.description)
    compare("price", p.price as any)
    compare("stockType", p.stockType as any)
    compare("imageUrl", p.imageUrl)

    let hadConflict = false
    if (Object.keys(coreChanges).length > 0) {
      const details = JSON.stringify({
        policy: "immutable-core-fields",
        fieldChanges: coreChanges,
      })
      await query(`
        insert into conflicts (sku, type, message, details, reported_at)
        values ($1, 'data_mismatch', 'Existing SKU has immutable core fields that differ. Attributes-only updates allowed.', $2::jsonb, now())
      `, [sku, details])
      hadConflict = true
    }

    // Merge attributes and update brand/series_range if provided
    let attributesUpdated = false

    if (attrs) {
      await query(`
        update products
        set attributes = coalesce(attributes, '{}'::jsonb) || $1::jsonb,
            updated_at = now()
        where sku = $2
      `, [attrs, sku])
      attributesUpdated = true
    }

    if (p.brand !== undefined) {
      await query(`
        update products
        set brand = $1,
            updated_at = now()
        where sku = $2
      `, [p.brand ?? null, sku])
      attributesUpdated = true
    }

    if (p.seriesRange !== undefined) {
      await query(`
        update products
        set series_range = $1,
            updated_at = now()
        where sku = $2
      `, [p.seriesRange ?? null, sku])
      attributesUpdated = true
    }

    return {
      inserted: false,
      updated: attributesUpdated, // true only if attributes merged
      ...(hadConflict
        ? {
            conflict: {
              sku,
              type: "data_mismatch",
              message:
                "Existing SKU has immutable core fields that differ. Attributes-only updates allowed; differences recorded.",
            },
          }
        : {}),
    }
  }
}

export async function assignCategory(sku: string, categoryId: string) {
  const catCheck = await query(`select 1 from categories where id = $1`, [categoryId])
  if (catCheck.rows.length === 0) throw new Error("Category not found")
  const prodCheck = await query(`select 1 from products where sku = $1`, [sku])
  if (prodCheck.rows.length === 0) throw new Error("Product not found")
  await query(`update products set category_id = $1, updated_at = now() where sku = $2`, [categoryId, sku])
}

export async function uncategorizedProducts() {
  const result = await query<Product>(`
    select sku, supplier_id as "supplierId", category_id as "categoryId",
           description, brand, series_range as "seriesRange", price, stock_type as "stockType", image_url as "imageUrl",
           coalesce(attributes, '{}'::jsonb) as attributes,
           extract(epoch from updated_at) * 1000 as "updatedAt",
           '{}'::text[] as tags
    from products
    where category_id is null
    order by sku
  `)
  return result.rows
}

export function suggestCategory(
  p: Product
): { categoryId: string; categoryName: string; confidence: number } | null {
  const d = (p.description || "").toLowerCase()
  if (d.includes("jacket") || d.includes("coat"))
    return {
      categoryId: "cat-002",
      categoryName: "Outerwear",
      confidence: 0.86,
    }
  if (d.includes("shoe") || d.includes("sneaker") || d.includes("running"))
    return { categoryId: "cat-003", categoryName: "Footwear", confidence: 0.9 }
  if (d.includes("scarf") || d.includes("belt") || d.includes("hat"))
    return {
      categoryId: "cat-004",
      categoryName: "Accessories",
      confidence: 0.8,
    }
  if (d.includes("apparel") || d.includes("tshirt") || d.includes("shirt"))
    return { categoryId: "cat-001", categoryName: "Apparel", confidence: 0.7 }
  return null
}

export function predictiveTags(p: Product): string[] {
  const d = (p.description || "").toLowerCase()
  const res: string[] = []
  const month = new Date().getMonth()
  if ([5, 6, 7].includes(month) || d.includes("summer") || d.includes("beach"))
    res.push("tag-summer")
  if (d.includes("wool") || d.includes("winter") || [11, 0, 1].includes(month))
    res.push("tag-winter")
  if (p.stockType === "preorder") res.push("tag-preorder")
  if (p.stockType === "stock") res.push("tag-stock")
  return Array.from(new Set(res))
}

// Rules
export async function addRuleKeyword(keyword: string, tagId: string) {
  const id = `rule-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  await query(`
    insert into rules (id, kind, keyword, tag_id)
    values ($1, 'keyword', $2, $3)
  `, [id, keyword, tagId])
  return { id, kind: "keyword" as const, keyword, tagId }
}

export async function listRules() {
  const result = await query<{
    id: string
    kind: string
    keyword: string
    tagId: string
    tagName: string
  }>(`
    select r.id, r.kind, r.keyword, r.tag_id as "tagId", t.name as "tagName"
    from rules r
    left join tags t on t.id = r.tag_id
    order by r.id
  `)
  return result.rows
}

export async function applyRules() {
  const productsResult = await query<Product>(`
    select sku, supplier_id as "supplierId", category_id as "categoryId",
           description, brand, series_range as "seriesRange", price, stock_type as "stockType", image_url as "imageUrl",
           coalesce(attributes, '{}'::jsonb) as attributes,
           extract(epoch from updated_at) * 1000 as "updatedAt"
    from products
  `)
  const products = productsResult.rows
  const rulesResult = await query<{ keyword: string; tagId: string }>(`
    select keyword, tag_id as "tagId" from rules where kind = 'keyword'
  `)
  const rules = rulesResult.rows
  for (const p of products) {
    for (const r of rules) {
      if (
        (p.description || "").toLowerCase().includes(r.keyword.toLowerCase())
      ) {
        await assignTag(p.sku, r.tagId)
      }
    }
  }
}

// Upload history
export async function recordUpload(params: {
  supplierId: string
  source: "file" | "text" | "api"
  filename?: string
  mapping: Record<string, any>
  results: {
    sku: string
    outcome: "inserted" | "updated" | "conflict"
    message?: string
  }[]
}) {
  const id = `upl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  const inserted = params.results.filter(
    (r) => r.outcome === "inserted"
  ).length
  const updated = params.results.filter((r) => r.outcome === "updated").length
  const conflictCount = params.results.filter(
    (r) => r.outcome === "conflict"
  ).length

  await query(`
    insert into pricelist_uploads (id, supplier_id, source, filename, mapping, inserted_count, updated_count, conflict_count, created_at)
    values ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, now())
  `, [
    id,
    params.supplierId,
    params.source,
    params.filename ?? null,
    JSON.stringify(params.mapping),
    inserted,
    updated,
    conflictCount,
  ])

  if (params.results.length) {
    for (const r of params.results) {
      await query(`
        insert into pricelist_upload_items (upload_id, sku, outcome, message)
        values ($1, $2, $3, $4)
      `, [id, r.sku, r.outcome, r.message ?? null])
    }
  }
  return { id, inserted, updated, conflicts: conflictCount }
}

export async function listUploads() {
  const result = await query<{
    id: string
    supplierId: string
    source: string
    filename: string | null
    inserted: number
    updated: number
    conflicts: number
    createdAt: string
  }>(`
    select id, supplier_id as "supplierId", source, filename,
           inserted_count as "inserted", updated_count as "updated", conflict_count as "conflicts",
           to_char(created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as "createdAt"
    from pricelist_uploads
    order by created_at desc
    limit 100
  `)
  return result.rows
}

