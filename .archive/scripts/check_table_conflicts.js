#!/usr/bin/env node

const { Pool } = require('pg');

// Database connection configuration
const pool = new Pool({
  user: 'nxtdb_admin',
  password: 'P@33w0rd-1',
  host: '62.169.20.53',
  port: 6600,
  database: 'nxtprod-db_001',
  ssl: false,
  max: 10,
  connectionTimeoutMillis: 10000,
});

async function checkTableConflicts() {
  const client = await pool.connect();

  try {
    console.log('🔍 CHECKING TABLE CONFLICTS');
    console.log('='.repeat(50));

    // Check which supplier tables exist
    const tableQuery = `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('suppliers', 'supplier')
      ORDER BY table_name;
    `;

    const tables = await client.query(tableQuery);
    console.log('📋 Available Supplier Tables:');
    tables.rows.forEach(table => {
      console.log(`  📄 ${table.table_name}`);
    });

    // Check foreign key constraints on supplier_performance
    const constraintQuery = `
      SELECT
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_name = 'supplier_performance'
      ORDER BY tc.constraint_name;
    `;

    const constraints = await client.query(constraintQuery);
    console.log('\n🔗 Foreign Key Constraints on supplier_performance:');
    constraints.rows.forEach(fk => {
      console.log(`  🔗 ${fk.constraint_name}: ${fk.table_name}.${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
    });

    // Check which table has the data
    const supplierCount = await client.query('SELECT COUNT(*) as count FROM suppliers');
    console.log(`\n📊 suppliers table: ${supplierCount.rows[0].count} records`);

    try {
      const supplier2Count = await client.query('SELECT COUNT(*) as count FROM supplier');
      console.log(`📊 supplier table: ${supplier2Count.rows[0].count} records`);
    } catch (error) {
      console.log(`📊 supplier table: Does not exist or error - ${error.message}`);
    }

    // Show sample data from suppliers table
    const sampleSuppliers = await client.query('SELECT id, name FROM suppliers LIMIT 5');
    console.log('\n📋 Sample suppliers data:');
    sampleSuppliers.rows.forEach(supplier => {
      console.log(`  • ${supplier.name} (${supplier.id})`);
    });

    // Check if there are any records in supplier_performance
    const perfCount = await client.query('SELECT COUNT(*) as count FROM supplier_performance');
    console.log(`\n📊 supplier_performance table: ${perfCount.rows[0].count} records`);

    console.log('\n✅ TABLE CONFLICT CHECK COMPLETE');
    console.log('='.repeat(50));

  } catch (error) {
    console.error('❌ Error checking table conflicts:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the check
checkTableConflicts().catch(console.error);