/**
 * Database Schema Validation and Fix Script
 * Addresses missing columns in analytics APIs
 */

const { Pool } = require('pg');

// Database connection configuration
const dbConfig = {
  user: "nxtdb_admin",
  password: "P@33w0rd-1",
  host: "62.169.20.53",
  port: 6600,
  database: "nxtprod-db_001",
  ssl: false,
  max: 5,
  connectionTimeoutMillis: 8000,
  idleTimeoutMillis: 30000,
  application_name: "MantisNXT_SchemaFix"
};

const pool = new Pool(dbConfig);

async function checkAndFixSchema() {
  let client;

  try {
    client = await pool.connect();
    console.log('✅ Connected to database for schema validation');

    // Check suppliers table schema
    console.log('\n🔍 Checking suppliers table schema...');
    const suppliersSchema = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'suppliers'
      ORDER BY ordinal_position
    `);

    console.log('📋 Current suppliers table columns:');
    const supplierColumns = new Set();
    suppliersSchema.rows.forEach(row => {
      supplierColumns.add(row.column_name);
      console.log(`  - ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });

    // Check for missing currency column
    const needsCurrencyColumn = !supplierColumns.has('currency');
    console.log(`\n💰 Currency column exists: ${needsCurrencyColumn ? '❌' : '✅'}`);

    if (needsCurrencyColumn) {
      console.log('\n🔧 Adding missing currency column...');
      await client.query(`
        ALTER TABLE suppliers
        ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD'
      `);

      // Update existing records with default currency
      await client.query(`
        UPDATE suppliers
        SET currency = 'USD'
        WHERE currency IS NULL
      `);

      console.log('✅ Added currency column with default value USD');
    }

    // Check inventory_items table schema
    console.log('\n🔍 Checking inventory_items table schema...');
    const inventorySchema = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'inventory_items'
      ORDER BY ordinal_position
    `);

    console.log('📋 Current inventory_items table columns:');
    const inventoryColumns = new Set();
    inventorySchema.rows.forEach(row => {
      inventoryColumns.add(row.column_name);
      console.log(`  - ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });

    // Validate critical columns for analytics APIs
    const criticalColumns = {
      suppliers: ['supplier_name', 'payment_terms_days', 'currency'],
      inventory_items: ['product_name', 'current_stock', 'reorder_level']
    };

    console.log('\n🔍 Validating critical columns for analytics APIs...');

    let allColumnsPresent = true;

    // Check suppliers critical columns
    criticalColumns.suppliers.forEach(col => {
      const exists = supplierColumns.has(col);
      console.log(`  suppliers.${col}: ${exists ? '✅' : '❌'}`);
      if (!exists) allColumnsPresent = false;
    });

    // Check inventory critical columns
    criticalColumns.inventory_items.forEach(col => {
      const exists = inventoryColumns.has(col);
      console.log(`  inventory_items.${col}: ${exists ? '✅' : '❌'}`);
      if (!exists) allColumnsPresent = false;
    });

    if (allColumnsPresent) {
      console.log('\n🎉 All critical columns present for analytics APIs');
    } else {
      console.log('\n⚠️ Some critical columns are missing');
    }

    // Test the recommendations API query
    console.log('\n🧪 Testing recommendations API query...');
    const testQuery = `
      SELECT
        supplier_name,
        payment_terms_days,
        currency,
        CASE
          WHEN payment_terms_days > 60 THEN 'negotiate_terms'
          WHEN payment_terms_days > 45 THEN 'review_terms'
          ELSE 'maintain_relationship'
        END as recommendation_type
      FROM suppliers
      WHERE supplier_name IS NOT NULL
      ORDER BY payment_terms_days DESC
      LIMIT 3
    `;

    const testResult = await client.query(testQuery);
    console.log(`✅ Query successful, returned ${testResult.rows.length} rows`);
    testResult.rows.forEach((row, i) => {
      console.log(`  ${i+1}. ${row.supplier_name} - ${row.payment_terms_days} days (${row.currency})`);
    });

  } catch (error) {
    console.error('❌ Schema validation failed:', error.message);
    throw error;
  } finally {
    if (client) {
      client.release();
    }
  }
}

async function main() {
  try {
    await checkAndFixSchema();
    console.log('\n✅ Schema validation and fixes completed successfully');
  } catch (error) {
    console.error('\n💥 Script failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

if (require.main === module) {
  main();
}

module.exports = { checkAndFixSchema };