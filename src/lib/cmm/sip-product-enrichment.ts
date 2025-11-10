/**
 * SIP Product Enrichment Service
 * Extracts and enriches product data from core.supplier_product for AI categorization
 */

import { query as dbQuery } from '@/lib/database/unified-connection';

export interface EnrichedProduct {
  supplier_product_id: string;
  supplier_id: string;
  supplier_sku: string;
  name_from_supplier: string;
  category_id: string | null;
  category_name: string | null;
  category_path: string | null;
  supplier_name: string;
  supplier_code: string | null;
  brand: string | null;
  uom: string;
  pack_size: string | null;
  barcode: string | null;
  attrs_json: Record<string, any> | null;
  category_raw: string | null;
  current_price: number | null;
  currency: string | null;
  qty_on_hand: number | null;
  qty_on_order: number | null;
  is_active: boolean;
  is_new: boolean;
  first_seen_at: Date;
  last_seen_at: Date | null;
  ai_categorization_status?: string;
  ai_confidence?: number | null;
  ai_reasoning?: string | null;
  ai_provider?: string | null;
  ai_categorized_at?: Date | null;
  previous_confidence?: number | null;
}

export interface CategoryHierarchy {
  category_id: string;
  name: string;
  parent_id: string | null;
  path: string;
  level: number;
}

/**
 * Enrich a single product with full context for categorization
 */
export async function enrichProductForCategorization(
  supplierProductId: string
): Promise<EnrichedProduct | null> {
  const sql = `
    WITH current_prices AS (
      SELECT DISTINCT ON (supplier_product_id)
        supplier_product_id,
        price,
        currency,
        valid_from
      FROM core.price_history
      WHERE is_current = true
      ORDER BY supplier_product_id, valid_from DESC
    ),
    latest_stock AS (
      SELECT DISTINCT ON (supplier_product_id)
        supplier_product_id,
        qty AS qty_on_hand
      FROM core.stock_on_hand
      ORDER BY supplier_product_id, as_of_ts DESC
    )
    SELECT 
      sp.supplier_product_id,
      sp.supplier_id,
      sp.supplier_sku,
      sp.name_from_supplier,
      sp.category_id,
      c.name AS category_name,
      c.path AS category_path,
      s.name AS supplier_name,
      s.code AS supplier_code,
      (SELECT r.brand 
       FROM spp.pricelist_row r
       JOIN spp.pricelist_upload u ON u.upload_id = r.upload_id
       WHERE r.supplier_sku = sp.supplier_sku 
         AND u.supplier_id = sp.supplier_id
         AND r.brand IS NOT NULL
         AND r.brand <> ''
       ORDER BY u.received_at DESC, r.row_num DESC
       LIMIT 1) AS brand,
      sp.uom,
      sp.pack_size,
      sp.barcode,
      sp.attrs_json,
      sp.is_active,
      sp.is_new,
      sp.first_seen_at,
      sp.last_seen_at,
      -- Latest raw category from supplier upload
      (SELECT r.category_raw 
       FROM spp.pricelist_row r
       JOIN spp.pricelist_upload u ON u.upload_id = r.upload_id
       WHERE r.supplier_sku = sp.supplier_sku 
         AND u.supplier_id = sp.supplier_id
         AND r.category_raw IS NOT NULL
         AND r.category_raw <> ''
       ORDER BY u.received_at DESC, r.row_num DESC
       LIMIT 1) AS category_raw,
      -- Current price
      cp.price AS current_price,
      cp.currency,
      -- Current stock
      ls.qty_on_hand,
      -- Quantity on order from latest pricelist
      (SELECT COALESCE((r.attrs_json->>'qty_on_order')::int, NULL)
       FROM spp.pricelist_row r
       JOIN spp.pricelist_upload u ON u.upload_id = r.upload_id
       WHERE r.supplier_sku = sp.supplier_sku 
         AND u.supplier_id = sp.supplier_id
       ORDER BY u.received_at DESC, r.row_num DESC
       LIMIT 1) AS qty_on_order
    FROM core.supplier_product sp
    JOIN core.supplier s ON s.supplier_id = sp.supplier_id
    LEFT JOIN core.category c ON c.category_id = sp.category_id
    LEFT JOIN current_prices cp ON cp.supplier_product_id = sp.supplier_product_id
    LEFT JOIN latest_stock ls ON ls.supplier_product_id = sp.supplier_product_id
    WHERE sp.supplier_product_id = $1
  `;

  const result = await dbQuery<EnrichedProduct>(sql, [supplierProductId]);
  return result.rows[0] || null;
}

