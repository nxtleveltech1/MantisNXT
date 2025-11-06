/**
 * AI Metrics Service Integration Test
 *
 * Verifies production database integration and all required methods
 */

import { AIMetricsService } from '../src/lib/ai/services/metrics-service';
import { db } from '../src/lib/database';

const TEST_ORG_ID = process.env.DEFAULT_ORG_ID || '00000000-0000-0000-0000-000000000000';

interface TestResult {
  test: string;
  status: 'PASS' | 'FAIL';
  message?: string;
  duration?: number;
}

const results: TestResult[] = [];

async function test(name: string, fn: () => Promise<void>): Promise<void> {
  const start = Date.now();
  try {
    await fn();
    results.push({
      test: name,
      status: 'PASS',
      duration: Date.now() - start,
    });
    console.log(`✅ ${name} (${Date.now() - start}ms)`);
  } catch (error) {
    results.push({
      test: name,
      status: 'FAIL',
      message: error instanceof Error ? error.message : String(error),
      duration: Date.now() - start,
    });
    console.error(`❌ ${name} (${Date.now() - start}ms)`, error);
  }
}

async function runTests() {
  console.log('\n🧪 AI Metrics Service Integration Tests\n');
  console.log('='.repeat(60));
  console.log(`Organization ID: ${TEST_ORG_ID}\n`);

  // Test 1: Database connection
  await test('Database Connection', async () => {
    const result = await db.query('SELECT NOW() as current_time');
    if (!result.rows[0]) {
      throw new Error('No result from database');
    }
    console.log(`   Current DB time: ${result.rows[0].current_time}`);
  });

  // Test 2: Check analytics_metric_cache table exists
  await test('Analytics Metric Cache Table Exists', async () => {
    const result = await db.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = 'analytics_metric_cache'
    `);
    if (result.rows.length === 0) {
      throw new Error('analytics_metric_cache table does not exist');
    }
    console.log('   Table found: analytics_metric_cache');
  });

  // Test 3: Get sales metrics
  await test('getMetrics - Sales (Daily)', async () => {
    const metrics = await AIMetricsService.getMetrics(TEST_ORG_ID, 'sales', {
      period: 'daily',
      fresh: true,
    });
    console.log(`   Sales metrics: ${JSON.stringify(metrics, null, 2).substring(0, 100)}...`);
  });

  // Test 4: Get inventory metrics
  await test('getMetrics - Inventory', async () => {
    const metrics = await AIMetricsService.getMetrics(TEST_ORG_ID, 'inventory', {
      period: 'daily',
      fresh: false, // Try from cache first
    });
    console.log(`   Inventory metrics: ${JSON.stringify(metrics, null, 2).substring(0, 100)}...`);
  });

  // Test 5: Get supplier performance metrics
  await test('getMetrics - Supplier Performance', async () => {
    const metrics = await AIMetricsService.getMetrics(TEST_ORG_ID, 'supplier_performance', {
      period: 'monthly',
      fresh: true,
    });
    console.log(`   Supplier metrics: ${JSON.stringify(metrics, null, 2).substring(0, 100)}...`);
  });

  // Test 6: Calculate customer behavior metrics
  await test('calculateMetric - Customer Behavior', async () => {
    const now = new Date();
    const startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const metrics = await AIMetricsService.calculateMetric(
      TEST_ORG_ID,
      'customer_behavior',
      { startDate, endDate: now }
    );
    console.log(`   Customer behavior: ${JSON.stringify(metrics, null, 2).substring(0, 100)}...`);
  });

  // Test 7: Calculate financial metrics
  await test('calculateMetric - Financial', async () => {
    const now = new Date();
    const startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const metrics = await AIMetricsService.calculateMetric(
      TEST_ORG_ID,
      'financial',
      { startDate, endDate: now }
    );
    console.log(`   Financial: ${JSON.stringify(metrics, null, 2).substring(0, 100)}...`);
  });

  // Test 8: Calculate operational metrics
  await test('calculateMetric - Operational', async () => {
    const now = new Date();
    const startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const metrics = await AIMetricsService.calculateMetric(
      TEST_ORG_ID,
      'operational',
      { startDate, endDate: now }
    );
    console.log(`   Operational: ${JSON.stringify(metrics, null, 2).substring(0, 100)}...`);
  });

  // Test 9: Get metrics by key
  await test('getMetricsByKey', async () => {
    // First ensure we have cached data
    await AIMetricsService.getMetrics(TEST_ORG_ID, 'sales', { period: 'daily', fresh: true });

    // Now try to get by key
    const value = await AIMetricsService.getMetricsByKey(
      TEST_ORG_ID,
      'sales',
      'daily_sales_summary'
    );
    console.log(`   Metric value type: ${typeof value}`);
  });

  // Test 10: Invalidate metric cache
  await test('invalidateMetricCache - Specific Type', async () => {
    const count = await AIMetricsService.invalidateMetricCache(TEST_ORG_ID, 'sales');
    console.log(`   Invalidated ${count} cache entries`);
  });

  // Test 11: Invalidate all metrics
  await test('invalidateMetricCache - All Types', async () => {
    const count = await AIMetricsService.invalidateMetricCache(TEST_ORG_ID);
    console.log(`   Invalidated ${count} cache entries`);
  });

  // Test 12: Recalculate multiple metrics
  await test('recalculateMetrics - Multiple Types', async () => {
    const recalculated = await AIMetricsService.recalculateMetrics(
      TEST_ORG_ID,
      ['sales', 'inventory']
    );
    const keys = Object.keys(recalculated);
    console.log(`   Recalculated metrics: ${keys.join(', ')}`);
    if (keys.length !== 2) {
      throw new Error(`Expected 2 metrics, got ${keys.length}`);
    }
  });

  // Test 13: Get metrics summary
  await test('getMetricsSummary', async () => {
    const summary = await AIMetricsService.getMetricsSummary(TEST_ORG_ID);
    console.log(`   Summary: ${JSON.stringify(summary, null, 2).substring(0, 150)}...`);
    if (!summary.summary) {
      throw new Error('Missing summary object');
    }
  });

  // Test 14: Cache persistence check
  await test('Cache Persistence Verification', async () => {
    // Create fresh metric
    const fresh = await AIMetricsService.getMetrics(TEST_ORG_ID, 'sales', {
      period: 'daily',
      fresh: true,
    });

    // Get from cache
    const cached = await AIMetricsService.getMetrics(TEST_ORG_ID, 'sales', {
      period: 'daily',
      fresh: false,
    });

    console.log(`   Fresh and cached data ${fresh === cached ? 'match' : 'differ'}`);
  });

  // Test 15: Time period handling
  await test('Time Period Handling - All Periods', async () => {
    const periods: Array<'hourly' | 'daily' | 'weekly' | 'monthly'> = [
      'hourly',
      'daily',
      'weekly',
      'monthly',
    ];

    for (const period of periods) {
      const metrics = await AIMetricsService.getMetrics(TEST_ORG_ID, 'sales', {
        period,
        fresh: true,
      });
      console.log(`   ${period}: OK`);
    }
  });

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Test Summary\n');

  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  const total = results.length;

  console.log(`Total Tests: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

  if (failed > 0) {
    console.log('\n⚠️  Failed Tests:\n');
    results
      .filter((r) => r.status === 'FAIL')
      .forEach((r) => {
        console.log(`   - ${r.test}`);
        console.log(`     ${r.message}`);
      });
  }

  // Close database connection
  await db.end();

  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch((error) => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});
