const { Client } = require("pg");
require("dotenv").config({ path: ".env.local" });

(async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    const { rows } = await client.query(`
      SELECT sku, supplier_sku, name, brand, stock_qty, cost_price
      FROM inventory_items
      ORDER BY created_at
      LIMIT 5;
    `);
    console.log(rows);
  } finally {
    await client.end();
  }
})();
