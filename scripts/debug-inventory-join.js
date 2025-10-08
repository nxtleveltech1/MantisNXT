require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
(async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const res = await pool.query('SELECT i.name, i.sku, s.name AS supplier_name, i.cost_price, i.stock_qty, (i.stock_qty * i.cost_price) AS total_value FROM inventory_items i LEFT JOIN suppliers s ON i.supplier_id = s.id LIMIT 5');
    console.log(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
})();
