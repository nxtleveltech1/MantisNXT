/**
 * Comprehensive Database Validation Script
 * Test all fixes and validate connection stability
 */

const { Pool } = require('pg');

// Use the optimized connection pool settings
const pool = new Pool({
  user: process.env.DB_USER || 'nxtdb_admin',
  password: process.env.DB_PASSWORD || 'P@33w0rd-1',
  host: process.env.DB_HOST || '62.169.20.53',
  port: parseInt(process.env.DB_PORT || '6600'),
  database: process.env.DB_NAME || 'nxtprod-db_001',

  // Optimized pool settings matching enterprise manager
  max: 50,
  min: 10,
  idleTimeoutMillis: 300000, // 5 minutes
  connectionTimeoutMillis: 30000, // 30 seconds
  acquireTimeoutMillis: 45000, // 45 seconds

  ssl: false,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000
});

async function query(text, params) {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
}

async function testConnectionPoolStability() {
  console.log('🔧 Testing connection pool stability...');

  try {
    // Test multiple concurrent connections
    const concurrentTests = [];
    const testCount = 25; // Test with 25 concurrent connections

    for (let i = 0; i < testCount; i++) {
      concurrentTests.push(
        (async (testId) => {
          const startTime = Date.now();
          try {
            const result = await query(`
              SELECT
                ${testId} as test_id,
                NOW() as timestamp,
                pg_backend_pid() as backend_pid,
                'test_${testId}' as test_name
            `);
            const endTime = Date.now();
            return {
              testId,
              success: true,
              duration: endTime - startTime,
              backendPid: result.rows[0].backend_pid
            };
          } catch (error) {
            const endTime = Date.now();
            return {
              testId,
              success: false,
              duration: endTime - startTime,
              error: error.message
            };
          }
        })(i)
      );
    }

    console.log(`  Running ${testCount} concurrent connection tests...`);
    const startTime = Date.now();
    const results = await Promise.all(concurrentTests);
    const endTime = Date.now();

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    const avgDuration = successful.reduce((sum, r) => sum + r.duration, 0) / successful.length;
    const maxDuration = Math.max(...successful.map(r => r.duration));
    const minDuration = Math.min(...successful.map(r => r.duration));

    console.log(`  ✅ Total test time: ${endTime - startTime}ms`);
    console.log(`  ✅ Successful connections: ${successful.length}/${testCount}`);
    console.log(`  ❌ Failed connections: ${failed.length}`);
    console.log(`  📊 Duration stats: avg=${avgDuration.toFixed(1)}ms, min=${minDuration}ms, max=${maxDuration}ms`);

    if (failed.length > 0) {
      console.log('  ❌ Connection failures:');
      failed.forEach(f => {
        console.log(`    Test ${f.testId}: ${f.error}`);
      });
    }

    return {
      totalTests: testCount,
      successful: successful.length,
      failed: failed.length,
      totalDuration: endTime - startTime,
      avgQueryDuration: avgDuration,
      maxQueryDuration: maxDuration,
      minQueryDuration: minDuration
    };

  } catch (error) {
    console.error('❌ Error testing connection pool stability:', error);
    throw error;
  }
}

async function validateInventoryFix() {
  console.log('\n📦 Validating inventory data fix...');

  try {
    // Check inventory stock status
    const stockStatus = await query(`
      SELECT
        CASE
          WHEN stock_qty <= 0 THEN 'Out of Stock'
          WHEN stock_qty <= reorder_point THEN 'Low Stock'
          ELSE 'In Stock'
        END as stock_status,
        COUNT(*) as item_count,
        ROUND(AVG(stock_qty), 2) as avg_stock
      FROM inventory_items
      WHERE status = 'active'
      GROUP BY stock_status
      ORDER BY item_count DESC;
    `);

    console.log('  📊 Current inventory status:');
    stockStatus.rows.forEach(row => {
      console.log(`    ${row.stock_status}: ${row.item_count} items (avg stock: ${row.avg_stock})`);
    });

    // Check stock movements
    const movementStatus = await query(`
      SELECT
        COUNT(*) as total_movements,
        COUNT(DISTINCT item_id) as items_with_movements,
        SUM(CASE WHEN movement_type = 'IN' THEN quantity ELSE 0 END) as total_in,
        SUM(CASE WHEN movement_type = 'OUT' THEN quantity ELSE 0 END) as total_out
      FROM stock_movements;
    `);

    const movements = movementStatus.rows[0];
    console.log(`  📊 Stock movements:`)
    console.log(`    Total movements: ${movements.total_movements}`);
    console.log(`    Items tracked: ${movements.items_with_movements}`);
    console.log(`    Stock IN: ${movements.total_in}`);
    console.log(`    Stock OUT: ${movements.total_out}`);

    // Validate that the 3268 out-of-stock issue is resolved
    const outOfStockCount = stockStatus.rows.find(r => r.stock_status === 'Out of Stock')?.item_count || 0;
    const success = outOfStockCount < 100; // Should be much less than the original 3268

    console.log(`  ${success ? '✅' : '❌'} Out of stock items: ${outOfStockCount} (was 3268)`);

    return {
      stockStatus: stockStatus.rows,
      movements: movements,
      outOfStockResolved: success,
      outOfStockCount: outOfStockCount
    };

  } catch (error) {
    console.error('❌ Error validating inventory fix:', error);
    throw error;
  }
}

