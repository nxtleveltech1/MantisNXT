const { Client } = require("pg");
require("dotenv").config({ path: ".env.local" });

const tableName = process.argv[2];
if (!tableName) {
  console.error("Usage: node get_table_structure.js <table>");
  process.exit(1);
}

(async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    const { rows } = await client.query(`
      SELECT
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
      ORDER BY ordinal_position;
    `, [tableName]);
    console.log(`Structure for ${tableName}:`);
    for (const row of rows) {
      console.log(`${row.column_name} | ${row.data_type} | nullable=${row.is_nullable} | default=${row.column_default} | max_length=${row.character_maximum_length}`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
})();