/**
 * Enrich multiple products in a single query to reduce connection overhead
 */
export async function enrichProductsForCategorization(
  supplierProductIds: string[]
): Promise<EnrichedProduct[]> {
  if (supplierProductIds.length === 0) return [];

  const sql = `
    WITH current_prices AS (
      SELECT DISTINCT ON (supplier_product_id)
        supplier_product_id,
        price,
        currency,
        valid_from
      FROM core.price_history
      WHERE is_current = true
      ORDER BY supplier_product_id, valid_from DESC
    ),
    latest_stock AS (
      SELECT DISTINCT ON (supplier_product_id)
        supplier_product_id,
        qty AS qty_on_hand
      FROM core.stock_on_hand
      ORDER BY supplier_product_id, as_of_ts DESC
    )
    SELECT 
      sp.supplier_product_id,
      sp.supplier_id,
      sp.supplier_sku,
      sp.name_from_supplier,
      sp.category_id,
      c.name AS category_name,
      c.path AS category_path,
      s.name AS supplier_name,
      s.code AS supplier_code,
      (SELECT r.brand 
       FROM spp.pricelist_row r
       JOIN spp.pricelist_upload u ON u.upload_id = r.upload_id
       WHERE r.supplier_sku = sp.supplier_sku 
         AND u.supplier_id = sp.supplier_id
         AND r.brand IS NOT NULL
         AND r.brand <> ''
       ORDER BY u.received_at DESC, r.row_num DESC
       LIMIT 1) AS brand,
      sp.uom,
      sp.pack_size,
      sp.barcode,
      sp.attrs_json,
      sp.is_active,
      sp.is_new,
      sp.first_seen_at,
      sp.last_seen_at,
      -- Latest raw category from supplier upload
      (SELECT r.category_raw 
       FROM spp.pricelist_row r
       JOIN spp.pricelist_upload u ON u.upload_id = r.upload_id
       WHERE r.supplier_sku = sp.supplier_sku 
         AND u.supplier_id = sp.supplier_id
         AND r.category_raw IS NOT NULL
         AND r.category_raw <> ''
       ORDER BY u.received_at DESC, r.row_num DESC
       LIMIT 1) AS category_raw,
      -- Current price
      cp.price AS current_price,
      cp.currency,
      -- Current stock
      ls.qty_on_hand,
      -- Quantity on order from latest pricelist
      (SELECT COALESCE((r.attrs_json->>'qty_on_order')::int, NULL)
       FROM spp.pricelist_row r
       JOIN spp.pricelist_upload u ON u.upload_id = r.upload_id
       WHERE r.supplier_sku = sp.supplier_sku 
         AND u.supplier_id = sp.supplier_id
       ORDER BY u.received_at DESC, r.row_num DESC
       LIMIT 1) AS qty_on_order
    FROM core.supplier_product sp
    JOIN core.supplier s ON s.supplier_id = sp.supplier_id
    LEFT JOIN core.category c ON c.category_id = sp.category_id
    LEFT JOIN current_prices cp ON cp.supplier_product_id = sp.supplier_product_id
    LEFT JOIN latest_stock ls ON ls.supplier_product_id = sp.supplier_product_id
    WHERE sp.supplier_product_id = ANY($1::uuid[])
  `;

  const result = await dbQuery<EnrichedProduct>(sql, [supplierProductIds]);
  return result.rows;
}

/**
 * Get uncategorized products with full enrichment
 */
