const { Client } = require("pg");
require("dotenv").config({ path: ".env.local" });

const tableName = process.argv[2];
if (!tableName) {
  console.error("Usage: node get_unique_constraints.js <table>");
  process.exit(1);
}

(async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    const { rows } = await client.query(`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_schema = 'public'
        AND table_name = $1
        AND constraint_type IN ('UNIQUE', 'PRIMARY KEY');
    `, [tableName]);
    console.log(rows);
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
})();
