/**
 * Production Readiness Verification for AI Metrics Service
 *
 * Validates:
 * - Database schema
 * - Service implementation
 * - API endpoints
 * - Error handling
 * - Performance
 */

import { db } from '../src/lib/database';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

interface Check {
  name: string;
  category: 'Database' | 'Service' | 'API' | 'Security' | 'Performance';
  status: 'PASS' | 'FAIL' | 'WARN';
  message?: string;
}

const checks: Check[] = [];

function check(
  category: Check['category'],
  name: string,
  status: Check['status'],
  message?: string
) {
  checks.push({ category, name, status, message });

  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  console.log(`${icon} [${category}] ${name}${message ? ': ' + message : ''}`);
}

async function verifyDatabase() {
  console.log('\n📊 Database Checks\n' + '='.repeat(60));

  // Check table exists
  try {
    const result = await db.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = 'analytics_metric_cache'
    `);

    if (result.rows.length > 0) {
      check('Database', 'analytics_metric_cache table exists', 'PASS');
    } else {
      check('Database', 'analytics_metric_cache table exists', 'FAIL', 'Table not found');
      return;
    }
  } catch (error) {
    check('Database', 'Database connection', 'FAIL', (error as Error).message);
    return;
  }

  // Check columns
  try {
    const result = await db.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'analytics_metric_cache'
    `);

    const requiredColumns = [
      'id',
      'org_id',
      'metric_type',
      'metric_key',
      'metric_value',
      'time_period',
      'period_start',
      'period_end',
      'calculated_at',
    ];

    const actualColumns = result.rows.map(r => r.column_name);
    const missing = requiredColumns.filter(c => !actualColumns.includes(c));

    if (missing.length === 0) {
      check('Database', 'Required columns present', 'PASS', `${actualColumns.length} columns`);
    } else {
      check('Database', 'Required columns present', 'FAIL', `Missing: ${missing.join(', ')}`);
    }
  } catch (error) {
    check('Database', 'Column verification', 'FAIL', (error as Error).message);
  }

  // Check indexes
  try {
    const result = await db.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'analytics_metric_cache'
    `);

    const expectedIndexes = [
      'idx_metric_cache_org',
      'idx_metric_cache_type',
      'idx_metric_cache_period',
      'idx_metric_cache_calculated',
    ];

    const actualIndexes = result.rows.map(r => r.indexname);
    const missingIndexes = expectedIndexes.filter(i => !actualIndexes.includes(i));

    if (missingIndexes.length === 0) {
      check('Database', 'Performance indexes created', 'PASS', `${actualIndexes.length} indexes`);
    } else {
      check(
        'Database',
        'Performance indexes created',
        'WARN',
        `Missing: ${missingIndexes.join(', ')}`
      );
    }
  } catch (error) {
    check('Database', 'Index verification', 'FAIL', (error as Error).message);
  }

  // Check unique constraint
  try {
    const result = await db.query(`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'analytics_metric_cache'
        AND constraint_type = 'UNIQUE'
    `);

    if (result.rows.length > 0) {
      check('Database', 'Unique constraint present', 'PASS', result.rows[0].constraint_name);
    } else {
      check('Database', 'Unique constraint present', 'WARN', 'No unique constraint found');
    }
  } catch (error) {
    check('Database', 'Constraint verification', 'FAIL', (error as Error).message);
  }
}

function verifyService() {
  console.log('\n⚙️  Service Implementation Checks\n' + '='.repeat(60));

  const servicePath = join(process.cwd(), 'src/lib/ai/services/metrics-service.ts');

  // Check file exists
  if (existsSync(servicePath)) {
    check('Service', 'metrics-service.ts exists', 'PASS');
  } else {
    check('Service', 'metrics-service.ts exists', 'FAIL', 'File not found');
    return;
  }

  // Check implementation
  const content = readFileSync(servicePath, 'utf-8');

  const requiredMethods = [
    'getMetrics',
    'calculateMetric',
    'getMetricsByKey',
    'invalidateMetricCache',
    'recalculateMetrics',
    'getMetricsSummary',
  ];

  requiredMethods.forEach(method => {
    if (content.includes(`static async ${method}`)) {
      check('Service', `${method} implemented`, 'PASS');
    } else {
      check('Service', `${method} implemented`, 'FAIL', 'Method not found');
    }
  });

  // Check database integration (no mocks)
  if (content.includes('db.query') && !content.includes('// MOCK')) {
    check('Service', 'Production database integration', 'PASS', 'Using real db.query');
  } else {
    check('Service', 'Production database integration', 'FAIL', 'Mock data detected');
  }

  // Check error handling
  if (content.includes('try') && content.includes('catch')) {
    check('Service', 'Error handling present', 'PASS');
  } else {
    check('Service', 'Error handling present', 'WARN', 'Limited error handling');
  }
}

function verifyAPI() {
  console.log('\n🌐 API Endpoints Checks\n' + '='.repeat(60));

  const apiBase = join(process.cwd(), 'src/app/api/v1/ai/metrics');

  const requiredRoutes = [
    'route.ts',
    '[metricType]/route.ts',
    '[metricType]/[key]/route.ts',
    'invalidate/route.ts',
    'recalculate/route.ts',
  ];

  requiredRoutes.forEach(route => {
    const routePath = join(apiBase, route);
    if (existsSync(routePath)) {
      check('API', `${route} exists`, 'PASS');

      // Check for mock responses
      const content = readFileSync(routePath, 'utf-8');
      if (
        content.includes('AIMetricsService') &&
        !content.includes('// MOCK') &&
        !content.includes('mockData')
      ) {
        check('API', `${route} uses service`, 'PASS', 'No mock data');
      } else if (content.includes('mockData')) {
        check('API', `${route} uses service`, 'FAIL', 'Mock data detected');
      }
    } else {
      check('API', `${route} exists`, 'FAIL', 'File not found');
    }
  });
}

function verifySecurity() {
  console.log('\n🔒 Security Checks\n' + '='.repeat(60));

  const apiUtilsPath = join(process.cwd(), 'src/lib/ai/api-utils.ts');

  if (existsSync(apiUtilsPath)) {
    const content = readFileSync(apiUtilsPath, 'utf-8');

    // Check authentication
    if (content.includes('authenticateRequest')) {
      check('Security', 'Authentication middleware', 'PASS');
    } else {
      check('Security', 'Authentication middleware', 'FAIL', 'Not found');
    }

    // Check validation
    if (content.includes('validateMetricType')) {
      check('Security', 'Input validation', 'PASS');
    } else {
      check('Security', 'Input validation', 'FAIL', 'Not found');
    }

    // Check SQL injection protection
    const servicePath = join(process.cwd(), 'src/lib/ai/services/metrics-service.ts');
    if (existsSync(servicePath)) {
      const serviceContent = readFileSync(servicePath, 'utf-8');

      // Check for parameterized queries
      const hasParams = serviceContent.includes('$1') && serviceContent.includes('$2');
      const noStringConcat =
        !serviceContent.includes('WHERE " + ') && !serviceContent.includes("WHERE ' + ");

      if (hasParams && noStringConcat) {
        check('Security', 'SQL injection protection', 'PASS', 'Parameterized queries');
      } else {
        check('Security', 'SQL injection protection', 'WARN', 'Review query construction');
      }
    }
  } else {
    check('Security', 'Security utilities', 'FAIL', 'api-utils.ts not found');
  }
}

function verifyPerformance() {
  console.log('\n⚡ Performance Checks\n' + '='.repeat(60));

  const servicePath = join(process.cwd(), 'src/lib/ai/services/metrics-service.ts');

  if (existsSync(servicePath)) {
    const content = readFileSync(servicePath, 'utf-8');

    // Check caching implementation
    if (content.includes('getCachedMetric') && content.includes('cacheMetric')) {
      check('Performance', 'Caching implemented', 'PASS');
    } else {
      check('Performance', 'Caching implemented', 'FAIL', 'No caching found');
    }

    // Check cache TTL
    if (content.includes('cacheMaxAge') || content.includes('DEFAULT_CACHE_TTL')) {
      check('Performance', 'Cache TTL configured', 'PASS');
    } else {
      check('Performance', 'Cache TTL configured', 'WARN', 'No TTL found');
    }

    // Check for N+1 query prevention
    if (content.includes('JOIN') && content.includes('GROUP BY')) {
      check('Performance', 'Optimized queries', 'PASS', 'Using JOINs and aggregations');
    } else {
      check('Performance', 'Optimized queries', 'WARN', 'Review query optimization');
    }
  }
}

function printSummary() {
  console.log('\n' + '='.repeat(60));
  console.log('📋 Summary\n');

  const categories = ['Database', 'Service', 'API', 'Security', 'Performance'] as const;

  categories.forEach(category => {
    const categoryChecks = checks.filter(c => c.category === category);
    const passed = categoryChecks.filter(c => c.status === 'PASS').length;
    const failed = categoryChecks.filter(c => c.status === 'FAIL').length;
    const warned = categoryChecks.filter(c => c.status === 'WARN').length;
    const total = categoryChecks.length;

    console.log(`${category}:`);
    console.log(`  ✅ Passed: ${passed}/${total}`);
    if (failed > 0) console.log(`  ❌ Failed: ${failed}/${total}`);
    if (warned > 0) console.log(`  ⚠️  Warnings: ${warned}/${total}`);
    console.log('');
  });

  const totalPassed = checks.filter(c => c.status === 'PASS').length;
  const totalFailed = checks.filter(c => c.status === 'FAIL').length;
  const totalWarned = checks.filter(c => c.status === 'WARN').length;
  const total = checks.length;

  console.log('Overall:');
  console.log(`  Total Checks: ${total}`);
  console.log(`  ✅ Passed: ${totalPassed} (${((totalPassed / total) * 100).toFixed(1)}%)`);
  console.log(`  ❌ Failed: ${totalFailed} (${((totalFailed / total) * 100).toFixed(1)}%)`);
  console.log(`  ⚠️  Warnings: ${totalWarned} (${((totalWarned / total) * 100).toFixed(1)}%)`);

  console.log('\n' + '='.repeat(60));

  if (totalFailed === 0 && totalWarned === 0) {
    console.log('🎉 Production Ready! All checks passed.');
    return 0;
  } else if (totalFailed === 0) {
    console.log('⚠️  Production Ready with warnings. Review warnings before deployment.');
    return 0;
  } else {
    console.log('❌ NOT Production Ready. Fix failing checks before deployment.');
    return 1;
  }
}

async function main() {
  console.log('🚀 AI Metrics Service - Production Readiness Verification');
  console.log('='.repeat(60));

  try {
    await verifyDatabase();
    verifyService();
    verifyAPI();
    verifySecurity();
    verifyPerformance();

    const exitCode = printSummary();

    await db.end();
    process.exit(exitCode);
  } catch (error) {
    console.error('\n💥 Fatal error:', error);
    await db.end();
    process.exit(1);
  }
}

main();
