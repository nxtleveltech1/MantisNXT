const { Client } = require("pg");
require("dotenv").config({ path: ".env.local" });

(async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    const sql = `
      SELECT table_schema, table_name, table_type
      FROM information_schema.tables
      WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
        AND table_name ILIKE '%inventory%'
      ORDER BY table_schema, table_name;
    `;
    const tables = await client.query(sql);
    console.log("Inventory-related tables/views:");
    for (const row of tables.rows) {
      console.log(`- ${row.table_schema}.${row.table_name} (${row.table_type})`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
})();
