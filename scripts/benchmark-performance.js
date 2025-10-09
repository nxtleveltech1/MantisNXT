/**
 * ITERATION 1 - CHECKPOINT 6: Performance Benchmark Script
 *
 * Measures query performance before and after optimizations
 * - Tests with realistic 25k+ dataset
 * - Measures query execution time, throughput, concurrency
 * - Generates before/after comparison report
 *
 * Usage: node scripts/benchmark-performance.js
 */

const { Pool } = require('pg');
const { performance } = require('perf_hooks');
const fs = require('fs');
const path = require('path');

// Configuration
const connectionString = process.env.DATABASE_URL || process.env.ENTERPRISE_DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL or ENTERPRISE_DATABASE_URL must be set');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  max: 20,
  min: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: connectionString.includes('sslmode=require') ? { rejectUnauthorized: false } : undefined,
});

// Benchmark queries
const benchmarkQueries = [
  {
    name: 'Inventory List - No Filter',
    description: 'SELECT all inventory items with pagination',
    query: 'SELECT * FROM inventory_items LIMIT 250',
    params: [],
    expectedRows: 250,
  },
  {
    name: 'Inventory List - Supplier Filter',
    description: 'Filter inventory by supplier_id',
    query: 'SELECT * FROM inventory_items WHERE supplier_id = $1 LIMIT 250',
    params: ['supplier-uuid-1'], // Replace with actual supplier ID
    expectedRows: null, // Variable
  },
  {
    name: 'Inventory List - Stock Status Filter',
    description: 'Find all low stock items',
    query: 'SELECT * FROM inventory_items WHERE stock_qty > 0 AND stock_qty <= reorder_point LIMIT 100',
    params: [],
    expectedRows: null, // Variable
  },
  {
    name: 'Inventory Search - SKU',
    description: 'Search inventory by SKU (ILIKE)',
    query: "SELECT * FROM inventory_items WHERE sku ILIKE $1 LIMIT 50",
    params: ['%ABC%'],
    expectedRows: null, // Variable
  },
  {
    name: 'Inventory Search - Name',
    description: 'Search inventory by name (ILIKE)',
    query: "SELECT * FROM inventory_items WHERE name ILIKE $1 LIMIT 50",
    params: ['%widget%'],
    expectedRows: null, // Variable
  },
  {
    name: 'Dashboard KPIs - Count',
    description: 'Count total inventory items',
    query: 'SELECT COUNT(*) as count FROM inventory_items',
    params: [],
    expectedRows: 1,
  },
  {
    name: 'Dashboard KPIs - Aggregations',
    description: 'Calculate total inventory value',
    query: 'SELECT SUM(stock_qty * cost_price) as total_value FROM inventory_items',
    params: [],
    expectedRows: 1,
  },
  {
    name: 'Dashboard KPIs - Low Stock Count',
    description: 'Count low stock items',
    query: 'SELECT COUNT(*) as count FROM inventory_items WHERE stock_qty <= reorder_point AND stock_qty > 0',
    params: [],
    expectedRows: 1,
  },
  {
    name: 'Supplier List',
    description: 'SELECT all suppliers with pagination',
    query: 'SELECT * FROM suppliers ORDER BY name ASC LIMIT 10',
    params: [],
    expectedRows: 10,
  },
  {
    name: 'Supplier Metrics',
    description: 'Calculate supplier performance metrics',
    query: `
      SELECT
        COUNT(*) as total_suppliers,
        COUNT(*) FILTER (WHERE status = 'active') as active_suppliers,
        AVG(COALESCE(CAST(rating AS FLOAT), 75)) as avg_performance_score
      FROM suppliers
    `,
    params: [],
    expectedRows: 1,
  },
  {
    name: 'Stock Movements - Recent',
    description: 'Get recent stock movements (last 30 days)',
    query: `
      SELECT movement_type, quantity, created_at
      FROM stock_movements
      WHERE created_at >= NOW() - INTERVAL '30 days'
      LIMIT 100
    `,
    params: [],
    expectedRows: null, // Variable
  },
  {
    name: 'JOIN - Inventory with Suppliers',
    description: 'JOIN inventory_items with suppliers',
    query: `
      SELECT
        ii.id,
        ii.sku,
        ii.name,
        ii.stock_qty,
        s.name as supplier_name
      FROM inventory_items ii
      LEFT JOIN suppliers s ON s.id = ii.supplier_id
      LIMIT 100
    `,
    params: [],
    expectedRows: 100,
  },
];

// Benchmark results
const results = [];

/**
 * Run a single query benchmark
 */