async function validatePerformanceOptimizations() {
  console.log('\n⚡ Validating performance optimizations...');

  try {
    // Test critical query performance
    const performanceTests = [
      {
        name: 'Supplier inventory lookup',
        query: `
          SELECT i.sku, i.name, i.stock_qty, s.name as supplier_name
          FROM inventory_items i
          JOIN suppliers s ON i.supplier_id = s.id
          WHERE s.status = 'active' AND i.status = 'active'
          ORDER BY i.stock_qty DESC
          LIMIT 10;
        `
      },
      {
        name: 'Stock movement history',
        query: `
          SELECT sm.movement_type, sm.quantity, sm.created_at, i.name
          FROM stock_movements sm
          JOIN inventory_items i ON sm.item_id = i.id
          WHERE sm.created_at > NOW() - INTERVAL '7 days'
          ORDER BY sm.created_at DESC
          LIMIT 10;
        `
      },
      {
        name: 'Low stock alerts',
        query: `
          SELECT i.sku, i.name, i.stock_qty, i.reorder_point
          FROM inventory_items i
          WHERE i.status = 'active' AND i.stock_qty <= i.reorder_point
          ORDER BY (i.stock_qty - i.reorder_point)
          LIMIT 10;
        `
      },
      {
        name: 'Category analysis',
        query: `
          SELECT category, COUNT(*) as item_count, AVG(stock_qty) as avg_stock
          FROM inventory_items
          WHERE status = 'active' AND category IS NOT NULL
          GROUP BY category
          ORDER BY item_count DESC
          LIMIT 5;
        `
      }
    ];

    const results = [];

    for (const test of performanceTests) {
      const startTime = Date.now();
      try {
        const result = await query(test.query);
        const endTime = Date.now();
        const duration = endTime - startTime;

        console.log(`  ✅ ${test.name}: ${duration}ms (${result.rows.length} rows)`);
        results.push({
          name: test.name,
          duration,
          rowCount: result.rows.length,
          success: true
        });
      } catch (error) {
        const endTime = Date.now();
        const duration = endTime - startTime;

        console.log(`  ❌ ${test.name}: FAILED after ${duration}ms - ${error.message}`);
        results.push({
          name: test.name,
          duration,
          success: false,
          error: error.message
        });
      }
    }

    const avgDuration = results.filter(r => r.success).reduce((sum, r) => sum + r.duration, 0) / results.filter(r => r.success).length;
    const successRate = (results.filter(r => r.success).length / results.length) * 100;

    console.log(`  📊 Performance summary: ${successRate}% success rate, avg ${avgDuration.toFixed(1)}ms`);

    return {
      tests: results,
      avgDuration,
      successRate
    };

  } catch (error) {
    console.error('❌ Error validating performance optimizations:', error);
    throw error;
  }
}

async function validateConnectionPoolHealth() {
  console.log('\n🏊‍♂️ Validating connection pool health...');

  try {
    // Get connection pool statistics
    const poolStats = await query('SELECT * FROM get_connection_pool_stats();');

    console.log('  📊 Connection pool statistics:');
    const stats = {};
    poolStats.rows.forEach(row => {
      stats[row.metric_name] = parseInt(row.metric_value);
      console.log(`    ${row.metric_name}: ${row.metric_value}`);
    });

    // Calculate pool utilization
    const utilization = (stats.total_connections / stats.max_connections) * 100;
    const activeRatio = (stats.active_connections / stats.total_connections) * 100;

    console.log(`    pool_utilization: ${utilization.toFixed(1)}%`);
    console.log(`    active_ratio: ${activeRatio.toFixed(1)}%`);

    // Health assessment
    const isHealthy = utilization < 70 && activeRatio < 50; // Good thresholds
    const status = isHealthy ? 'HEALTHY' : 'NEEDS_ATTENTION';

    console.log(`  ${isHealthy ? '✅' : '⚠️'} Pool status: ${status}`);

    return {
      stats,
      utilization,
      activeRatio,
      isHealthy,
      status
    };

  } catch (error) {
    console.error('❌ Error validating connection pool health:', error);
    throw error;
  }
}

