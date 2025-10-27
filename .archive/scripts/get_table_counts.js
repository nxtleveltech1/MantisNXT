const { Client } = require("pg");
require("dotenv").config({ path: ".env.local" });

const tables = process.argv.slice(2);
if (tables.length === 0) {
  console.error("Usage: node get_table_counts.js <table1> [table2 ...]");
  process.exit(1);
}

(async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    for (const table of tables) {
      try {
        const { rows } = await client.query(`SELECT COUNT(*)::int AS count FROM ${table};`);
        console.log(`${table}: ${rows[0].count}`);
      } catch (err) {
        console.error(`Error querying ${table}:`, err.message);
      }
    }
  } finally {
    await client.end();
  }
})();
