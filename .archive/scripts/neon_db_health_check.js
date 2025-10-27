#!/usr/bin/env node
/**
 * Neon DB Health Check
 * Verifies schemas, tables, views, indexes, FKs, and helper functions
 * Uses DATABASE_URL from .env.local (or environment)
 */

require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function query(sql, params = []) {
  const res = await pool.query(sql, params);
  return res.rows;
}

async function main() {
  const report = { ok: true, issues: [] };
  console.log('Neon DB Health Check');
  console.log('='.repeat(80));

  // Connectivity
  try {
    const now = await query('SELECT NOW() AS now');
    console.log(`Connectivity: OK (${now[0].now.toISOString ? now[0].now.toISOString() : now[0].now})`);
  } catch (e) {
    report.ok = false;
    report.issues.push(`Connectivity failed: ${e.message}`);
  }

  // Schemas
  const expectedSchemas = ['spp', 'core', 'serve'];
  const schemas = await query(`
    SELECT schema_name FROM information_schema.schemata
    WHERE schema_name = ANY($1)
    ORDER BY schema_name
  `, [expectedSchemas]);
  const foundSchemas = schemas.map(r => r.schema_name);
  expectedSchemas.forEach(s => {
    if (!foundSchemas.includes(s)) {
      report.ok = false;
      report.issues.push(`Missing schema: ${s}`);
    }
  });
  console.log('Schemas:', foundSchemas.join(', ') || '(none)');

  // SPP tables (staging)
  const sppTablesExpected = ['pricelist_upload', 'pricelist_row'];
  const sppTables = await query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'spp' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);
  const sppFound = sppTables.map(r => r.table_name);
  const sppMissing = sppTablesExpected.filter(t => !sppFound.includes(t));
  console.log(`spp tables (${sppFound.length}):`, sppFound.join(', '));
  if (sppMissing.length) {
    report.ok = false;
    report.issues.push(`Missing spp tables: ${sppMissing.join(', ')}`);
  }

  // Core tables
  const coreTablesExpected = [
    'supplier', 'category', 'category_map', 'product', 'supplier_product',
    'price_history', 'inventory_selection', 'inventory_selected_item',
    'stock_location', 'stock_on_hand', 'stock_movement',
    'analytics_anomalies', 'analytics_predictions', 'analytics_dashboard_config',
    'supplier_pricelists', 'pricelist_items', 'purchase_orders', 'purchase_order_items', 'brand'
  ];
  const coreTables = await query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'core' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);
  const coreFound = coreTables.map(r => r.table_name);
  const coreMissing = coreTablesExpected.filter(t => !coreFound.includes(t));
  console.log(`core tables (${coreFound.length}):`, coreFound.join(', '));
  if (coreMissing.length) {
    report.ok = false;
    report.issues.push(`Missing core tables: ${coreMissing.join(', ')}`);
  }

  // Serve views
  const serveViewsExpected = [
    'v_product_table_by_supplier', 'v_selected_catalog', 'v_soh_by_supplier', 'v_nxt_soh', 'v_soh_rolled_up'
  ];
  const serveViews = await query(`
    SELECT table_name FROM information_schema.views
    WHERE table_schema = 'serve'
    ORDER BY table_name
  `);
  const serveFound = serveViews.map(r => r.table_name);
  const serveMissing = serveViewsExpected.filter(v => !serveFound.includes(v));
  console.log(`serve views (${serveFound.length}):`, serveFound.join(', '));
  if (serveMissing.length) {
    report.ok = false;
    report.issues.push(`Missing serve views: ${serveMissing.join(', ')}`);
  }

  // Indexes (sample checks based on migration 002)
  const coreIndexes = await query(`
    SELECT tablename, indexname FROM pg_indexes WHERE schemaname = 'core'
    ORDER BY tablename, indexname
  `);
  if (coreIndexes.length) {
    console.log('core indexes:');
    coreIndexes.forEach(r => console.log(` - ${r.tablename}.${r.indexname}`));
  } else {
    console.log('core indexes: (none)');
  }
  const idxByTable = coreIndexes.reduce((acc, r) => {
    (acc[r.tablename] ||= []).push(r.indexname);
    return acc;
  }, {});
  function ensureIndexContains(table, substrings, label) {
    const list = (idxByTable[table] || []).map(n => n.toLowerCase());
    const ok = substrings.some(sub => list.some(n => n.includes(sub.toLowerCase())));
    if (!ok) {
      report.ok = false;
      report.issues.push(`Missing index on core.${table} (${label})`);
    }
  }
  // Minimal set (accept existing naming patterns)
  // supplier: active (optional: name index is desirable but not critical)
  ensureIndexContains('supplier', ['active'], 'active');
  // product: category
  ensureIndexContains('product', ['category'], 'category');
  // supplier_product: supplier_id and active
  ensureIndexContains('supplier_product', ['supplier_id'], 'supplier_id');
  ensureIndexContains('supplier_product', ['active'], 'active');
  // price_history: supplier_product_id
  ensureIndexContains('price_history', ['supplier_product_id'], 'supplier_product_id');
  // inventory_selection: status
  ensureIndexContains('inventory_selection', ['status'], 'status');
  // inventory_selected_item: selection_id
  ensureIndexContains('inventory_selected_item', ['selection_id'], 'selection_id');
  // stock_location: supplier_id
  ensureIndexContains('stock_location', ['supplier_id'], 'supplier_id');
  // stock_on_hand: supplier_product_id or location_id
  ensureIndexContains('stock_on_hand', ['supplier_product_id', 'location_id'], 'supplier_product_id/location_id');

  // Foreign keys count sanity
  const fkCount = await query(`
    SELECT COUNT(*)::int AS cnt
    FROM information_schema.table_constraints
    WHERE constraint_type = 'FOREIGN KEY' AND table_schema = 'core'
  `);
  const fkCnt = fkCount[0]?.cnt || 0;
  console.log('core foreign keys:', fkCnt);
  if (fkCnt < 8) {
    report.ok = false;
    report.issues.push(`Unexpectedly low FK count in core: ${fkCnt}`);
  }

  // Helper function existence
  const funcs = await query(`
    SELECT proname FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE proname = 'update_updated_at_column'
  `);
  if (funcs.length === 0) {
    report.ok = false;
    report.issues.push('Missing function update_updated_at_column()');
  }

  // Identity/sequence default on stock_movement.movement_id (BIGINT)
  const idDef = await query(`
    SELECT column_default FROM information_schema.columns
    WHERE table_schema = 'core' AND table_name = 'stock_movement' AND column_name = 'movement_id'
  `);
  if (!idDef.length || !String(idDef[0].column_default || '').includes('nextval')) {
    report.ok = false;
    report.issues.push('core.stock_movement.movement_id is missing identity/sequence default');
  }

  console.log('\n' + '='.repeat(80));
  if (report.ok) {
    console.log('DB Health: OK (schemas, tables, views, indexes, FKs present)');
  } else {
    console.log('DB Health: ISSUES FOUND');
    report.issues.forEach((i) => console.log(' - ' + i));
  }

  await pool.end();
  process.exit(report.ok ? 0 : 1);
}

main().catch(async (e) => {
  console.error('Health check failed:', e);
  try { await pool.end(); } catch {}
  process.exit(1);
});
