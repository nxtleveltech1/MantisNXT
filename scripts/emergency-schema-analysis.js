#!/usr/bin/env node

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
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
};

const pool = new Pool(dbConfig);

async function analyzeCurrentSchema() {
  console.log('🔍 EMERGENCY DATABASE SCHEMA ANALYSIS');
  console.log('=====================================\n');

  try {
    // Test connection first
    const testResult = await pool.query('SELECT NOW() as current_time');
    console.log('✅ Database connection successful:', testResult.rows[0]);
    console.log('');

    // Get all existing tables
    const tablesQuery = `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    const tablesResult = await pool.query(tablesQuery);
    console.log('📊 EXISTING TABLES:');
    console.log('==================');
    tablesResult.rows.forEach(row => console.log(`- ${row.table_name}`));
    console.log('');

    // Analyze key tables for missing columns
    const criticalTables = ['suppliers', 'inventory_items', 'supplier_performance', 'stock_movements'];

    for (const tableName of criticalTables) {
      console.log(`🔧 ANALYZING TABLE: ${tableName}`);
      console.log('================================');

      const columnsQuery = `
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position
      `;

      try {
        const columnsResult = await pool.query(columnsQuery, [tableName]);
        if (columnsResult.rows.length === 0) {
          console.log(`❌ TABLE ${tableName.toUpperCase()} DOES NOT EXIST`);
        } else {
          console.log(`✅ Table exists with ${columnsResult.rows.length} columns:`);
          columnsResult.rows.forEach(col => {
            console.log(`   ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
          });
        }
      } catch (error) {
        console.log(`❌ Error analyzing ${tableName}:`, error.message);
      }
      console.log('');
    }

    // Check for missing critical tables
    console.log('🚨 MISSING CRITICAL TABLES CHECK');
    console.log('================================');

    const requiredTables = [
      'supplier_price_lists',
      'analytics_anomalies',
      'analytics_predictions',
      'analytics_dashboard_config',
      'analytics_anomaly_config',
      'analytics_audit_log',
      'analytics_requests'
    ];

    const existingTableNames = tablesResult.rows.map(row => row.table_name);

    for (const requiredTable of requiredTables) {
      if (!existingTableNames.includes(requiredTable)) {
        console.log(`❌ MISSING: ${requiredTable}`);
      } else {
        console.log(`✅ EXISTS: ${requiredTable}`);
      }
    }

    console.log('\n🔍 CRITICAL COLUMNS CHECK');
    console.log('=========================');

    // Check specific missing columns that cause errors
    const columnChecks = [
      { table: 'inventory_items', column: 'current_stock' },
      { table: 'supplier_performance', column: 'overall_rating' },
      { table: 'supplier_performance', column: 'evaluation_date' },
      { table: 'stock_movements', column: 'timestamp' },
      { table: 'suppliers', column: 'tier' },
      { table: 'stock_movements', column: 'type' }
    ];

    for (const check of columnChecks) {
      const columnQuery = `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = $1
        AND column_name = $2
      `;

      try {
        const result = await pool.query(columnQuery, [check.table, check.column]);
        if (result.rows.length === 0) {
          console.log(`❌ MISSING: ${check.table}.${check.column}`);
        } else {
          console.log(`✅ EXISTS: ${check.table}.${check.column}`);
        }
      } catch (error) {
        console.log(`❌ ERROR checking ${check.table}.${check.column}:`, error.message);
      }
    }

  } catch (error) {
    console.error('❌ Fatal error during schema analysis:', error);
  } finally {
    await pool.end();
  }
}

// Run the analysis
analyzeCurrentSchema().catch(console.error);