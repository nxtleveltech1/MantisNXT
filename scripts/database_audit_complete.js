#!/usr/bin/env node

const { Pool } = require('pg');

// Database connection configuration - Production Enterprise Server
const pool = new Pool({
  user: 'nxtdb_admin',
  password: 'P@33w0rd-1',
  host: '62.169.20.53',
  port: 6600,
  database: 'nxtprod-db_001',
  ssl: false,
  max: 10,
  connectionTimeoutMillis: 5000,
});

async function auditCompleteDatabase() {
  const client = await pool.connect();

  try {
    console.log('🔍 COMPREHENSIVE DATABASE AUDIT - MantisNXT System');
    console.log('='.repeat(60));

    // 1. Check database connectivity
    console.log('\n📡 Testing Database Connection...');
    const timeResult = await client.query('SELECT NOW() as current_time, version() as postgres_version');
    console.log('✅ Connected successfully:', timeResult.rows[0].current_time);
    console.log('📊 PostgreSQL Version:', timeResult.rows[0].postgres_version);

    // 2. List all tables
    console.log('\n📋 ALL TABLES IN DATABASE:');
    const tablesQuery = `
      SELECT
        schemaname,
        tablename,
        tableowner,
        hasindexes,
        hasrules,
        hastriggers
      FROM pg_tables
      WHERE schemaname NOT IN ('information_schema', 'pg_catalog')
      ORDER BY schemaname, tablename;
    `;

    const tables = await client.query(tablesQuery);
    tables.rows.forEach(table => {
      console.log(`  📄 ${table.schemaname}.${table.tablename} (Owner: ${table.tableowner})`);
      console.log(`     Indexes: ${table.hasindexes ? '✅' : '❌'} | Rules: ${table.hasrules ? '✅' : '❌'} | Triggers: ${table.hastriggers ? '✅' : '❌'}`);
    });

    // 3. Examine table structures for supplier/inventory system
    console.log('\n🏗️  DETAILED TABLE STRUCTURES:');
    const coreTableNames = [
      'suppliers', 'supplier_pricelists', 'pricelist_items',
      'products', 'inventory_items', 'stock_movements',
      'supplier_performance', 'analytics_anomalies', 'analytics_predictions',
      'purchase_orders', 'purchase_order_items'
    ];

    for (const tableName of coreTableNames) {
      try {
        const columnsQuery = `
          SELECT
            column_name,
            data_type,
            character_maximum_length,
            is_nullable,
            column_default,
            ordinal_position
          FROM information_schema.columns
          WHERE table_name = $1
          ORDER BY ordinal_position;
        `;

        const columns = await client.query(columnsQuery, [tableName]);
        if (columns.rows.length > 0) {
          console.log(`\n  📊 Table: ${tableName.toUpperCase()}`);
          columns.rows.forEach(col => {
            const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
            const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
            const maxLen = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
            console.log(`    ${col.ordinal_position}. ${col.column_name}: ${col.data_type}${maxLen} ${nullable}${defaultVal}`);
          });
        } else {
          console.log(`  ❌ Table '${tableName}' does not exist`);
        }
      } catch (error) {
        console.log(`  ⚠️  Error examining table '${tableName}': ${error.message}`);
      }
    }

    // 4. Check Foreign Key Relationships
    console.log('\n🔗 FOREIGN KEY RELATIONSHIPS:');
    const fkQuery = `
      SELECT
        tc.table_name as source_table,
        kcu.column_name as source_column,
        ccu.table_name as target_table,
        ccu.column_name as target_column,
        tc.constraint_name,
        rc.delete_rule,
        rc.update_rule
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      LEFT JOIN information_schema.referential_constraints AS rc
        ON tc.constraint_name = rc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
      ORDER BY tc.table_name, kcu.ordinal_position;
    `;

    const foreignKeys = await client.query(fkQuery);
    if (foreignKeys.rows.length > 0) {
      foreignKeys.rows.forEach(fk => {
        console.log(`  🔗 ${fk.source_table}.${fk.source_column} → ${fk.target_table}.${fk.target_column}`);
        console.log(`     Constraint: ${fk.constraint_name} | DELETE: ${fk.delete_rule} | UPDATE: ${fk.update_rule}`);
      });
    } else {
      console.log('  ❌ No foreign key relationships found');
    }

    // 5. Check Indexes
    console.log('\n📊 DATABASE INDEXES:');
    const indexQuery = `
      SELECT
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname NOT IN ('information_schema', 'pg_catalog')
      ORDER BY tablename, indexname;
    `;

    const indexes = await client.query(indexQuery);
    if (indexes.rows.length > 0) {
      let currentTable = '';
      indexes.rows.forEach(idx => {
        if (idx.tablename !== currentTable) {
          console.log(`\n  📄 Table: ${idx.tablename}`);
          currentTable = idx.tablename;
        }
        console.log(`    📊 ${idx.indexname}: ${idx.indexdef}`);
      });
    } else {
      console.log('  ❌ No custom indexes found');
    }

    // 6. Check Data Counts
    console.log('\n📈 DATA COUNTS:');
    for (const tableName of coreTableNames) {
      try {
        const countResult = await client.query(`SELECT COUNT(*) as count FROM ${tableName}`);
        console.log(`  📊 ${tableName}: ${countResult.rows[0].count} records`);
      } catch (error) {
        console.log(`  ❌ ${tableName}: Table does not exist`);
      }
    }

    // 7. Check for UUID Type Issues
    console.log('\n🆔 UUID TYPE ANALYSIS:');
    const uuidQuery = `
      SELECT
        table_name,
        column_name,
        data_type,
        udt_name
      FROM information_schema.columns
      WHERE data_type LIKE '%uuid%' OR udt_name LIKE '%uuid%'
      ORDER BY table_name, column_name;
    `;

    const uuidColumns = await client.query(uuidQuery);
    if (uuidColumns.rows.length > 0) {
      uuidColumns.rows.forEach(col => {
        console.log(`  🆔 ${col.table_name}.${col.column_name}: ${col.data_type} (${col.udt_name})`);
      });
    } else {
      console.log('  ❌ No UUID columns found');
    }

    // 8. Check Views
    console.log('\n👁️  DATABASE VIEWS:');
    const viewsQuery = `
      SELECT
        schemaname,
        viewname,
        viewowner
      FROM pg_views
      WHERE schemaname NOT IN ('information_schema', 'pg_catalog')
      ORDER BY schemaname, viewname;
    `;

    const views = await client.query(viewsQuery);
    if (views.rows.length > 0) {
      views.rows.forEach(view => {
        console.log(`  👁️  ${view.schemaname}.${view.viewname} (Owner: ${view.viewowner})`);
      });
    } else {
      console.log('  ❌ No custom views found');
    }

    // 9. Check Constraints
    console.log('\n🛡️  TABLE CONSTRAINTS:');
    const constraintsQuery = `
      SELECT
        tc.table_name,
        tc.constraint_name,
        tc.constraint_type,
        cc.check_clause
      FROM information_schema.table_constraints tc
      LEFT JOIN information_schema.check_constraints cc
        ON tc.constraint_name = cc.constraint_name
      WHERE tc.table_schema = 'public'
        AND tc.constraint_type IN ('CHECK', 'UNIQUE', 'PRIMARY KEY')
      ORDER BY tc.table_name, tc.constraint_type;
    `;

    const constraints = await client.query(constraintsQuery);
    if (constraints.rows.length > 0) {
      let currentTable = '';
      constraints.rows.forEach(constraint => {
        if (constraint.table_name !== currentTable) {
          console.log(`\n  📄 Table: ${constraint.table_name}`);
          currentTable = constraint.table_name;
        }
        const clause = constraint.check_clause ? ` (${constraint.check_clause})` : '';
        console.log(`    🛡️  ${constraint.constraint_type}: ${constraint.constraint_name}${clause}`);
      });
    } else {
      console.log('  ❌ No constraints found');
    }

    console.log('\n✅ AUDIT COMPLETE');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Audit failed:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run audit
auditCompleteDatabase().catch(console.error);