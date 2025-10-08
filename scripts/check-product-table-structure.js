/**
 * Check Product Table Structure
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_84ELeCFbOcGA@ep-steep-waterfall-a96wibpm-pooler.gwc.azure.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  console.log('🔍 Product Table Structure Analysis\n');

  // Get column details
  const cols = await pool.query(`
    SELECT
      column_name,
      data_type,
      is_nullable,
      column_default
    FROM information_schema.columns
    WHERE table_schema = 'core' AND table_name = 'product'
    ORDER BY ordinal_position
  `);

  console.log('📊 core.product columns:');
  console.table(cols.rows);

  // Sample data
  const sample = await pool.query('SELECT * FROM core.product LIMIT 3');
  console.log('\n📝 Sample product data:');
  console.log(JSON.stringify(sample.rows, null, 2));

  await pool.end();
}

main().catch(console.error);
