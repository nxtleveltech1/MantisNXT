const { Client } = require("pg");
require("dotenv").config({ path: ".env.local" });

(async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    const { rows } = await client.query(`
      SELECT s.name, s.supplier_code, COUNT(i.*) AS item_count
      FROM inventory_items i
      LEFT JOIN suppliers s ON s.id = i.supplier_id
      GROUP BY s.name, s.supplier_code
      ORDER BY item_count DESC;
    `);
    console.log(rows);
  } finally {
    await client.end();
  }
})();
