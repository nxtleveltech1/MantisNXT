#!/usr/bin/env node
// Applies targeted fixes to Neon schema: missing serve view and stock_location index

require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  console.log('Applying targeted Neon schema fixes...');

  // 1) Ensure serve.v_soh_rolled_up exists (from 003_create_serve_schema.sql)
  const viewSQL = `
CREATE SCHEMA IF NOT EXISTS serve;
CREATE OR REPLACE VIEW serve.v_soh_rolled_up AS
WITH latest_stock AS (
  SELECT DISTINCT ON (location_id, supplier_product_id)
    supplier_product_id,
    qty,
    unit_cost,
    total_value,
    as_of_ts
  FROM core.stock_on_hand
  ORDER BY location_id, supplier_product_id, as_of_ts DESC
),
current_prices AS (
  SELECT DISTINCT ON (supplier_product_id)
    supplier_product_id,
    price,
    currency
  FROM core.price_history
  WHERE is_current = true
  ORDER BY supplier_product_id, valid_from DESC
),
product_stock AS (
  SELECT
    p.product_id,
    p.name as product_name,
    c.name as category_name,
    sp.supplier_id,
    s.name as supplier_name,
    SUM(soh.qty) as supplier_qty,
    AVG(COALESCE(soh.unit_cost, cp.price, 0)) as avg_cost,
    SUM(COALESCE(soh.total_value, soh.qty * cp.price, 0)) as supplier_value,
    MAX(soh.as_of_ts) as as_of_ts
  FROM latest_stock soh
  JOIN core.supplier_product sp ON sp.supplier_product_id = soh.supplier_product_id
  JOIN core.product p ON p.product_id = sp.product_id
  JOIN core.supplier s ON s.supplier_id = sp.supplier_id
  LEFT JOIN core.category c ON c.category_id = p.category_id
  LEFT JOIN current_prices cp ON cp.supplier_product_id = sp.supplier_product_id
  WHERE sp.product_id IS NOT NULL
  GROUP BY p.product_id, p.name, c.name, sp.supplier_id, s.name
)
SELECT
  product_id,
  product_name,
  category_name,
  SUM(supplier_qty) as total_qty,
  COUNT(DISTINCT supplier_id)::integer as supplier_count,
  SUM(supplier_value) as total_value,
  SUM(supplier_value) / NULLIF(SUM(supplier_qty), 0) as weighted_avg_cost,
  jsonb_agg(
    jsonb_build_object(
      'supplier_id', supplier_id,
      'supplier_name', supplier_name,
      'qty', supplier_qty,
      'value', supplier_value
    ) ORDER BY supplier_name
  ) as suppliers,
  MAX(as_of_ts) as as_of_ts
FROM product_stock
GROUP BY product_id, product_name, category_name;`;

  // 2) Ensure index on core.stock_location(supplier_id)
  const indexSQL = `
CREATE INDEX IF NOT EXISTS idx_core_stock_location_supplier_id
  ON core.stock_location(supplier_id);`;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(viewSQL);
    await client.query(indexSQL);
    await client.query('COMMIT');
    console.log('Fixes applied successfully.');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Failed applying fixes:', e.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});

