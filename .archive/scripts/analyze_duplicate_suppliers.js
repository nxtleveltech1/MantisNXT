#!/usr/bin/env node

/**
 * MANTIS NXT - Duplicate Supplier Analysis
 * Agent 1: Database Analysis Specialist
 * 
 * This script connects to the database and identifies duplicate suppliers
 */

const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

// Enhanced database configuration with proper timeout settings
const getPoolConfig = () => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  return {
    host: process.env.DB_HOST || '62.169.20.53',
    port: parseInt(process.env.DB_PORT || '6600'),
    database: process.env.DB_NAME || 'nxtprod-db_001',
    user: process.env.DB_USER || 'nxtdb_admin',
    password: process.env.DB_PASSWORD || 'P@33w0rd-1',
    ssl: false,
    
    // Optimized connection pooling
    max: 5,
    min: 1,
    
    // Proper timeout settings
    connectionTimeoutMillis: 30000,
    idleTimeoutMillis: 300000,
    acquireTimeoutMillis: 45000,
    
    // Application identification
    application_name: `MantisNXT-DuplicateAnalysis-${process.pid}`,
    
    // Keep-alive settings
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
    
    // Query timeouts
    query_timeout: 120000,
    statement_timeout: 90000
  };
};

async function analyzeDuplicateSuppliers() {
  const pool = new Pool(getPoolConfig());
  let client;
  
  try {
    console.log('='.repeat(60));
    console.log('MANTIS NXT - DUPLICATE SUPPLIER ANALYSIS');
    console.log('='.repeat(60));
    console.log(`Connecting to database at ${pool.options.host}:${pool.options.port}...`);
    
    client = await pool.connect();
    console.log('✓ Connected successfully\n');

    // 1. Analyze duplicate suppliers
    console.log('1. ANALYZING DUPLICATE SUPPLIERS');
    console.log('-'.repeat(60));
    
    const duplicateQuery = `
      WITH supplier_duplicates AS (
        SELECT 
          LOWER(TRIM(name)) as normalized_name,
          COUNT(*) as duplicate_count,
          ARRAY_AGG(id ORDER BY "createdAt") as supplier_ids,
          ARRAY_AGG(name ORDER BY "createdAt") as original_names,
          ARRAY_AGG(status ORDER BY "createdAt") as statuses,
          ARRAY_AGG("createdAt" ORDER BY "createdAt") as created_dates
        FROM "Supplier"
        GROUP BY LOWER(TRIM(name))
        HAVING COUNT(*) > 1
      )
      SELECT * FROM "Supplier"_duplicates
      ORDER BY duplicate_count DESC, normalized_name`;
    
    const duplicateResult = await client.query(duplicateQuery);
    
    console.log(`Found ${duplicateResult.rows.length} groups of duplicate suppliers:\n`);
    
    let duplicateReport = [];
    duplicateResult.rows.forEach((row, index) => {
      console.log(`${index + 1}. "${row.normalized_name}" - ${row.duplicate_count} duplicates`);
      console.log(`   IDs: ${row.supplier_ids.join(', ')}`);
      console.log(`   Original Names: ${row.original_names.join(' | ')}`);
      console.log(`   Statuses: ${row.statuses.join(' | ')}`);
      console.log('');
      
      duplicateReport.push({
        normalized_name: row.normalized_name,
        duplicate_count: row.duplicate_count,
        supplier_ids: row.supplier_ids,
        original_names: row.original_names,
        statuses: row.statuses
      });
    });

    // 2. Count records in all tables
    console.log('\n2. TABLE RECORD COUNTS');
    console.log('-'.repeat(60));
    
    const tableCountQuery = `
      SELECT 
        'Suppliers' as table_name,
        COUNT(*) as record_count
      FROM "Supplier"
      UNION ALL
      SELECT 
        'inventory_items' as table_name,
        COUNT(*) as record_count
      FROM inventory_items
      UNION ALL
      SELECT 
        'purchase_orders' as table_name,
        COUNT(*) as record_count
      FROM purchase_orders
      UNION ALL
      SELECT 
        'purchase_order_items' as table_name,
        COUNT(*) as record_count
      FROM purchase_orders_item
      ORDER BY table_name`;
    
    const countResult = await client.query(tableCountQuery);
    
    let tableCounts = {};
    countResult.rows.forEach(row => {
      console.log(`${row.table_name}: ${row.record_count} records`);
      tableCounts[row.table_name] = parseInt(row.record_count);
    });

    // 3. Analyze dependencies
    console.log('\n\n3. SUPPLIER DEPENDENCIES');
    console.log('-'.repeat(60));
    
    const dependencyQuery = `
      WITH duplicate_groups AS (
        SELECT 
          LOWER(TRIM(name)) as normalized_name,
          ARRAY_AGG(id ORDER BY created_at) as supplier_ids
        FROM "Supplier"
        GROUP BY LOWER(TRIM(name))
        HAVING COUNT(*) > 1
      )
      SELECT 
        dg.normalized_name,
        s.id as supplier_id,
        s.name as original_name,
        s.status,
        s."createdAt",
        (SELECT COUNT(*) FROM inventory_items WHERE supplier_id = s.id) as inventory_items,
        (SELECT COUNT(*) FROM purchase_orders WHERE supplier_id = s.id) as purchase_orders,
        (SELECT COALESCE(SUM(total_amount), 0) FROM purchase_orders WHERE supplier_id = s.id) as total_po_value,
        (SELECT COUNT(*) FROM "Pricelist" WHERE "supplierId" = s.id) as pricelists,
        (SELECT COUNT(*) FROM "Product" WHERE "supplierId" = s.id) as products
      FROM duplicate_groups dg
      CROSS JOIN LATERAL unnest(dg.supplier_ids) AS supplier_id
      JOIN "Supplier" s ON s.id = supplier_id
      ORDER BY dg.normalized_name, s."createdAt"`;
    
    const dependencyResult = await client.query(dependencyQuery);
    
    let currentSupplier = null;
    let dependencyMap = {};
    
    dependencyResult.rows.forEach(row => {
      if (row.normalized_name !== currentSupplier) {
        currentSupplier = row.normalized_name;
        console.log(`\nDuplicate Group: "${row.normalized_name}"`);
        dependencyMap[row.normalized_name] = [];
      }
      
      console.log(`  - ID: ${row.supplier_id} (${row.original_name})`);
      console.log(`    Status: ${row.status}, Created: ${row.createdAt.toISOString().split('T')[0]}`);
      console.log(`    Dependencies: ${row.inventory_items} inventory items, ${row.purchase_orders} POs, ${row.pricelists} pricelists, ${row.products} products`);
      console.log(`    Total PO Value: $${parseFloat(row.total_po_value).toFixed(2)}`);
      
      dependencyMap[row.normalized_name].push({
        supplier_id: row.supplier_id,
        original_name: row.original_name,
        status: row.status,
        inventory_items: parseInt(row.inventory_items),
        purchase_orders: parseInt(row.purchase_orders),
        total_po_value: parseFloat(row.total_po_value),
        pricelists: parseInt(row.pricelists),
        products: parseInt(row.products)
      });
    });

    // 4. Find tables with supplier_id foreign keys
    console.log('\n\n4. TABLES REFERENCING SUPPLIER_ID');
    console.log('-'.repeat(60));
    
    const foreignKeyQuery = `
      SELECT DISTINCT
        tc.table_name,
        kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage ccu 
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND ccu.table_name = 'Supplier'
        AND ccu.column_name = 'id'
      ORDER BY tc.table_name`;
    
    const foreignKeyResult = await client.query(foreignKeyQuery);
    
    console.log('Tables with foreign key references to supplier.id:');
    foreignKeyResult.rows.forEach(row => {
      console.log(`  - ${row.table_name}.${row.column_name}`);
    });

    // 5. Generate summary report
    const poolConfig = getPoolConfig();
    const report = {
      timestamp: new Date().toISOString(),
      database: {
        host: poolConfig.host,
        port: poolConfig.port,
        database: poolConfig.database
      },
      summary: {
        total_suppliers: tableCounts.Suppliers || 0,
        duplicate_groups: duplicateResult.rows.length,
        total_duplicate_suppliers: duplicateResult.rows.reduce((sum, row) => sum + row.duplicate_count, 0),
        affected_inventory_items: dependencyResult.rows.reduce((sum, row) => sum + row.inventory_items, 0),
        affected_purchase_orders: dependencyResult.rows.reduce((sum, row) => sum + row.purchase_orders, 0)
      },
      table_counts: tableCounts,
      duplicate_suppliers: duplicateReport,
      dependencies: dependencyMap,
      foreign_key_references: foreignKeyResult.rows
    };

    // Save report to file
    const reportPath = path.join(__dirname, '../claudedocs/duplicate_suppliers_analysis.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n✓ Detailed report saved to: ${reportPath}`);

    // Generate SQL backup script command
    console.log('\n\n5. BACKUP RECOMMENDATION');
    console.log('-'.repeat(60));
    console.log('Before proceeding with deduplication, run the backup script:');
    const backupPoolConfig = getPoolConfig();
    console.log('  psql -h ' + backupPoolConfig.host + ' -p ' + backupPoolConfig.port + ' -U ' + backupPoolConfig.user + ' -d ' + backupPoolConfig.database + ' -f scripts/backup_database.sql');

  } catch (error) {
    console.error('Error during analysis:', error);
    process.exit(1);
  } finally {
    if (client) client.release();
    await pool.end();
    console.log('\n✓ Database connection closed');
  }
}

// Run the analysis
analyzeDuplicateSuppliers().catch(console.error);