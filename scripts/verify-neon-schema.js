/**
 * Verify Neon Database Schema - What tables actually exist?
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_84ELeCFbOcGA@ep-steep-waterfall-a96wibpm-pooler.gwc.azure.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  console.log('🔍 Neon Schema Verification\n');

  // 1. List all schemas
  console.log('📁 Schemas:');
  const schemas = await pool.query(`
    SELECT schema_name
    FROM information_schema.schemata
    WHERE schema_name NOT IN ('pg_catalog', 'information_schema')
    ORDER BY schema_name
  `);
  schemas.rows.forEach(r => console.log(`  - ${r.schema_name}`));

  // 2. List all tables in core schema
  console.log('\n📋 Tables in core schema:');
  const coreTables = await pool.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'core'
    ORDER BY table_name
  `);
  coreTables.rows.forEach(r => console.log(`  - core.${r.table_name}`));

  // 3. List all tables in public schema (if any)
  console.log('\n📋 Tables in public schema:');
  const publicTables = await pool.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
  `);
  if (publicTables.rows.length === 0) {
    console.log('  (none)');
  } else {
    publicTables.rows.forEach(r => console.log(`  - public.${r.table_name}`));
  }

  // 4. Check specific tables the API expects
  console.log('\n🔎 Checking API-expected tables:');

  const expectedTables = [
    { schema: 'public', table: 'suppliers' },
    { schema: 'public', table: 'inventory_items' },
    { schema: 'public', table: 'products' },
    { schema: 'core', table: 'supplier' },
    { schema: 'core', table: 'product' },
    { schema: 'core', table: 'stock_on_hand' }
  ];

  for (const { schema, table } of expectedTables) {
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = $1 AND table_name = $2
      ) as exists
    `, [schema, table]);

    const exists = result.rows[0].exists;
    const icon = exists ? '✅' : '❌';
    console.log(`  ${icon} ${schema}.${table}`);

    if (exists) {
      // Get row count
      const count = await pool.query(`SELECT COUNT(*) as count FROM ${schema}.${table}`);
      console.log(`     Rows: ${count.rows[0].count}`);
    }
  }

  // 5. Check for stock_movements table
  console.log('\n🔎 Stock movements table:');
  const stockMovements = await pool.query(`
    SELECT table_schema, table_name
    FROM information_schema.tables
    WHERE table_name LIKE '%movement%'
  `);
  if (stockMovements.rows.length === 0) {
    console.log('  ❌ No stock_movements table found');
  } else {
    stockMovements.rows.forEach(r => {
      console.log(`  ✅ ${r.table_schema}.${r.table_name}`);
    });
  }

  // 6. Show stock_on_hand structure
  console.log('\n📊 core.stock_on_hand structure:');
  const sohCols = await pool.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'core' AND table_name = 'stock_on_hand'
    ORDER BY ordinal_position
  `);
  sohCols.rows.forEach(r => {
    console.log(`  - ${r.column_name}: ${r.data_type} ${r.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
  });

  // 7. Show supplier_product structure
  console.log('\n📊 core.supplier_product structure:');
  const spCols = await pool.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'core' AND table_name = 'supplier_product'
    ORDER BY ordinal_position
  `);
  spCols.rows.forEach(r => {
    console.log(`  - ${r.column_name}: ${r.data_type} ${r.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
  });

  // 8. Critical finding: What column should we use for "value"?
  console.log('\n💰 Value/Price columns in stock_on_hand:');
  const valueCheck = await pool.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'core'
      AND table_name = 'stock_on_hand'
      AND (
        column_name LIKE '%value%'
        OR column_name LIKE '%price%'
        OR column_name LIKE '%cost%'
      )
  `);
  if (valueCheck.rows.length === 0) {
    console.log('  ⚠️  No value/price/cost columns found!');
    console.log('  Need to calculate: qty * supplier_product.price');
  } else {
    valueCheck.rows.forEach(r => {
      console.log(`  - ${r.column_name}: ${r.data_type}`);
    });
  }

  await pool.end();
  console.log('\n✅ Schema verification complete\n');
}

main().catch(console.error);