async function benchmarkQuery(queryDef, iterations = 5) {
  console.log(`\n📊 Benchmarking: ${queryDef.name}`);
  console.log(`   Description: ${queryDef.description}`);

  const durations = [];
  let totalRows = 0;
  let errors = 0;

  for (let i = 0; i < iterations; i++) {
    const startTime = performance.now();

    try {
      const result = await pool.query(queryDef.query, queryDef.params);
      const duration = performance.now() - startTime;

      durations.push(duration);
      totalRows += result.rowCount || 0;

      console.log(`   Iteration ${i + 1}/${iterations}: ${duration.toFixed(2)}ms (${result.rowCount} rows)`);
    } catch (error) {
      errors++;
      const duration = performance.now() - startTime;
      durations.push(duration);
      console.error(`   Iteration ${i + 1}/${iterations}: ERROR after ${duration.toFixed(2)}ms - ${error.message}`);
    }
  }

  // Calculate statistics
  const sortedDurations = durations.slice().sort((a, b) => a - b);
  const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
  const minDuration = Math.min(...durations);
  const maxDuration = Math.max(...durations);
  const p50Duration = sortedDurations[Math.floor(sortedDurations.length * 0.5)];
  const p95Duration = sortedDurations[Math.floor(sortedDurations.length * 0.95)];
  const p99Duration = sortedDurations[Math.floor(sortedDurations.length * 0.99)];
  const avgRows = totalRows / iterations;

  const result = {
    name: queryDef.name,
    description: queryDef.description,
    iterations,
    avgDuration: parseFloat(avgDuration.toFixed(2)),
    minDuration: parseFloat(minDuration.toFixed(2)),
    maxDuration: parseFloat(maxDuration.toFixed(2)),
    p50Duration: parseFloat(p50Duration.toFixed(2)),
    p95Duration: parseFloat(p95Duration.toFixed(2)),
    p99Duration: parseFloat(p99Duration.toFixed(2)),
    avgRows: Math.round(avgRows),
    errors,
    successRate: parseFloat(((iterations - errors) / iterations * 100).toFixed(2)),
  };

  results.push(result);

  console.log(`   ✅ Results: Avg=${avgDuration.toFixed(2)}ms, P50=${p50Duration.toFixed(2)}ms, P95=${p95Duration.toFixed(2)}ms, Rows=${Math.round(avgRows)}`);

  return result;
}

/**
 * Run concurrent benchmark
 */
async function benchmarkConcurrency(concurrency = 10) {
  console.log(`\n📊 Benchmarking Concurrency: ${concurrency} concurrent queries`);

  const query = 'SELECT * FROM inventory_items LIMIT 10';
  const startTime = performance.now();

  const promises = [];
  for (let i = 0; i < concurrency; i++) {
    promises.push(pool.query(query));
  }

  try {
    await Promise.all(promises);
    const duration = performance.now() - startTime;
    const throughput = (concurrency / duration) * 1000; // queries per second

    console.log(`   ✅ ${concurrency} concurrent queries completed in ${duration.toFixed(2)}ms`);
    console.log(`   Throughput: ${throughput.toFixed(2)} queries/second`);

    return {
      concurrency,
      duration: parseFloat(duration.toFixed(2)),
      throughput: parseFloat(throughput.toFixed(2)),
      success: true,
    };
  } catch (error) {
    console.error(`   ❌ Concurrency test failed: ${error.message}`);
    return {
      concurrency,
      duration: null,
      throughput: null,
      success: false,
      error: error.message,
    };
  }
}

/**
 * Check if optimizations are applied
 */
async function checkOptimizations() {
  console.log('\n🔍 Checking optimization status...\n');

  const checks = [];

  // Check indexes
  try {
    const { rows } = await pool.query(`
      SELECT
        schemaname,
        tablename,
        indexname,
        pg_size_pretty(pg_relation_size(indexrelid)) as index_size
      FROM pg_stat_user_indexes
      WHERE schemaname = 'public'
        AND tablename IN ('inventory_item', 'suppliers', 'stock_movements')
      ORDER BY tablename, indexname
    `);

    console.log(`✅ Found ${rows.length} indexes on key tables`);
    checks.push({ name: 'Indexes', status: 'Applied', count: rows.length });

    // List key indexes
    const keyIndexes = rows.filter(r =>
      r.indexname.includes('supplier_id') ||
      r.indexname.includes('stock_qty') ||
      r.indexname.includes('sku') ||
      r.indexname.includes('trgm')
    );

    if (keyIndexes.length > 0) {
      console.log('   Key indexes found:');
      keyIndexes.forEach(idx => {
        console.log(`   - ${idx.indexname} on ${idx.tablename} (${idx.index_size})`);
      });
    }
  } catch (error) {
    console.error(`❌ Failed to check indexes: ${error.message}`);
    checks.push({ name: 'Indexes', status: 'Error', error: error.message });
  }

  // Check materialized views
  try {
    const { rows } = await pool.query(`
      SELECT
        schemaname,
        matviewname,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||matviewname)) as size
      FROM pg_matviews
      WHERE schemaname = 'public'
        AND matviewname LIKE 'mv_%'
    `);

    console.log(`\n✅ Found ${rows.length} materialized views`);
    checks.push({ name: 'Materialized Views', status: 'Applied', count: rows.length });

    if (rows.length > 0) {
      console.log('   Materialized views found:');
      rows.forEach(mv => {
        console.log(`   - ${mv.matviewname} (${mv.size})`);
      });
    }
  } catch (error) {
    console.error(`❌ Failed to check materialized views: ${error.message}`);
    checks.push({ name: 'Materialized Views', status: 'Error', error: error.message });
  }

  // Check extensions
  try {
    const { rows } = await pool.query(`
      SELECT extname, extversion
      FROM pg_extension
      WHERE extname IN ('pg_stat_statements', 'pg_trgm', 'btree_gin')
    `);

    console.log(`\n✅ Found ${rows.length}/3 required extensions`);
    checks.push({ name: 'Extensions', status: 'Applied', count: rows.length });

    rows.forEach(ext => {
      console.log(`   - ${ext.extname} v${ext.extversion}`);
    });
  } catch (error) {
    console.error(`❌ Failed to check extensions: ${error.message}`);
    checks.push({ name: 'Extensions', status: 'Error', error: error.message });
  }

  // Check connection pool status
  try {
    const { rows } = await pool.query('SELECT version() as pg_version');
    console.log(`\n✅ Database connection: ${rows[0].pg_version.split(',')[0]}`);
    console.log(`   Pool status: ${pool.totalCount} total, ${pool.idleCount} idle, ${pool.waitingCount} waiting`);
    checks.push({
      name: 'Connection Pool',
      status: 'Active',
      total: pool.totalCount,
      idle: pool.idleCount,
      waiting: pool.waitingCount,
    });
  } catch (error) {
    console.error(`❌ Failed to check connection pool: ${error.message}`);
    checks.push({ name: 'Connection Pool', status: 'Error', error: error.message });
  }

  return checks;
}

