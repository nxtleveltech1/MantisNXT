const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_84ELeCFbOcGA@ep-steep-waterfall-a96wibpm-pooler.gwc.azure.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function checkSchema() {
  try {
    // Check if public schema tables exist
    const publicTables = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('inventory_items', 'suppliers', 'stock_movements')
    `);
    console.log('🔍 PUBLIC SCHEMA TABLES:', publicTables.rows.map(r => r.table_name).join(', ') || 'NONE FOUND');

    // Check core schema row counts
    const coreCounts = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM core.supplier) as suppliers,
        (SELECT COUNT(*) FROM core.product) as products,
        (SELECT COUNT(*) FROM core.stock_on_hand) as stock_on_hand,
        (SELECT COUNT(*) FROM core.supplier_product) as supplier_products
    `);
    console.log('📊 CORE SCHEMA COUNTS:', coreCounts.rows[0]);

    // Check if views exist
    const views = await pool.query(`
      SELECT table_name
      FROM information_schema.views
      WHERE table_schema = 'public'
    `);
    console.log('👁️ PUBLIC VIEWS:', views.rows.map(r => r.table_name).join(', ') || 'NONE FOUND');

    await pool.end();
    console.log('\n✅ Schema check complete');
  } catch (err) {
    console.error('❌ ERROR:', err.message);
    await pool.end();
    process.exit(1);
  }
}

checkSchema();
