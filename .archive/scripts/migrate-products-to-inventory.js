#!/usr/bin/env node

const { Pool } = require('pg');

// Use same defaults as other scripts; override with env vars if provided
const pool = new Pool({
  user: process.env.DB_USER || 'nxtdb_admin',
  password: process.env.DB_PASSWORD || 'P@33w0rd-1',
  host: process.env.DB_HOST || '62.169.20.53',
  port: parseInt(process.env.DB_PORT || '6600', 10),
  database: process.env.DB_NAME || 'nxtprod-db_001',
  ssl: false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,
});

async function migrateProductsToInventory() {
  console.log('🚀 Migrating products into inventory_items (by SKU)…');

  try {
    await pool.query('SELECT 1');
    console.log('✅ Database connected');

    const counts = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM "Product")::int as total_products,
        (SELECT COUNT(*) FROM inventory_items)::int as total_inventory,
        (SELECT COUNT(*) FROM "Product" p LEFT JOIN inventory_items i ON i.sku = p.sku WHERE i.id IS NULL)::int as missing
    `);
    const { total_products, total_inventory, missing } = counts.rows[0];
    console.log(`ℹ️  Product rows: ${total_products}, inventory_items rows: ${total_inventory}, to insert: ${missing}`);

    if (missing === 0) {
      console.log('✅ No missing items to migrate. Done.');
      return;
    }

    // Insert missing products by SKU with safe defaults
    const insertSql = `
      INSERT INTO inventory_items (
        sku,
        name,
        stock_qty,
        reserved_qty,
        available_qty,
        cost_price,
        sale_price,
        supplier_id,
        reorder_point,
        created_at,
        updated_at
      )
      SELECT
        p.sku,
        COALESCE(p.name, p.sku) as name,
        0 as stock_qty,
        0 as reserved_qty,
        0 as available_qty,
        NULL as cost_price,
        NULL as sale_price,
        CASE WHEN p."supplierId" IS NULL THEN NULL ELSE p."supplierId"::text END as supplier_id,
        0 as reorder_point,
        NOW(),
        NOW()
      FROM "Product" p
      LEFT JOIN inventory_items i ON i.sku = p.sku
      WHERE i.id IS NULL AND p.sku IS NOT NULL
    `;

    const res = await pool.query(insertSql);
    console.log(`✅ Inserted ${res.rowCount || 0} missing inventory items`);

    // Index to speed up lookups by SKU
    await pool.query('CREATE INDEX IF NOT EXISTS idx_inventory_items_sku ON inventory_items(sku)');
    console.log('✅ Ensured index: idx_inventory_items_sku');

    console.log('🎉 Migration complete');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

migrateProductsToInventory();