/**
 * Generate performance report
 */
function generateReport(results, concurrencyResults, optimizations) {
  const timestamp = new Date().toISOString();

  const report = {
    timestamp,
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      poolMax: pool.options.max,
      poolMin: pool.options.min,
    },
    optimizations,
    queryBenchmarks: results,
    concurrencyTests: concurrencyResults,
    summary: {
      totalQueries: results.length,
      avgQueryTime: parseFloat((results.reduce((sum, r) => sum + r.avgDuration, 0) / results.length).toFixed(2)),
      slowestQuery: results.reduce((max, r) => r.avgDuration > max.avgDuration ? r : max),
      fastestQuery: results.reduce((min, r) => r.avgDuration < min.avgDuration ? r : min),
      totalErrors: results.reduce((sum, r) => sum + r.errors, 0),
      avgSuccessRate: parseFloat((results.reduce((sum, r) => sum + r.successRate, 0) / results.length).toFixed(2)),
    },
  };

  // Write report to file
  const reportPath = path.join(__dirname, '..', 'test-results', `performance-benchmark-${Date.now()}.json`);
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log(`\n📄 Report saved to: ${reportPath}`);

  return report;
}

/**
 * Print summary
 */
function printSummary(report) {
  console.log('\n' + '='.repeat(80));
  console.log('📊 PERFORMANCE BENCHMARK SUMMARY');
  console.log('='.repeat(80));

  console.log(`\n⏱️  Average Query Time: ${report.summary.avgQueryTime}ms`);
  console.log(`✅ Success Rate: ${report.summary.avgSuccessRate}%`);
  console.log(`❌ Total Errors: ${report.summary.totalErrors}`);

  console.log(`\n🐌 Slowest Query: ${report.summary.slowestQuery.name}`);
  console.log(`   Duration: ${report.summary.slowestQuery.avgDuration}ms (P95: ${report.summary.slowestQuery.p95Duration}ms)`);

  console.log(`\n⚡ Fastest Query: ${report.summary.fastestQuery.name}`);
  console.log(`   Duration: ${report.summary.fastestQuery.avgDuration}ms (P95: ${report.summary.fastestQuery.p95Duration}ms)`);

  if (report.concurrencyTests.length > 0) {
    console.log(`\n🔀 Concurrency Tests:`);
    report.concurrencyTests.forEach(ct => {
      if (ct.success) {
        console.log(`   ${ct.concurrency} concurrent: ${ct.duration}ms (${ct.throughput} queries/sec)`);
      } else {
        console.log(`   ${ct.concurrency} concurrent: FAILED - ${ct.error}`);
      }
    });
  }

  console.log('\n' + '='.repeat(80));
}

/**
 * Main benchmark execution
 */
async function main() {
  console.log('🚀 Starting Performance Benchmark');
  console.log('=' .repeat(80));

  try {
    // Check optimizations
    const optimizations = await checkOptimizations();

    // Run query benchmarks
    console.log('\n📊 Running Query Benchmarks...');
    for (const queryDef of benchmarkQueries) {
      await benchmarkQuery(queryDef, 5);
    }

    // Run concurrency benchmarks
    console.log('\n📊 Running Concurrency Benchmarks...');
    const concurrencyResults = [];
    for (const concurrency of [1, 5, 10, 20]) {
      const result = await benchmarkConcurrency(concurrency);
      concurrencyResults.push(result);
    }

    // Generate report
    const report = generateReport(results, concurrencyResults, optimizations);

    // Print summary
    printSummary(report);

    console.log('\n✅ Benchmark completed successfully');
  } catch (error) {
    console.error(`\n❌ Benchmark failed: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run benchmark
main();
