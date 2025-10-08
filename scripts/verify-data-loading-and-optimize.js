/**
 * MantisNXT Data Verification & Performance Optimization Script
 * Verifies supplier data loading and applies production indexes
 */

const fs = require('fs');
const path = require('path');
const { dbManager } = require('../lib/database/enterprise-connection-manager');

// Performance optimization SQL
const performanceIndexes = fs.readFileSync(
  path.join(__dirname, '../database/production-performance-indexes.sql'),
  'utf8'
);

/**
 * Verify data loading from supplier price lists
 */
async function verifyDataLoading() {
  console.log('🔍 Verifying supplier data loading...');

  try {
    // Check suppliers count
    const suppliersResult = await dbManager.query(
      'SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = $1) as active FROM suppliers',
      ['active']
    );

    const products = await dbManager.query(
      'SELECT COUNT(*) as total, COUNT(DISTINCT supplier_id) as unique_suppliers FROM products'
    );

    const inventory = await dbManager.query(
      'SELECT COUNT(*) as total, COUNT(DISTINCT supplier_id) as unique_suppliers FROM inventory_items'
    );

    // Check upload directory for processed files
    const uploadDir = path.join(__dirname, '../database/Uploads/drive-download-20250904T012253Z-1-001');
    let fileCount = 0;

    if (fs.existsSync(uploadDir)) {
      const files = fs.readdirSync(uploadDir);
      fileCount = files.filter(f => f.endsWith('.csv') || f.endsWith('.xlsx')).length;
    }

    const summary = {
      suppliers: {
        total: parseInt(suppliersResult.rows[0].total),
        active: parseInt(suppliersResult.rows[0].active)
      },
      products: {
        total: parseInt(products.rows[0].total),
        uniqueSuppliers: parseInt(products.rows[0].unique_suppliers)
      },
      inventory: {
        total: parseInt(inventory.rows[0].total),
        uniqueSuppliers: parseInt(inventory.rows[0].unique_suppliers)
      },
      files: {
        expected: 28,
        found: fileCount
      }
    };

    console.log('📊 Data Loading Summary:');
    console.log(`  Suppliers: ${summary.suppliers.total} total, ${summary.suppliers.active} active`);
    console.log(`  Products: ${summary.products.total} total from ${summary.products.uniqueSuppliers} suppliers`);
    console.log(`  Inventory: ${summary.inventory.total} items from ${summary.inventory.uniqueSuppliers} suppliers`);
    console.log(`  Files: ${summary.files.found}/${summary.files.expected} found`);

    // Verify data quality
    const dataQuality = await checkDataQuality();

    return {
      success: true,
      summary,
      dataQuality
    };

  } catch (error) {
    console.error('❌ Data verification failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Check data quality and integrity
 */
async function checkDataQuality() {
  console.log('🔍 Checking data quality...');

  const checks = {};

  // Check for missing supplier references
  const orphanedProducts = await dbManager.query(`
    SELECT COUNT(*) as count
    FROM products p
    LEFT JOIN suppliers s ON p.supplier_id = s.id
    WHERE s.id IS NULL
  `);

  const orphanedInventory = await dbManager.query(`
    SELECT COUNT(*) as count
    FROM inventory_items i
    LEFT JOIN suppliers s ON i.supplier_id = s.id
    WHERE s.id IS NULL
  `);

  // Check for duplicate SKUs
  const duplicateSKUs = await dbManager.query(`
    SELECT sku, COUNT(*) as count
    FROM products
    WHERE sku IS NOT NULL
    GROUP BY sku
    HAVING COUNT(*) > 1
    LIMIT 5
  `);

  // Check for products without inventory
  const productsWithoutInventory = await dbManager.query(`
    SELECT COUNT(*) as count
    FROM products p
    LEFT JOIN inventory_items i ON p.id = i.product_id
    WHERE i.product_id IS NULL
  `);

  checks.orphanedProducts = parseInt(orphanedProducts.rows[0].count);
  checks.orphanedInventory = parseInt(orphanedInventory.rows[0].count);
  checks.duplicateSKUs = duplicateSKUs.rows.length;
  checks.productsWithoutInventory = parseInt(productsWithoutInventory.rows[0].count);

  // Quality score
  let qualityScore = 100;
  if (checks.orphanedProducts > 0) qualityScore -= 20;
  if (checks.orphanedInventory > 0) qualityScore -= 20;
  if (checks.duplicateSKUs > 0) qualityScore -= 15;
  if (checks.productsWithoutInventory > 50) qualityScore -= 10;

  console.log('📈 Data Quality Analysis:');
  console.log(`  Orphaned Products: ${checks.orphanedProducts}`);
  console.log(`  Orphaned Inventory: ${checks.orphanedInventory}`);
  console.log(`  Duplicate SKUs: ${checks.duplicateSKUs}`);
  console.log(`  Products without Inventory: ${checks.productsWithoutInventory}`);
  console.log(`  Quality Score: ${qualityScore}/100`);

  return {
    ...checks,
    qualityScore
  };
}

/**
 * Apply performance optimization indexes
 */
async function applyPerformanceIndexes() {
  console.log('🚀 Applying performance optimization indexes...');

  try {
    // Split the SQL into individual statements
    const statements = performanceIndexes
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    let successCount = 0;
    let skipCount = 0;

    for (const statement of statements) {
      try {
        // Skip comments and empty statements
        if (statement.startsWith('--') || statement.length < 10) {
          continue;
        }

        console.log(`⚡ Executing: ${statement.substring(0, 50)}...`);
        await dbManager.query(statement);
        successCount++;
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`⏭️ Skipped (already exists): ${statement.substring(0, 50)}...`);
          skipCount++;
        } else {
          console.error(`❌ Failed: ${error.message}`);
        }
      }
    }

    console.log(`✅ Index optimization complete: ${successCount} created, ${skipCount} skipped`);

    // Refresh statistics for optimal query planning
    console.log('📊 Refreshing table statistics...');
    await dbManager.query('SELECT refresh_table_statistics()');

    return {
      success: true,
      indexesCreated: successCount,
      indexesSkipped: skipCount
    };

  } catch (error) {
    console.error('❌ Performance optimization failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Test database performance after optimization
 */
async function testDatabasePerformance() {
  console.log('🎯 Testing database performance...');

  const tests = [];

  try {
    // Test 1: Supplier lookup
    const start1 = Date.now();
    await dbManager.query('SELECT * FROM suppliers WHERE status = $1 LIMIT 10', ['active']);
    tests.push({
      name: 'Supplier Lookup',
      duration: Date.now() - start1,
      query: 'SELECT suppliers by status'
    });

    // Test 2: Product search
    const start2 = Date.now();
    await dbManager.query(`
      SELECT p.*, s.name as supplier_name
      FROM products p
      JOIN suppliers s ON p.supplier_id = s.id
      WHERE p.status = $1
      LIMIT 20
    `, ['active']);
    tests.push({
      name: 'Product Search',
      duration: Date.now() - start2,
      query: 'SELECT products with supplier join'
    });

    // Test 3: Inventory analysis
    const start3 = Date.now();
    await dbManager.query(`
      SELECT i.*, p.name as product_name, s.name as supplier_name
      FROM inventory_items i
      JOIN products p ON i.product_id = p.id
      JOIN suppliers s ON i.supplier_id = s.id
      WHERE i.current_stock <= i.min_stock
      LIMIT 15
    `);
    tests.push({
      name: 'Inventory Analysis',
      duration: Date.now() - start3,
      query: 'Low stock items with joins'
    });

    // Test 4: Full-text search
    const start4 = Date.now();
    await dbManager.query(`
      SELECT * FROM products
      WHERE to_tsvector('english', name || ' ' || COALESCE(description, ''))
      @@ plainto_tsquery('english', $1)
      LIMIT 10
    `, ['cable']);
    tests.push({
      name: 'Full-text Search',
      duration: Date.now() - start4,
      query: 'Full-text product search'
    });

    console.log('⚡ Performance Test Results:');
    tests.forEach(test => {
      const status = test.duration < 100 ? '🟢 Fast' : test.duration < 500 ? '🟡 Moderate' : '🔴 Slow';
      console.log(`  ${test.name}: ${test.duration}ms ${status}`);
    });

    const avgDuration = tests.reduce((sum, test) => sum + test.duration, 0) / tests.length;
    console.log(`📊 Average Query Time: ${avgDuration.toFixed(2)}ms`);

    return {
      success: true,
      tests,
      averageDuration: avgDuration
    };

  } catch (error) {
    console.error('❌ Performance testing failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Generate comprehensive database status report
 */
async function generateStatusReport() {
  console.log('📋 Generating database status report...');

  try {
    const poolStatus = dbManager.getPoolStatus();

    const tableStats = await dbManager.query(`
      SELECT
        schemaname,
        tablename,
        n_tup_ins as inserts,
        n_tup_upd as updates,
        n_tup_del as deletes,
        n_live_tup as live_tuples
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
      ORDER BY n_live_tup DESC
    `);

    const indexUsage = await dbManager.query(`
      SELECT
        indexname,
        idx_scan,
        idx_tup_read,
        idx_tup_fetch
      FROM pg_stat_user_indexes
      WHERE schemaname = 'public'
      AND idx_scan > 0
      ORDER BY idx_scan DESC
      LIMIT 10
    `);

    console.log('📊 Database Status Report:');
    console.log('Connection Pool:', poolStatus);
    console.log('Table Statistics:', tableStats.rows.slice(0, 5));
    console.log('Top Index Usage:', indexUsage.rows.slice(0, 5));

    return {
      poolStatus,
      tableStats: tableStats.rows,
      indexUsage: indexUsage.rows
    };

  } catch (error) {
    console.error('❌ Status report generation failed:', error);
    return { error: error.message };
  }
}

/**
 * Main execution function
 */
async function main() {
  console.log('🚀 Starting MantisNXT Database Verification & Optimization');

  try {
    // Initialize database connection
    await dbManager.initialize();

    // Step 1: Verify data loading
    const dataVerification = await verifyDataLoading();

    if (!dataVerification.success) {
      console.error('❌ Data verification failed, aborting optimization');
      return;
    }

    // Step 2: Apply performance indexes
    const indexOptimization = await applyPerformanceIndexes();

    if (!indexOptimization.success) {
      console.error('❌ Index optimization failed');
      return;
    }

    // Step 3: Test performance
    const performanceTest = await testDatabasePerformance();

    // Step 4: Generate status report
    const statusReport = await generateStatusReport();

    // Final summary
    console.log('\n🎉 Database Optimization Complete!');
    console.log('Summary:');
    console.log(`  ✅ Data Verification: ${dataVerification.success ? 'PASSED' : 'FAILED'}`);
    console.log(`  ✅ Index Optimization: ${indexOptimization.indexesCreated} indexes created`);
    console.log(`  ✅ Performance Testing: ${performanceTest.success ? 'COMPLETED' : 'FAILED'}`);
    console.log(`  ✅ Connection Pool: ${statusReport.poolStatus.active}/${statusReport.poolStatus.total} active`);

    if (performanceTest.success && performanceTest.averageDuration < 200) {
      console.log('🚀 Database performance is OPTIMIZED for production');
    } else {
      console.log('⚠️ Database performance may need additional tuning');
    }

  } catch (error) {
    console.error('❌ Main execution failed:', error);
  } finally {
    // Cleanup
    try {
      await dbManager.shutdown();
    } catch (error) {
      console.error('❌ Shutdown error:', error);
    }
  }
}

// Execute if run directly
if (require.main === module) {
  main();
}

module.exports = {
  verifyDataLoading,
  applyPerformanceIndexes,
  testDatabasePerformance,
  generateStatusReport
};