const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_84ELeCFbOcGA@ep-steep-waterfall-a96wibpm-pooler.gwc.azure.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function testQueries() {
  console.log('Testing database queries...');

  try {
    const inventory = await pool.query('SELECT COUNT(*) FROM inventory_items');
    console.log('Inventory items:', inventory.rows[0].count);

    const suppliers = await pool.query('SELECT COUNT(*) FROM suppliers WHERE status = $1', ['active']);
    console.log('Active suppliers:', suppliers.rows[0].count);

    await pool.end();
    console.log('SUCCESS - Database working');
  } catch (err) {
    console.error('ERROR:', err.message);
    await pool.end();
    process.exit(1);
  }
}

testQueries();
