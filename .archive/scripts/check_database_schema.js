const { Pool } = require('pg');

const dbConfig = {
  user: 'nxtdb_admin',
  password: 'P@33w0rd-1',
  host: '62.169.20.53',
  port: 6600,
  database: 'nxtprod-db_001',
  ssl: false
};

const pool = new Pool(dbConfig);

async function checkSchema() {
  try {
    // Check suppliers table schema
    console.log('🔍 Checking suppliers table schema...');
    const suppliersResult = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'suppliers'
      ORDER BY ordinal_position
    `);

    console.log('\n=== SUPPLIERS TABLE SCHEMA ===');
    console.log('Column Name'.padEnd(20) + ' | ' + 'Data Type'.padEnd(15) + ' | Nullable | Default');
    console.log('-'.repeat(70));
    suppliersResult.rows.forEach(row => {
      console.log(
        row.column_name.padEnd(20) + ' | ' +
        row.data_type.padEnd(15) + ' | ' +
        row.is_nullable.padEnd(8) + ' | ' +
        (row.column_default || 'NULL')
      );
    });

    // Check if currency column exists
    const hasCurrency = suppliersResult.rows.find(row => row.column_name === 'currency');
    console.log(`\n❗ Currency column exists: ${hasCurrency ? '✅ YES' : '❌ NO'}`);

    // Check inventory_items table
    console.log('\n🔍 Checking inventory_items table schema...');
    const inventoryResult = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'inventory_items'
      ORDER BY ordinal_position
    `);

    console.log('\n=== INVENTORY_ITEMS TABLE SCHEMA ===');
    console.log('Column Name'.padEnd(20) + ' | ' + 'Data Type'.padEnd(15) + ' | Nullable | Default');
    console.log('-'.repeat(70));
    inventoryResult.rows.forEach(row => {
      console.log(
        row.column_name.padEnd(20) + ' | ' +
        row.data_type.padEnd(15) + ' | ' +
        row.is_nullable.padEnd(8) + ' | ' +
        (row.column_default || 'NULL')
      );
    });

    // Check all available tables
    console.log('\n🔍 Checking all available tables...');
    const tablesResult = await pool.query(`
      SELECT table_name, table_type
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log('\n=== ALL TABLES IN DATABASE ===');
    tablesResult.rows.forEach(row => {
      console.log(`📋 ${row.table_name} (${row.table_type})`);
    });

    // Check for missing critical columns
    console.log('\n🚨 CRITICAL COLUMN ANALYSIS');
    console.log('============================');

    // Essential columns that should exist
    const essentialColumns = {
      suppliers: ['currency', 'payment_terms', 'contact_email', 'rating', 'status'],
      inventory_items: ['supplier_id', 'cost_price', 'selling_price', 'stock_level', 'reorder_level']
    };

    for (const [tableName, columns] of Object.entries(essentialColumns)) {
      console.log(`\n📊 Checking essential columns for ${tableName}:`);
      const tableSchema = await pool.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = $1
      `, [tableName]);

      const existingColumns = tableSchema.rows.map(row => row.column_name);

      columns.forEach(col => {
        const exists = existingColumns.includes(col);
        console.log(`  ${exists ? '✅' : '❌'} ${col}`);
      });
    }

  } catch (error) {
    console.error('❌ Database error:', error.message);
  } finally {
    await pool.end();
  }
}

checkSchema();