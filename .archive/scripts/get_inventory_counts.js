const { Client } = require("pg");
require("dotenv").config({ path: ".env.local" });

(async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    const tables = ['inventory_items', 'inventory_item'];
    for (const table of tables) {
      const { rows } = await client.query(`SELECT COUNT(*)::int AS count FROM ${table};`);
      console.log(`${table}: ${rows[0].count}`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
})();
