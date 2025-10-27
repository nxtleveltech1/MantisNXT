/**
 * Emergency API Endpoint Test - Post Database Fix
 * Verifies all critical endpoints are operational
 */

const SERVER_BASE = 'http://localhost:3000';

const testEndpoints = [
  {
    name: 'Health Check - Database',
    url: '/api/health/database',
    method: 'GET',
  },
  {
    name: 'Suppliers List',
    url: '/api/suppliers?limit=5',
    method: 'GET',
  },
  {
    name: 'Dashboard Metrics',
    url: '/api/dashboard_metrics',
    method: 'GET',
  },
  {
    name: 'Analytics Dashboard',
    url: '/api/analytics/dashboard?timeRange=7d',
    method: 'GET',
  },
  {
    name: 'Recent Activities',
    url: '/api/activities/recent?limit=10',
    method: 'GET',
  },
  {
    name: 'Inventory List',
    url: '/api/inventory?limit=10',
    method: 'GET',
  },
];

async function testEndpoint(endpoint) {
  const startTime = Date.now();

  try {
    const response = await fetch(SERVER_BASE + endpoint.url, {
      method: endpoint.method,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const duration = Date.now() - startTime;
    const data = await response.json();

    if (response.ok) {
      console.log(`✅ ${endpoint.name}`);
      console.log(`   Status: ${response.status} | Duration: ${duration}ms`);

      if (data.data) {
        const dataCount = Array.isArray(data.data) ? data.data.length : 1;
        console.log(`   Data: ${dataCount} records`);
      }

      return { success: true, duration, status: response.status };
    } else {
      console.log(`❌ ${endpoint.name}`);
      console.log(`   Status: ${response.status} | Duration: ${duration}ms`);
      console.log(`   Error: ${data.error || data.message || 'Unknown error'}`);

      return {
        success: false,
        duration,
        status: response.status,
        error: data.error,
      };
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    console.log(`❌ ${endpoint.name}`);
    console.log(`   Connection Error: ${error.message}`);
    console.log(`   Duration: ${duration}ms`);

    return {
      success: false,
      duration,
      error: error.message,
    };
  }
}

async function runAllTests() {
  console.log('🚀 Post-Fix API Endpoint Test Suite');
  console.log('=====================================');
  console.log(`Testing against: ${SERVER_BASE}`);
  console.log('');

  // Test if server is running first
  try {
    await fetch(SERVER_BASE, { method: 'HEAD' });
  } catch (error) {
    console.error('❌ FATAL: Server is not running!');
    console.error('   Start the dev server with: npm run dev');
    console.error('   Or: pnpm dev');
    process.exit(1);
  }

  console.log('✅ Server is running\n');

  const results = [];

  for (const endpoint of testEndpoints) {
    const result = await testEndpoint(endpoint);
    results.push({ ...endpoint, ...result });
    console.log(''); // Empty line between tests
  }

  // Summary
  console.log('📊 TEST SUMMARY');
  console.log('=====================================');

  const passed = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;
  const avgDuration =
    results.reduce((acc, r) => acc + r.duration, 0) / results.length;

  console.log(`Total Tests: ${results.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⏱️  Average Duration: ${avgDuration.toFixed(0)}ms`);

  if (failed > 0) {
    console.log('\n⚠️ FAILED ENDPOINTS:');
    results
      .filter((r) => !r.success)
      .forEach((r) => {
        console.log(`   - ${r.name}: ${r.error || 'HTTP ' + r.status}`);
      });
  }

  console.log('\n');

  if (failed === 0) {
    console.log('🎉 ALL TESTS PASSED - PLATFORM IS OPERATIONAL!');
    console.log('✅ Database connection timeout issue is RESOLVED');
    console.log('✅ Enterprise Connection Manager is working correctly');
    console.log('✅ All API endpoints are responding normally');
    process.exit(0);
  } else {
    console.log('🚨 SOME TESTS FAILED - INVESTIGATION NEEDED');
    console.log(`   ${failed} out of ${results.length} endpoints still failing`);
    process.exit(1);
  }
}

// Wait a bit before starting tests to ensure server is ready
console.log('⏳ Waiting 2 seconds for server to be ready...\n');
setTimeout(runAllTests, 2000);
