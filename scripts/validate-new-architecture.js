#!/usr/bin/env node

/**
 * MantisNXT Architecture Validation Script
 * Tests new enterprise connection manager and system stability
 */

const path = require('path');

// Add the project root to the module path
process.env.NODE_PATH = path.join(__dirname, '..');
require('module')._initPaths();

async function validateArchitecture() {
  console.log('🔍 MantisNXT Architecture Validation');
  console.log('=====================================\n');

  const results = {
    database: { passed: false, details: null },
    connections: { passed: false, details: null },
    monitoring: { passed: false, details: null },
    overall: { passed: false, score: 0 }
  };

  // Test 1: Database Connection Manager
  console.log('📊 Test 1: Enterprise Database Connection Manager');
  try {
    const { dbManager, testConnection } = await import('../lib/database/enterprise-connection-manager.ts');

    console.log('  ✅ Module import successful');

    // Test connection
    const connectionTest = await testConnection();

    if (connectionTest.success) {
      console.log('  ✅ Database connection test passed');
      console.log(`     Response time: ${connectionTest.details.responseTime}ms`);
      console.log(`     Pool status: ${connectionTest.details.pool.active}/${connectionTest.details.pool.total} active`);

      results.database.passed = true;
      results.database.details = connectionTest.details;
    } else {
      console.log('  ❌ Database connection failed:', connectionTest.error);
    }

  } catch (error) {
    console.log('  ❌ Enterprise connection manager error:', error.message);
    console.log('     Falling back to unified connection test...');

    try {
      const { testConnection: unifiedTest } = await import('../lib/database/unified-connection.ts');
      const fallbackTest = await unifiedTest();

      if (fallbackTest.success) {
        console.log('  ⚠️ Fallback connection successful');
        results.database.passed = true;
        results.database.details = fallbackTest.details;
      }
    } catch (fallbackError) {
      console.log('  ❌ Fallback connection also failed:', fallbackError.message);
    }
  }

  // Test 2: Connection Pool Management
  console.log('\n🏊‍♂️ Test 2: Connection Pool Management');
  try {
    const { dbManager } = await import('../lib/database/enterprise-connection-manager.ts');

    const poolStatus = dbManager.getPoolStatus();
    console.log('  ✅ Pool status retrieval successful');
    console.log(`     Total connections: ${poolStatus.total}`);
    console.log(`     Active connections: ${poolStatus.active}`);
    console.log(`     Idle connections: ${poolStatus.idle}`);
    console.log(`     Waiting connections: ${poolStatus.waiting}`);

    // Test multiple quick queries to verify pool management
    console.log('  🔄 Testing concurrent queries...');

    const queryPromises = [];
    for (let i = 0; i < 3; i++) {
      queryPromises.push(
        dbManager.query('SELECT NOW() as test_time, $1 as test_id', [i])
      );
    }

    const queryResults = await Promise.all(queryPromises);
    console.log(`  ✅ ${queryResults.length} concurrent queries completed successfully`);

    results.connections.passed = true;
    results.connections.details = {
      poolStatus,
      concurrentQueries: queryResults.length
    };

  } catch (error) {
    console.log('  ❌ Connection pool test failed:', error.message);
  }

  // Test 3: System Resource Monitoring
  console.log('\n📈 Test 3: System Resource Monitoring');
  try {
    const SystemResourceMonitor = require('./system-resource-monitor.js');
    const monitor = new SystemResourceMonitor();

    console.log('  ✅ Resource monitor initialization successful');

    // Perform a quick system check
    await monitor.checkSystemResources();

    console.log('  ✅ System resource check completed');

    results.monitoring.passed = true;
    results.monitoring.details = {
      monitorActive: true,
      systemCheckCompleted: true
    };

  } catch (error) {
    console.log('  ❌ System monitoring test failed:', error.message);
  }

  // Calculate overall score
  const passedTests = Object.values(results).filter(test => test.passed).length - 1; // Exclude overall
  const totalTests = Object.keys(results).length - 1; // Exclude overall
  const score = Math.round((passedTests / totalTests) * 100);

  results.overall.passed = score >= 80;
  results.overall.score = score;

  // Generate report
  console.log('\n📋 Validation Report');
  console.log('====================');
  console.log(`Overall Score: ${score}% (${passedTests}/${totalTests} tests passed)`);
  console.log(`Status: ${results.overall.passed ? '✅ PASS' : '❌ FAIL'}`);

  if (results.database.passed) {
    console.log('\n✅ Database Architecture: STABLE');
    console.log(`   Response Time: ${results.database.details.responseTime}ms`);
    console.log(`   Pool Utilization: ${results.database.details.pool.active}/${results.database.details.pool.total}`);
  } else {
    console.log('\n❌ Database Architecture: UNSTABLE');
  }

  if (results.connections.passed) {
    console.log('\n✅ Connection Management: STABLE');
    console.log(`   Concurrent Query Support: ${results.connections.details.concurrentQueries} queries`);
    console.log(`   Pool Status: ${results.connections.details.poolStatus.active} active, ${results.connections.details.poolStatus.waiting} waiting`);
  } else {
    console.log('\n❌ Connection Management: UNSTABLE');
  }

  if (results.monitoring.passed) {
    console.log('\n✅ System Monitoring: ACTIVE');
  } else {
    console.log('\n❌ System Monitoring: INACTIVE');
  }

  // Recommendations
  console.log('\n💡 Recommendations');
  console.log('===================');

  if (!results.database.passed) {
    console.log('❗ Fix database connectivity issues before production deployment');
  }

  if (!results.connections.passed) {
    console.log('❗ Review connection pool configuration and error handling');
  }

  if (!results.monitoring.passed) {
    console.log('❗ Enable system monitoring for production readiness');
  }

  if (results.overall.passed) {
    console.log('🎉 System architecture is stable and ready for development/testing');
    console.log('🚀 Consider running load tests for production validation');
  } else {
    console.log('⚠️ System requires attention before production deployment');
  }

  return results;
}

// Run validation
if (require.main === module) {
  validateArchitecture()
    .then(results => {
      const exitCode = results.overall.passed ? 0 : 1;
      console.log(`\n🏁 Validation completed with exit code: ${exitCode}`);
      process.exit(exitCode);
    })
    .catch(error => {
      console.error('❌ Validation script error:', error);
      process.exit(1);
    });
}

module.exports = validateArchitecture;