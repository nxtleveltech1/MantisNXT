/**
 * Check Neon Database Schema
 * Verifies what tables actually exist and their structure
 */

require('dotenv').config({ path: '.env.local' });
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkSchema() {
  try {
    console.log("🔍 Checking Neon Database Schema...\n");

    // Check all schemas
    console.log("1. Available Schemas:");
    const schemas = await pool.query(`
      SELECT schema_name
      FROM information_schema.schemata
      WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
      ORDER BY schema_name
    `);
    console.log(schemas.rows);

    // Check tables in public schema
    console.log("\n2. Tables in 'public' schema:");
    const publicTables = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    console.log(publicTables.rows);

    // Check tables in core schema (if exists)
    console.log("\n3. Tables in 'core' schema:");
    const coreTables = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'core' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    console.log(coreTables.rows);

    // Check views
    console.log("\n4. Views in database:");
    const views = await pool.query(`
      SELECT table_schema, table_name
      FROM information_schema.views
      WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
      ORDER BY table_schema, table_name
    `);
    console.log(views.rows);

    // Check if specific tables exist
    console.log("\n5. Checking for specific tables:");
    const specificTables = ['suppliers', 'inventory_items', 'inventory_item'];
    for (const tableName of specificTables) {
      const result = await pool.query(`
        SELECT
          table_schema,
          table_name,
          table_type
        FROM information_schema.tables
        WHERE table_name = $1
        ORDER BY table_schema
      `, [tableName]);
      console.log(`${tableName}:`, result.rows.length > 0 ? result.rows : 'NOT FOUND');
    }

    // Check inventory_items structure if it exists
    console.log("\n6. Checking inventory_items/inventory_item columns:");
    const invColumns = await pool.query(`
      SELECT
        table_schema,
        table_name,
        column_name,
        data_type,
        is_nullable
      FROM information_schema.columns
      WHERE table_name IN ('inventory_items', 'inventory_item')
      ORDER BY table_schema, table_name, ordinal_position
      LIMIT 20
    `);
    console.log(invColumns.rows);

    // Check core.supplier_product if it exists
    console.log("\n7. Checking core.supplier_product structure:");
    const coreColumns = await pool.query(`
      SELECT
        column_name,
        data_type,
        is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'core' AND table_name = 'supplier_product'
      ORDER BY ordinal_position
      LIMIT 20
    `);
    console.log(coreColumns.rows);

    // Sample data count
    console.log("\n8. Row counts:");
    const counts = await pool.query(`
      SELECT
        schemaname,
        tablename,
        n_tup_ins as row_count
      FROM pg_stat_user_tables
      WHERE schemaname IN ('public', 'core')
      ORDER BY schemaname, tablename
    `);
    console.log(counts.rows);

    console.log("\n✅ Schema check complete");
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error("❌ Schema check failed:", error.message);
    console.error(error);
    await pool.end();
    process.exit(1);
  }
}

checkSchema();