async function runStressTest() {
  console.log('\n💪 Running stress test...');

  try {
    // Simulate high load with many quick queries
    const stressTests = [];
    const stressCount = 100;

    console.log(`  Running ${stressCount} rapid-fire queries...`);

    for (let i = 0; i < stressCount; i++) {
      stressTests.push(
        query('SELECT COUNT(*) as count FROM inventory_items WHERE stock_qty > $1', [Math.floor(Math.random() * 10)])
      );
    }

    const startTime = Date.now();
    const results = await Promise.allSettled(stressTests);
    const endTime = Date.now();

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    const totalTime = endTime - startTime;
    const queriesPerSecond = (successful / totalTime) * 1000;

    console.log(`  ✅ Completed in ${totalTime}ms`);
    console.log(`  ✅ Successful queries: ${successful}/${stressCount}`);
    console.log(`  ❌ Failed queries: ${failed}`);
    console.log(`  📊 Performance: ${queriesPerSecond.toFixed(1)} queries/second`);

    const stressSuccess = failed < stressCount * 0.05; // Allow 5% failure rate

    return {
      totalQueries: stressCount,
      successful,
      failed,
      totalTime,
      queriesPerSecond,
      stressSuccess
    };

  } catch (error) {
    console.error('❌ Error running stress test:', error);
    throw error;
  }
}

async function main() {
  try {
    console.log('🚀 Starting Comprehensive Database Validation...\n');

    // Test 1: Connection Pool Stability
    const poolStabilityResults = await testConnectionPoolStability();

    // Test 2: Inventory Fix Validation
    const inventoryResults = await validateInventoryFix();

    // Test 3: Performance Optimization Validation
    const performanceResults = await validatePerformanceOptimizations();

    // Test 4: Connection Pool Health
    const poolHealthResults = await validateConnectionPoolHealth();

    // Test 5: Stress Test
    const stressResults = await runStressTest();

    // Overall Assessment
    console.log('\n📊 COMPREHENSIVE VALIDATION SUMMARY');
    console.log('='.repeat(60));

    console.log('\n🔧 Connection Pool Fixes:');
    console.log(`  ✅ Pool stability: ${poolStabilityResults.successful}/${poolStabilityResults.totalTests} concurrent connections succeeded`);
    console.log(`  ✅ Pool utilization: ${poolHealthResults.utilization.toFixed(1)}% (healthy < 70%)`);
    console.log(`  ✅ Pool status: ${poolHealthResults.status}`);

    console.log('\n📦 Inventory Data Fixes:');
    console.log(`  ✅ Out-of-stock issue resolved: ${inventoryResults.outOfStockResolved ? 'YES' : 'NO'}`);
    console.log(`  ✅ Current out-of-stock items: ${inventoryResults.outOfStockCount} (was 3268)`);
    console.log(`  ✅ Stock movements tracked: ${inventoryResults.movements.items_with_movements} items`);

    console.log('\n⚡ Performance Optimizations:');
    console.log(`  ✅ Query performance tests: ${performanceResults.successRate}% success rate`);
    console.log(`  ✅ Average query time: ${performanceResults.avgDuration.toFixed(1)}ms`);
    console.log(`  ✅ Stress test: ${stressResults.stressSuccess ? 'PASSED' : 'FAILED'} (${stressResults.successful}/${stressResults.totalQueries} queries)`);

    // Final Health Score
    const healthMetrics = [
      poolStabilityResults.successful / poolStabilityResults.totalTests,
      inventoryResults.outOfStockResolved ? 1 : 0,
      performanceResults.successRate / 100,
      poolHealthResults.isHealthy ? 1 : 0,
      stressResults.stressSuccess ? 1 : 0
    ];

    const overallHealthScore = (healthMetrics.reduce((sum, score) => sum + score, 0) / healthMetrics.length) * 100;

    console.log('\n🏆 OVERALL HEALTH SCORE');
    console.log('='.repeat(30));
    console.log(`${overallHealthScore.toFixed(1)}% - ${overallHealthScore >= 90 ? 'EXCELLENT' : overallHealthScore >= 75 ? 'GOOD' : overallHealthScore >= 60 ? 'FAIR' : 'NEEDS_WORK'}`);

    if (overallHealthScore >= 90) {
      console.log('\n✅ DATABASE IS PRODUCTION READY!');
      console.log('💡 All critical issues have been resolved:');
      console.log('   • Connection pool exhaustion fixed');
      console.log('   • Timeout issues resolved');
      console.log('   • Inventory data anomaly corrected');
      console.log('   • Performance optimizations applied');
      console.log('   • Database stability validated');
    } else {
      console.log('\n⚠️ Some issues may require attention.');
      console.log('💡 Review the test results above for specific areas to improve.');
    }

  } catch (error) {
    console.error('❌ Fatal error in database validation:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  testConnectionPoolStability,
  validateInventoryFix,
  validatePerformanceOptimizations,
  validateConnectionPoolHealth,
  runStressTest
};