export async function getUncategorizedProducts(filters?: {
  supplier_id?: string;
  limit?: number;
  offset?: number;
}): Promise<{ products: EnrichedProduct[]; total: number }> {
  const conditions: string[] = ['sp.is_active = true', 'sp.category_id IS NULL'];
  const params: any[] = [];
  let paramIndex = 1;

  if (filters?.supplier_id) {
    conditions.push(`sp.supplier_id = $${paramIndex++}`);
    params.push(filters.supplier_id);
  }

  const whereClause = conditions.join(' AND ');
  const limit = filters?.limit || 100;
  const offset = filters?.offset || 0;

  const sql = `
    WITH current_prices AS (
      SELECT DISTINCT ON (supplier_product_id)
        supplier_product_id,
        price,
        currency,
        valid_from
      FROM core.price_history
      WHERE is_current = true
      ORDER BY supplier_product_id, valid_from DESC
    ),
    latest_stock AS (
      SELECT DISTINCT ON (supplier_product_id)
        supplier_product_id,
        qty AS qty_on_hand
      FROM core.stock_on_hand
      ORDER BY supplier_product_id, as_of_ts DESC
    )
    SELECT 
      sp.supplier_product_id,
      sp.supplier_id,
      sp.supplier_sku,
      sp.name_from_supplier,
      sp.category_id,
      c.name AS category_name,
      c.path AS category_path,
      s.name AS supplier_name,
      s.code AS supplier_code,
      (SELECT r.brand 
       FROM spp.pricelist_row r
       JOIN spp.pricelist_upload u ON u.upload_id = r.upload_id
       WHERE r.supplier_sku = sp.supplier_sku 
         AND u.supplier_id = sp.supplier_id
         AND r.brand IS NOT NULL
         AND r.brand <> ''
       ORDER BY u.received_at DESC, r.row_num DESC
       LIMIT 1) AS brand,
      sp.uom,
      sp.pack_size,
      sp.barcode,
      sp.attrs_json,
      sp.is_active,
      sp.is_new,
      sp.first_seen_at,
      sp.last_seen_at,
      (SELECT r.category_raw 
       FROM spp.pricelist_row r
       JOIN spp.pricelist_upload u ON u.upload_id = r.upload_id
       WHERE r.supplier_sku = sp.supplier_sku 
         AND u.supplier_id = sp.supplier_id
         AND r.category_raw IS NOT NULL
         AND r.category_raw <> ''
       ORDER BY u.received_at DESC, r.row_num DESC
       LIMIT 1) AS category_raw,
      cp.price AS current_price,
      cp.currency,
      ls.qty_on_hand,
      (SELECT COALESCE((r.attrs_json->>'qty_on_order')::int, NULL)
       FROM spp.pricelist_row r
       JOIN spp.pricelist_upload u ON u.upload_id = r.upload_id
       WHERE r.supplier_sku = sp.supplier_sku 
         AND u.supplier_id = sp.supplier_id
       ORDER BY u.received_at DESC, r.row_num DESC
       LIMIT 1) AS qty_on_order
    FROM core.supplier_product sp
    JOIN core.supplier s ON s.supplier_id = sp.supplier_id
    LEFT JOIN core.category c ON c.category_id = sp.category_id
    LEFT JOIN current_prices cp ON cp.supplier_product_id = sp.supplier_product_id
    LEFT JOIN latest_stock ls ON ls.supplier_product_id = sp.supplier_product_id
    WHERE ${whereClause}
    ORDER BY sp.first_seen_at DESC
    LIMIT $${paramIndex++} OFFSET $${paramIndex}
  `;

  params.push(limit, offset);
  const result = await dbQuery<EnrichedProduct>(sql, params);

  // Get total count
  const countSql = `
    SELECT COUNT(*)::int AS total
    FROM core.supplier_product sp
    WHERE ${whereClause}
  `;
  const countResult = await dbQuery<{ total: number }>(countSql, params.slice(0, -2));
  const total = countResult.rows[0]?.total || 0;

  return { products: result.rows, total };
}

/**
 * Get products by supplier
 */
