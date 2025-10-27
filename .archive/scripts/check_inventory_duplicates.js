const { Client } = require("pg");
require("dotenv").config({ path: ".env.local" });

(async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    const { rows } = await client.query(`
      SELECT sku, COUNT(*)
      FROM inventory_items
      GROUP BY sku
      HAVING COUNT(*) > 1
      LIMIT 5;
    `);
    console.log(rows);
  } finally {
    await client.end();
  }
})();
