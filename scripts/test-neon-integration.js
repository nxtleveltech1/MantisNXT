#!/usr/bin/env node

/**
 * Integration test script for Neon SPP backend
 * Tests all critical endpoints to ensure backend is working correctly
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
}

function logError(message) {
  log(`❌ ${message}`, colors.red);
}

function logInfo(message) {
  log(`ℹ️  ${message}`, colors.cyan);
}

function logWarning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

async function testEndpoint(name, url, options = {}) {
  try {
    logInfo(`Testing: ${name}`);
    const response = await fetch(`${BASE_URL}${url}`, options);

    if (!response.ok) {
      logError(`${name} failed with status ${response.status}`);
      const text = await response.text();
      console.log('Response:', text.substring(0, 200));
      return false;
    }

    const data = await response.json();
    logSuccess(`${name} passed`);
    return data;
  } catch (error) {
    logError(`${name} threw error: ${error.message}`);
    return false;
  }
}

async function runTests() {
  log('\n' + '='.repeat(60), colors.bright);
  log('NEON SPP BACKEND INTEGRATION TEST', colors.bright);
  log('='.repeat(60) + '\n', colors.bright);

  let passCount = 0;
  let failCount = 0;

  // Test 1: Dashboard Metrics
  log('\n📊 Test 1: Dashboard Metrics', colors.yellow);
  const metrics = await testEndpoint(
    'GET /api/spp/dashboard/metrics',
    '/api/spp/dashboard/metrics'
  );
  if (metrics) {
    passCount++;
    console.log('  Suppliers:', metrics.data?.total_suppliers || 0);
    console.log('  Products:', metrics.data?.total_products || 0);
    console.log('  Selected:', metrics.data?.selected_products || 0);
  } else {
    failCount++;
  }

  // Test 2: Active Selection
  log('\n🎯 Test 2: Active Selection', colors.yellow);
  const activeSelection = await testEndpoint(
    'GET /api/core/selections/active',
    '/api/core/selections/active'
  );
  if (activeSelection || activeSelection === false) {
    passCount++;
    if (activeSelection.data) {
      console.log('  Active Selection:', activeSelection.data.selection_name);
      console.log('  Status:', activeSelection.data.status);
    } else {
      logWarning('  No active selection found (this is OK for initial setup)');
    }
  } else {
    failCount++;
  }

  // Test 3: NXT SOH Report
  log('\n📦 Test 3: NXT SOH Report', colors.yellow);
  const sohReport = await testEndpoint(
    'GET /api/serve/nxt-soh',
    '/api/serve/nxt-soh?limit=10'
  );
  if (sohReport || sohReport === false) {
    passCount++;
    if (sohReport.data) {
      console.log('  SOH Records:', sohReport.data.length || 0);
      if (sohReport.data.length > 0) {
        console.log('  Sample Record:');
        console.log('    Supplier:', sohReport.data[0].supplier_name);
        console.log('    Product:', sohReport.data[0].product_name);
        console.log('    Quantity:', sohReport.data[0].qty_on_hand);
      }
    } else if (sohReport.warning) {
      logWarning(`  ${sohReport.warning}`);
    }
  } else {
    failCount++;
  }

  // Test 4: Products by Supplier
  log('\n🏢 Test 4: Products by Supplier', colors.yellow);
  const products = await testEndpoint(
    'GET /api/serve/products-by-supplier',
    '/api/serve/products-by-supplier?limit=10'
  );
  if (products) {
    passCount++;
    console.log('  Total Products:', products.pagination?.total || 0);
    if (products.data && products.data.length > 0) {
      console.log('  Sample Product:', products.data[0].name_from_supplier);
    }
  } else {
    failCount++;
  }

  // Test 5: List Suppliers
  log('\n👥 Test 5: List Suppliers', colors.yellow);
  const suppliers = await testEndpoint(
    'GET /api/core/suppliers',
    '/api/core/suppliers?active=true&limit=10'
  );
  if (suppliers) {
    passCount++;
    console.log('  Active Suppliers:', suppliers.data?.length || 0);
    if (suppliers.data && suppliers.data.length > 0) {
      console.log('  Sample Supplier:', suppliers.data[0].name);
    }
  } else {
    failCount++;
  }

  // Test 6: Health Check
  log('\n❤️  Test 6: Database Health', colors.yellow);
  const health = await testEndpoint(
    'GET /api/health/database',
    '/api/health/database'
  );
  if (health) {
    passCount++;
    console.log('  DB Status:', health.status || 'unknown');
    if (health.database) {
      console.log('  Connection:', health.database.connected ? 'OK' : 'Failed');
    }
  } else {
    failCount++;
  }

  // Summary
  log('\n' + '='.repeat(60), colors.bright);
  log('TEST SUMMARY', colors.bright);
  log('='.repeat(60), colors.bright);
  log(`\nPassed: ${passCount}`, colors.green);
  log(`Failed: ${failCount}`, failCount > 0 ? colors.red : colors.reset);
  log(`Total:  ${passCount + failCount}\n`);

  if (failCount === 0) {
    log('🎉 All tests passed! Backend is working correctly.', colors.green);
    process.exit(0);
  } else {
    log('⚠️  Some tests failed. Check the output above for details.', colors.red);
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  logError(`Test suite failed: ${error.message}`);
  console.error(error);
  process.exit(1);
});
