require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const pool = new Pool({
  host: process.env.DB_HOST || '62.169.20.53',
  port: parseInt(process.env.DB_PORT || '6600', 10),
  database: process.env.DB_NAME || 'nxtprod-db_001',
  user: process.env.DB_USER || 'nxtdb_admin',
  password: process.env.DB_PASSWORD || 'P@33w0rd-1',
  ssl: false,
});

(async () => {
  try {
    const r = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name in ('inventory_item','inventory_items') order by table_name`);
    console.log('Tables:', r.rows);
    const c = await pool.query(`SELECT column_name,data_type,is_nullable,column_default FROM information_schema.columns WHERE table_schema='public' AND table_name='inventory_item' ORDER BY ordinal_position`);
    console.log('inventory_item columns:', c.rows);
  } catch (e) {
    console.error('Query error:', e);
  } finally {
    await pool.end();
  }
})();

