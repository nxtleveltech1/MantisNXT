const { Pool } = require("pg");
const { table } = require("console");
require("dotenv").config({ path: ".env.local" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 10, idleTimeoutMillis: 30000 });

const tablesInOrder = [
  "purchase_order_items",
  "stock_movements",
  "supplier_invoice_items",
  "purchase_order_item",
  "stock_movement",
  "quote_items",
  "sales_order_items",
  "price_list_item",
  "price_change_history",
  "supplier_product",
  "stock_level",
  "inventory_items",
  "inventory_item"
];

async function getCounts(client, tables) {
  const counts = {};
  for (const tableName of tables) {
    try {
      const { rows } = await client.query(`SELECT COUNT(*)::int AS count FROM ${tableName};`);
      counts[tableName] = rows[0].count;
    } catch (err) {
      counts[tableName] = `error: ${err.message}`;
    }
  }
  return counts;
}

(async () => {
  const client = await pool.connect();
  try {
    console.log("Starting inventory purge...");
    const preCounts = await getCounts(client, tablesInOrder);
    console.log("Pre-purge counts:");
    console.table(preCounts);

    await client.query("BEGIN");

    for (const tableName of tablesInOrder) {
      const before = preCounts[tableName];
      console.log(`Deleting from ${tableName} (before: ${before})...`);
      await client.query(`DELETE FROM ${tableName};`);
    }

    await client.query("COMMIT");

    const postCounts = await getCounts(client, tablesInOrder);
    console.log("Post-purge counts:");
    console.table(postCounts);

    // Also run analyze for the main tables
    await client.query("ANALYZE inventory_items;");
    await client.query("ANALYZE inventory_item;");

    console.log("Inventory purge completed successfully.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Inventory purge failed:", err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
})();
