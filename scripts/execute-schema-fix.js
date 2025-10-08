// Execute critical database schema fixes
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function executeSchemaMigration() {
  const pool = new Pool({
    host: '62.169.20.53',
    port: 6600,
    database: 'nxtprod-db_001',
    user: 'nxtdb_admin',
    password: 'P@33w0rd-1',
    ssl: false,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  try {
    console.log('🔧 Connecting to database...');
    await pool.connect();
    console.log('✅ Connected to database');

    // Read the SQL file
    const sqlPath = path.join(__dirname, 'fix-critical-database-schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('🚀 Executing schema fixes...');
    const result = await pool.query(sql);
    console.log('✅ Schema fixes applied successfully');

    // Test critical queries
    console.log('🧪 Testing critical queries...');

    // Test supplier query with new columns
    const supplierTest = await pool.query(`
      SELECT id, name, current_stock, overall_rating, tier, timestamp
      FROM suppliers
      LIMIT 3
    `);
    console.log(`✅ Supplier query test: ${supplierTest.rows.length} rows`);

    // Test analytics recommendations table
    const analyticsTest = await pool.query(`
      SELECT COUNT(*) as count FROM analytics_recommendations
    `);
    console.log(`✅ Analytics recommendations table: ${analyticsTest.rows[0].count} records`);

    // Test inventory items with new columns
    const inventoryTest = await pool.query(`
      SELECT id, sku, name, current_stock, reorder_point, organization_id
      FROM inventory_items
      LIMIT 3
    `);
    console.log(`✅ Inventory query test: ${inventoryTest.rows.length} rows`);

    console.log('🎉 All database schema fixes completed successfully!');

  } catch (error) {
    console.error('❌ Schema fix failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

executeSchemaMigration();