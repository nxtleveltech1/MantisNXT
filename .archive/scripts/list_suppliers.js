const { Client } = require("pg");
require("dotenv").config({ path: ".env.local" });

(async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    const { rows } = await client.query(`
      SELECT id, supplier_code, name, supplier_name, company_name
      FROM suppliers
      ORDER BY COALESCE(name, supplier_name, company_name);
    `);
    console.log("Suppliers:");
    for (const row of rows) {
      const displayName = row.name || row.supplier_name || row.company_name || "";
      console.log(`${displayName} | ${row.supplier_code || "<missing>"} | ${row.id}`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
})();