export async function getProductsBySupplier(
  supplierId: string,
  options?: { uncategorized_only?: boolean; limit?: number; offset?: number }
): Promise<{ products: EnrichedProduct[]; total: number }> {
  const conditions: string[] = ['sp.is_active = true', `sp.supplier_id = $1`];
  const params: any[] = [supplierId];

  if (options?.uncategorized_only) {
    conditions.push('sp.category_id IS NULL');
  }

  const whereClause = conditions.join(' AND ');
  const limit = options?.limit || 100;
  const offset = options?.offset || 0;

  const sql = `
    WITH current_prices AS (
      SELECT DISTINCT ON (supplier_product_id)
        supplier_product_id,
        price,
        currency,
        valid_from
      FROM core.price_history
      WHERE is_current = true
      ORDER BY supplier_product_id, valid_from DESC
    ),
    latest_stock AS (
      SELECT DISTINCT ON (supplier_product_id)
        supplier_product_id,
        qty AS qty_on_hand
      FROM core.stock_on_hand
      ORDER BY supplier_product_id, as_of_ts DESC
    )
    SELECT 
      sp.supplier_product_id,
      sp.supplier_id,
      sp.supplier_sku,
      sp.name_from_supplier,
      sp.category_id,
      c.name AS category_name,
      c.path AS category_path,
      s.name AS supplier_name,
      s.code AS supplier_code,
      (SELECT r.brand 
       FROM spp.pricelist_row r
       JOIN spp.pricelist_upload u ON u.upload_id = r.upload_id
       WHERE r.supplier_sku = sp.supplier_sku 
         AND u.supplier_id = sp.supplier_id
         AND r.brand IS NOT NULL
         AND r.brand <> ''
       ORDER BY u.received_at DESC, r.row_num DESC
       LIMIT 1) AS brand,
      sp.uom,
      sp.pack_size,
      sp.barcode,
      sp.attrs_json,
      sp.is_active,
      sp.is_new,
      sp.first_seen_at,
      sp.last_seen_at,
      (SELECT r.category_raw 
       FROM spp.pricelist_row r
       JOIN spp.pricelist_upload u ON u.upload_id = r.upload_id
       WHERE r.supplier_sku = sp.supplier_sku 
         AND u.supplier_id = sp.supplier_id
         AND r.category_raw IS NOT NULL
         AND r.category_raw <> ''
       ORDER BY u.received_at DESC, r.row_num DESC
       LIMIT 1) AS category_raw,
      cp.price AS current_price,
      cp.currency,
      ls.qty_on_hand,
      (SELECT COALESCE((r.attrs_json->>'qty_on_order')::int, NULL)
       FROM spp.pricelist_row r
       JOIN spp.pricelist_upload u ON u.upload_id = r.upload_id
       WHERE r.supplier_sku = sp.supplier_sku 
         AND u.supplier_id = sp.supplier_id
       ORDER BY u.received_at DESC, r.row_num DESC
       LIMIT 1) AS qty_on_order
    FROM core.supplier_product sp
    JOIN core.supplier s ON s.supplier_id = sp.supplier_id
    LEFT JOIN core.category c ON c.category_id = sp.category_id
    LEFT JOIN current_prices cp ON cp.supplier_product_id = sp.supplier_product_id
    LEFT JOIN latest_stock ls ON ls.supplier_product_id = sp.supplier_product_id
    WHERE ${whereClause}
    ORDER BY sp.name_from_supplier
    LIMIT $2 OFFSET $3
  `;

  const result = await dbQuery<EnrichedProduct>(sql, [supplierId, limit, offset]);

  const countSql = `
    SELECT COUNT(*)::int AS total
    FROM core.supplier_product sp
    WHERE ${whereClause}
  `;
  const countResult = await dbQuery<{ total: number }>(countSql, [supplierId]);
  const total = countResult.rows[0]?.total || 0;

  return { products: result.rows, total };
}

/**
 * Get full category hierarchy
 */
export async function getCategoryHierarchy(): Promise<CategoryHierarchy[]> {
  const sql = `
    SELECT 
      category_id,
      name,
      parent_id,
      path,
      level
    FROM core.category
    WHERE is_active = true
    ORDER BY path, name
  `;

  const result = await dbQuery<CategoryHierarchy>(sql);
  return result.rows;
}

/**
 * Extract specifications from attrs_json for AI analysis
 */
export function extractSpecifications(attrsJson: Record<string, any> | null): string[] {
  if (!attrsJson) return [];

  const specs: string[] = [];

  // Common specification fields
  const specFields = [
    'specifications',
    'specs',
    'features',
    'attributes',
    'dimensions',
    'weight',
    'material',
    'color',
    'size',
    'model',
    'type',
  ];

  for (const field of specFields) {
    if (attrsJson[field]) {
      if (typeof attrsJson[field] === 'string') {
        specs.push(`${field}: ${attrsJson[field]}`);
      } else if (Array.isArray(attrsJson[field])) {
        specs.push(`${field}: ${attrsJson[field].join(', ')}`);
      } else if (typeof attrsJson[field] === 'object') {
        specs.push(`${field}: ${JSON.stringify(attrsJson[field])}`);
      }
    }
  }

  // Extract any other key-value pairs that look like specifications
  for (const [key, value] of Object.entries(attrsJson)) {
    if (!specFields.includes(key) && value !== null && value !== undefined) {
      if (typeof value === 'string' && value.length > 0 && value.length < 200) {
        specs.push(`${key}: ${value}`);
      }
    }
  }

  return specs;
}
