/**
 * Deploy Emergency Compatibility Views to Neon
 * This script creates the view layer to restore API functionality
 */

require('dotenv').config({ path: '.env.local' });
const { Pool } = require("pg");
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function deployViews() {
  try {
    console.log("🚀 Deploying Emergency Compatibility Views to Neon...\n");

    // Read the SQL file
    const sqlPath = path.join(__dirname, '..', 'database', 'migrations', 'neon', '001_emergency_compatibility_views.sql');
    console.log(`📖 Reading SQL file: ${sqlPath}`);

    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log(`✅ SQL file loaded (${sql.length} characters)\n`);

    // Execute the SQL
    console.log("⚙️ Executing SQL script...");
    await pool.query(sql);
    console.log("✅ SQL script executed successfully\n");

    // Validation: Check if views were created
    console.log("🔍 Validating view creation...\n");

    const viewCheck = await pool.query(`
      SELECT table_schema, table_name
      FROM information_schema.views
      WHERE table_name IN ('suppliers', 'inventory_items', 'inventory_item')
      ORDER BY table_name
    `);

    if (viewCheck.rows.length === 0) {
      throw new Error("Views were not created!");
    }

    console.log("✅ Views created:");
    viewCheck.rows.forEach(row => {
      console.log(`  - ${row.table_schema}.${row.table_name}`);
    });

    // Test 1: Count suppliers
    console.log("\n📊 Test 1: Counting suppliers...");
    const suppliersCount = await pool.query('SELECT COUNT(*) as count FROM suppliers');
    console.log(`✅ Suppliers count: ${suppliersCount.rows[0].count}`);

    // Test 2: Count inventory items
    console.log("\n📊 Test 2: Counting inventory items...");
    const inventoryCount = await pool.query('SELECT COUNT(*) as count FROM inventory_items');
    console.log(`✅ Inventory items count: ${inventoryCount.rows[0].count}`);

    // Test 3: Sample data from suppliers
    console.log("\n📊 Test 3: Sample suppliers data...");
    const sampleSuppliers = await pool.query('SELECT id, name, status FROM suppliers LIMIT 3');
    console.log("Sample suppliers:");
    sampleSuppliers.rows.forEach(row => {
      console.log(`  - ID: ${row.id}, Name: ${row.name}, Status: ${row.status}`);
    });

    // Test 4: Sample data from inventory_items
    console.log("\n📊 Test 4: Sample inventory data...");
    const sampleInventory = await pool.query(`
      SELECT id, sku, name, stock_qty, supplier_id
      FROM inventory_items
      LIMIT 3
    `);
    console.log("Sample inventory items:");
    sampleInventory.rows.forEach(row => {
      console.log(`  - SKU: ${row.sku}, Name: ${row.name}, Stock: ${row.stock_qty}, Supplier ID: ${row.supplier_id}`);
    });

    // Test 5: Join test
    console.log("\n📊 Test 5: Join test (inventory + suppliers)...");
    const joinTest = await pool.query(`
      SELECT
        i.sku,
        i.name as product_name,
        s.name as supplier_name,
        i.stock_qty
      FROM inventory_items i
      JOIN suppliers s ON i.supplier_id = s.id
      LIMIT 3
    `);
    console.log("Join test results:");
    joinTest.rows.forEach(row => {
      console.log(`  - ${row.sku}: ${row.product_name} from ${row.supplier_name} (Stock: ${row.stock_qty})`);
    });

    console.log("\n" + "=".repeat(60));
    console.log("✅ DEPLOYMENT SUCCESSFUL");
    console.log("=".repeat(60));
    console.log("\n📋 Summary:");
    console.log(`  - Views created: 3 (suppliers, inventory_items, inventory_item)`);
    console.log(`  - Suppliers available: ${suppliersCount.rows[0].count}`);
    console.log(`  - Inventory items available: ${inventoryCount.rows[0].count}`);
    console.log(`  - API endpoints should now work!`);
    console.log("\n🎯 Next Steps:");
    console.log("  1. Test API endpoints: GET /api/inventory");
    console.log("  2. Test API endpoints: GET /api/suppliers");
    console.log("  3. Monitor query performance");
    console.log("  4. Update TypeScript types for BIGINT compatibility");

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error("\n❌ DEPLOYMENT FAILED:", error.message);
    console.error("\nError details:");
    console.error(error);

    // Try to show which part failed
    if (error.position) {
      console.error(`\nError at position ${error.position} in SQL`);
    }

    await pool.end();
    process.exit(1);
  }
}

deployViews();
