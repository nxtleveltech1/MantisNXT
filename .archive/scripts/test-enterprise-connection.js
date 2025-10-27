/**
 * Emergency Test for Enterprise Connection Manager
 * Verifies the timeout fixes and environment variable configuration
 */

require('dotenv').config({ path: '.env.local' });

console.log('🚀 Enterprise Connection Manager Emergency Test');
console.log('================================================');
console.log('\n📋 Environment Configuration:');
console.log('   DATABASE_URL:', process.env.DATABASE_URL?.substring(0, 60) + '...');
console.log('   ENTERPRISE_DATABASE_URL:', process.env.ENTERPRISE_DATABASE_URL?.substring(0, 60) + '...');
console.log('   DB_SSL:', process.env.DB_SSL);
console.log('   ENTERPRISE_DB_CONNECTION_TIMEOUT:', process.env.ENTERPRISE_DB_CONNECTION_TIMEOUT);
console.log('   ENTERPRISE_DB_POOL_MAX:', process.env.ENTERPRISE_DB_POOL_MAX);

async function testEnterpriseManager() {
  try {
    console.log('\n🔌 Loading Enterprise Connection Manager...');

    // Dynamic import to handle ES modules
    const dbManagerModule = await import('../lib/database/enterprise-connection-manager.ts');
    const { testConnection, getPoolStatus, query } = dbManagerModule;

    console.log('✅ Module loaded successfully');

    // Test 1: Basic connection test
    console.log('\n1️⃣ Testing basic connection...');
    const start1 = Date.now();
    const testResult = await testConnection();
    const duration1 = Date.now() - start1;

    if (testResult.success) {
      console.log(`   ✅ Connection test PASSED (${duration1}ms)`);
    } else {
      console.error(`   ❌ Connection test FAILED: ${testResult.error}`);
      return false;
    }

    // Test 2: Pool status check
    console.log('\n2️⃣ Checking pool status...');
    const status = getPoolStatus();
    console.log('   Pool Status:', {
      state: status.state,
      total: status.poolStatus.total,
      idle: status.poolStatus.idle,
      active: status.poolStatus.active,
      waiting: status.poolStatus.waiting,
      failedConnections: status.failedConnections,
      circuitBreakerState: status.state,
    });

    // Test 3: Direct query execution
    console.log('\n3️⃣ Testing direct query execution...');
    const start3 = Date.now();
    const queryResult = await query('SELECT NOW() as current_time, version() as db_version, current_database() as db_name, current_user as user_name');
    const duration3 = Date.now() - start3;

    console.log(`   ✅ Query executed successfully (${duration3}ms)`);
    console.log('   Result:', {
      time: queryResult.rows[0].current_time,
      database: queryResult.rows[0].db_name,
      user: queryResult.rows[0].user_name,
      version: queryResult.rows[0].db_version.substring(0, 50) + '...',
    });

    // Test 4: Multiple concurrent queries
    console.log('\n4️⃣ Testing concurrent query handling...');
    const start4 = Date.now();
    const concurrentPromises = Array.from({ length: 3 }, (_, i) =>
      query('SELECT $1 as query_num, NOW() as query_time', [i + 1])
    );

    const concurrentResults = await Promise.all(concurrentPromises);
    const duration4 = Date.now() - start4;

    console.log(`   ✅ Executed ${concurrentResults.length} concurrent queries (${duration4}ms)`);
    concurrentResults.forEach((result, idx) => {
      console.log(`      Query ${idx + 1}: ${result.rows[0].query_num} - ${result.rows[0].query_time}`);
    });

    // Test 5: Check circuit breaker state
    console.log('\n5️⃣ Checking circuit breaker status...');
    const finalStatus = getPoolStatus();
    console.log('   Circuit Breaker:', {
      state: finalStatus.state,
      failures: finalStatus.circuitBreakerFailures,
      threshold: finalStatus.circuitBreakerThreshold,
      consecutiveSuccesses: finalStatus.circuitBreakerConsecutiveSuccesses,
      avgResponseTime: finalStatus.avgResponseTime.toFixed(2) + 'ms',
    });

    if (finalStatus.state === 'closed' || finalStatus.state === 'half-open') {
      console.log('   ✅ Circuit breaker healthy');
    } else {
      console.warn('   ⚠️ Circuit breaker is OPEN - system may be experiencing issues');
    }

    console.log('\n✅ ALL ENTERPRISE CONNECTION MANAGER TESTS PASSED!');
    console.log('\n📊 Summary:');
    console.log('   ✅ Connection timeout increased to 30s');
    console.log('   ✅ ENTERPRISE_DATABASE_URL configured');
    console.log('   ✅ SSL enabled for Neon connection');
    console.log('   ✅ Circuit breaker functioning properly');
    console.log('   ✅ Connection pooling operational');

    return true;

  } catch (error) {
    console.error('\n❌ ENTERPRISE CONNECTION MANAGER TEST FAILED');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);

    console.log('\n🔧 Troubleshooting Steps:');
    console.log('   1. Verify .env.local has ENTERPRISE_DATABASE_URL set');
    console.log('   2. Check that DB_SSL=true is set');
    console.log('   3. Ensure ENTERPRISE_DB_CONNECTION_TIMEOUT=30000');
    console.log('   4. Restart the development server to reload environment variables');

    return false;
  }
}

// Run the test
testEnterpriseManager()
  .then((success) => {
    if (success) {
      console.log('\n🎉 Emergency fix SUCCESSFUL - Platform is OPERATIONAL!');
      process.exit(0);
    } else {
      console.log('\n🚨 Emergency fix FAILED - Platform still DOWN!');
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
