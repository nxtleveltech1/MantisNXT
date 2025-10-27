const { Client } = require("pg");
require("dotenv").config({ path: ".env.local" });

const tableName = process.argv[2] || "inventory_items";

(async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    const sql = `
      SELECT
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS referenced_table,
        ccu.column_name AS referenced_column,
        rc.delete_rule
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.constraint_schema = kcu.constraint_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.constraint_schema = tc.constraint_schema
      JOIN information_schema.referential_constraints AS rc
        ON rc.constraint_name = tc.constraint_name
        AND rc.constraint_schema = tc.constraint_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND ccu.table_name = $1
      ORDER BY tc.table_name, kcu.column_name;
    `;
    const { rows } = await client.query(sql, [tableName]);
    console.log(`Foreign keys referencing ${tableName}:`);
    for (const row of rows) {
      console.log(`- ${row.table_name}.${row.column_name} -> ${row.referenced_table}.${row.referenced_column} (on delete: ${row.delete_rule})`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
})();
