/**
 * Check Inventory Schema
 * Analyze the actual structure of the inventory_items table
 */

const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'nxtdb_admin',
  password: process.env.DB_PASSWORD || 'P@33w0rd-1',
  host: process.env.DB_HOST || '62.169.20.53',
  port: parseInt(process.env.DB_PORT || '6600'),
  database: process.env.DB_NAME || 'nxtprod-db_001',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 30000,
  ssl: false
});

async function checkInventorySchema() {
  console.log('🔍 Checking inventory table schema...');

  try {
    // Check if inventory_items table exists and get its structure
    const schemaQuery = `
      SELECT
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'inventory_items'
      ORDER BY ordinal_position;
    `;

    const schema = await pool.query(schemaQuery);

    console.log('📋 Inventory Items Table Schema:');
    schema.rows.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable}, default: ${col.column_default})`);
    });

    // Check total count
    const countQuery = `SELECT COUNT(*) as total_count FROM inventory_items`;
    const count = await pool.query(countQuery);
    console.log(`\n📊 Total inventory items: ${count.rows[0].total_count}`);

    // Check a sample of data to understand structure
    const sampleQuery = `SELECT * FROM inventory_items LIMIT 5`;
    const sample = await pool.query(sampleQuery);

    console.log('\n📋 Sample inventory data:');
    sample.rows.forEach((row, index) => {
      console.log(`  Item ${index + 1}:`, JSON.stringify(row, null, 2));
    });

  } catch (error) {
    console.error('❌ Error checking inventory schema:', error);
  } finally {
    await pool.end();
  }
}

checkInventorySchema().catch(console.error);