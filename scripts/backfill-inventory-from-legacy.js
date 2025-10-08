/**
 * Backfill inventory_item from legacy inventory_items_legacy
 * - Maps legacy schema fields to enhanced singular schema
 * - Applies simple category mapping heuristics; defaults to 'finished_goods'
 * - Sets org_id from first organization row if legacy org is null
 */
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const cfg = {
  host: process.env.DB_HOST || '62.169.20.53',
  port: parseInt(process.env.DB_PORT || '6600', 10),
  database: process.env.DB_NAME || 'nxtprod-db_001',
  user: process.env.DB_USER || 'nxtdb_admin',
  password: process.env.DB_PASSWORD || 'P@33w0rd-1',
  ssl: false,
  max: 4,
  connectionTimeoutMillis: 30000,
  idleTimeoutMillis: 30000,
};

async function run() {
  const pool = new Pool(cfg);
  const client = await pool.connect();
  try {
    // Resolve default org id
    const orgRes = await client.query(
      `SELECT id FROM organization ORDER BY created_at NULLS LAST, id LIMIT 1`
    );
    if (orgRes.rowCount === 0) throw new Error('No organization found');
    const defaultOrgId = orgRes.rows[0].id;

    // Ensure legacy table exists
    const chk = await client.query(
      `SELECT to_regclass('public.inventory_items_legacy') as t`
    );
    if (!chk.rows[0].t) {
      console.log('No legacy table inventory_items_legacy found. Nothing to backfill.');
      return;
    }

    await client.query('BEGIN');
    // Insert/Upsert from legacy to singular table
    const sql = `
      INSERT INTO inventory_item (
        org_id,
        sku,
        name,
        description,
        category,
        unit_price,
        quantity_on_hand,
        quantity_reserved,
        reorder_point,
        max_stock_level,
        unit_of_measure,
        supplier_id,
        brand_id,
        barcode,
        location,
        weight_kg,
        dimensions_json,
        default_vat_rate_type,
        default_vat_rate,
        cost_price,
        markup_percentage,
        alternative_skus,
        tags,
        is_active,
        created_at,
        updated_at,
        stock_qty,
        reserved_qty,
        sale_price
      )
      SELECT
        COALESCE(NULLIF(i.organization_id::text, '')::uuid, $1::uuid) as org_id,
        i.sku,
        left(COALESCE(NULLIF(i.name, ''), NULLIF(i.product_name, ''), i.sku), 200) as name,
        COALESCE(i.description, '') as description,
        (
          CASE
            WHEN i.category ILIKE '%cable%' OR i.category ILIKE '%connector%' THEN 'components'
            WHEN i.category ILIKE '%consumable%' THEN 'consumables'
            WHEN i.category ILIKE '%tool%' THEN 'tools'
            WHEN i.category ILIKE '%packag%' THEN 'packaging'
            WHEN i.category ILIKE '%safety%' THEN 'safety_equipment'
            WHEN i.category ILIKE '%service%' THEN 'services'
            ELSE 'finished_goods'
          END
        )::inventory_category AS category,
        COALESCE(NULLIF(i.sale_price::text, '')::numeric, NULLIF(i.unit_price::text, '')::numeric, 0)::numeric as unit_price,
        COALESCE(i.stock_qty, i.current_stock, 0)::int as quantity_on_hand,
        LEAST(COALESCE(i.reserved_qty, 0)::int, COALESCE(i.stock_qty, i.current_stock, 0)::int) as quantity_reserved,
        COALESCE(i.reorder_point, i.reorder_level, 0)::int as reorder_point,
        (CASE WHEN COALESCE(i.max_stock, 0) > 0 THEN i.max_stock ELSE NULL END)::int as max_stock_level,
        COALESCE(NULLIF(i.unit, ''), 'each') as unit_of_measure,
        NULLIF(i.supplier_id::text, '')::uuid as supplier_id,
        NULL::uuid as brand_id,
        NULLIF(i.barcode, '') as barcode,
        NULLIF(i.location, '') as location,
        NULLIF(i.weight::text, '')::numeric as weight_kg,
        COALESCE(to_jsonb(i.dimensions), '{}'::jsonb) as dimensions_json,
        (CASE WHEN COALESCE(i.tax_rate::numeric, 15.00) = 0 THEN 'zero' ELSE 'standard' END)::vat_rate_type as default_vat_rate_type,
        COALESCE(i.tax_rate::numeric, 15.00) as default_vat_rate,
        COALESCE(i.cost_price::numeric, 0.00) as cost_price,
        (CASE WHEN COALESCE(i.cost_price::numeric,0) > 0 AND COALESCE(i.sale_price::numeric,0) > 0
              THEN ROUND(((i.sale_price::numeric - i.cost_price::numeric)/NULLIF(i.cost_price::numeric,0))*100,2)
              ELSE 0.00 END) as markup_percentage,
        '{}'::text[] as alternative_skus,
        COALESCE(i.tags, '{}')::text[] as tags,
        (i.status IS DISTINCT FROM 'inactive') as is_active,
        COALESCE(i.created_at, now()) as created_at,
        COALESCE(i.updated_at, now()) as updated_at,
        COALESCE(i.stock_qty, i.current_stock, 0)::int as stock_qty,
        COALESCE(i.reserved_qty, 0)::int as reserved_qty,
        COALESCE(NULLIF(i.sale_price::text, '')::numeric, NULLIF(i.unit_price::text, '')::numeric, 0)::numeric as sale_price
      FROM inventory_items_legacy i
      WHERE i.sku IS NOT NULL AND i.sku <> ''
      ON CONFLICT (org_id, sku) DO UPDATE SET
        org_id = EXCLUDED.org_id,
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        category = EXCLUDED.category,
        unit_price = EXCLUDED.unit_price,
        quantity_on_hand = EXCLUDED.quantity_on_hand,
        quantity_reserved = EXCLUDED.quantity_reserved,
        reorder_point = EXCLUDED.reorder_point,
        max_stock_level = EXCLUDED.max_stock_level,
        unit_of_measure = EXCLUDED.unit_of_measure,
        supplier_id = EXCLUDED.supplier_id,
        barcode = EXCLUDED.barcode,
        location = EXCLUDED.location,
        weight_kg = EXCLUDED.weight_kg,
        dimensions_json = EXCLUDED.dimensions_json,
        default_vat_rate_type = EXCLUDED.default_vat_rate_type,
        default_vat_rate = EXCLUDED.default_vat_rate,
        cost_price = EXCLUDED.cost_price,
        markup_percentage = EXCLUDED.markup_percentage,
        alternative_skus = EXCLUDED.alternative_skus,
        tags = EXCLUDED.tags,
        is_active = EXCLUDED.is_active,
        created_at = LEAST(inventory_item.created_at, EXCLUDED.created_at),
        updated_at = GREATEST(inventory_item.updated_at, EXCLUDED.updated_at),
        stock_qty = EXCLUDED.stock_qty,
        reserved_qty = EXCLUDED.reserved_qty,
        sale_price = EXCLUDED.sale_price
    `;

    const res = await client.query(sql, [defaultOrgId]);
    await client.query('COMMIT');
    console.log('Backfill complete. RowCount (ignored by pg for INSERT...SELECT with upsert):', res.rowCount);

    const counts = await client.query(
      `SELECT (SELECT count(*) FROM inventory_item)::int as target, (SELECT count(*) FROM inventory_items_legacy)::int as legacy`
    );
    console.log('Post-backfill counts:', counts.rows[0]);
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error('Backfill failed:', e.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((e) => {
  console.error('Unexpected error:', e);
  process.exit(1);
});
