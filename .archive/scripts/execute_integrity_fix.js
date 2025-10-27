#!/usr/bin/env node

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

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

async function executeIntegrityFix() {
  const client = await pool.connect();

  try {
    console.log('🔧 EXECUTING DATABASE INTEGRITY FIX');
    console.log('='.repeat(50));

    // Read the SQL fix file
    const sqlFile = path.join(__dirname, 'database_integrity_fix.sql');
    const sqlContent = fs.readFileSync(sqlFile, 'utf8');

    console.log('📁 Loading SQL fix script...');

    // Execute the entire SQL script
    console.log('⚡ Executing database integrity fixes...');

    const startTime = Date.now();
    const result = await client.query(sqlContent);
    const executionTime = Date.now() - startTime;

    console.log('✅ Database integrity fixes completed successfully!');
    console.log(`⏱️  Execution time: ${executionTime}ms`);

    // Verify the fixes worked
    console.log('\n🔍 VERIFICATION - FOREIGN KEY CONSTRAINTS:');
    const fkQuery = `
      SELECT
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        rc.delete_rule,
        rc.update_rule
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
      JOIN information_schema.referential_constraints AS rc
          ON tc.constraint_name = rc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_name IN (
              'supplier_pricelists', 'pricelist_items', 'supplier_performance',
              'inventory_items', 'stock_movements', 'purchase_orders',
              'purchase_order_items', 'analytics_anomalies', 'analytics_predictions'
          )
      ORDER BY tc.table_name, tc.constraint_name;
    `;

    const fkResults = await client.query(fkQuery);
    fkResults.rows.forEach(fk => {
      console.log(`  ✅ ${fk.table_name}.${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
      console.log(`     Constraint: ${fk.constraint_name} | DELETE: ${fk.delete_rule} | UPDATE: ${fk.update_rule}`);
    });

    console.log('\n🔍 VERIFICATION - NEW INDEXES:');
    const indexQuery = `
      SELECT
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
          AND tablename IN (
              'suppliers', 'supplier_pricelists', 'pricelist_items',
              'inventory_items', 'stock_movements', 'purchase_orders',
              'purchase_order_items', 'supplier_performance',
              'analytics_anomalies', 'analytics_predictions'
          )
          AND indexname LIKE 'idx_%'
      ORDER BY tablename, indexname;
    `;

    const indexResults = await client.query(indexQuery);
    let currentTable = '';
    indexResults.rows.forEach(idx => {
      if (idx.tablename !== currentTable) {
        console.log(`\n  📊 ${idx.tablename}:`);
        currentTable = idx.tablename;
      }
      console.log(`    ✅ ${idx.indexname}`);
    });

    console.log('\n🔍 VERIFICATION - ANALYTICAL VIEWS:');
    const viewQuery = `
      SELECT
        viewname,
        definition
      FROM pg_views
      WHERE schemaname = 'public'
          AND viewname LIKE 'v_%'
      ORDER BY viewname;
    `;

    const viewResults = await client.query(viewQuery);
    viewResults.rows.forEach(view => {
      console.log(`  👁️  ${view.viewname}`);
    });

    // Test the analytical views
    console.log('\n🔍 TESTING ANALYTICAL VIEWS:');
    const testViews = [
      'v_supplier_performance_summary',
      'v_inventory_analytics',
      'v_supplier_pricelist_summary',
      'v_purchase_order_analytics'
    ];

    for (const viewName of testViews) {
      try {
        const testResult = await client.query(`SELECT COUNT(*) as count FROM ${viewName}`);
        console.log(`  ✅ ${viewName}: ${testResult.rows[0].count} records`);
      } catch (error) {
        console.log(`  ❌ ${viewName}: Error - ${error.message}`);
      }
    }

    console.log('\n✅ DATABASE INTEGRITY RESTORATION COMPLETE');
    console.log('='.repeat(50));

  } catch (error) {
    console.error('❌ Error executing integrity fix:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the integrity fix
executeIntegrityFix().catch(console.error);