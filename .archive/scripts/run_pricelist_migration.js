const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  user: "nxtdb_admin",
  password: "P@33w0rd-1",
  host: "62.169.20.53",
  port: 6600,
  database: "nxtprod-db_001",
  ssl: false,
});

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log('🔧 Running pricelist migration...');

    // Read migration file
    const migrationPath = path.join(__dirname, '../database/migrations/001_create_pricelist_tables_simple.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Execute migration
    await client.query(migrationSQL);

    console.log('✅ Pricelist migration completed successfully');

    // Test the tables
    const pricelistCount = await client.query('SELECT COUNT(*) FROM supplier_pricelists');
    const itemCount = await client.query('SELECT COUNT(*) FROM pricelist_items');

    console.log(`📊 Pricelists created: ${pricelistCount.rows[0].count}`);
    console.log(`📦 Pricelist items created: ${itemCount.rows[0].count}`);

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();