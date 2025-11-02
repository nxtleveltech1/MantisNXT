/**
 * Quick validation script to test the WooCommerce sync endpoint fix
 * Tests that the endpoint properly handles empty/malformed bodies
 */

const testCases = [
  {
    name: 'Empty body',
    options: {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    expectedStatus: 400,
    expectedError: 'Invalid JSON',
  },
  {
    name: 'Malformed JSON',
    options: {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{invalid json',
    },
    expectedStatus: 400,
    expectedError: 'Invalid JSON',
  },
  {
    name: 'Missing config',
    options: {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        org_id: 'test-org',
      }),
    },
    expectedStatus: 400,
    expectedError: 'configuration is required',
  },
  {
    name: 'Missing org_id',
    options: {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        config: {
          url: 'https://example.com',
          consumerKey: 'ck_test',
          consumerSecret: 'cs_test',
        },
      }),
    },
    expectedStatus: 400,
    expectedError: 'org_id is required',
  },
  {
    name: 'Valid structure (will fail on connection)',
    options: {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        config: {
          url: 'https://example.com',
          consumerKey: 'ck_test',
          consumerSecret: 'cs_test',
        },
        org_id: 'test-org',
        options: {
          limit: 10,
        },
      }),
    },
    expectedStatus: 500, // Should fail on connection, not validation
    expectedError: 'connect',
  },
];

async function runTests() {
  const endpoint = 'http://localhost:3000/api/v1/integrations/woocommerce/sync/customers';

  console.log('🧪 Testing WooCommerce Customer Sync Endpoint\n');
  console.log('Endpoint:', endpoint, '\n');

  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    process.stdout.write(`Testing: ${testCase.name}... `);

    try {
      const response = await fetch(endpoint, testCase.options);
      const data = await response.json();

      const statusMatch = response.status === testCase.expectedStatus;
      const errorMatch = data.error && data.error.toLowerCase().includes(testCase.expectedError.toLowerCase());

      if (statusMatch && errorMatch) {
        console.log('✅ PASS');
        passed++;
      } else {
        console.log('❌ FAIL');
        console.log(`  Expected status: ${testCase.expectedStatus}, got: ${response.status}`);
        console.log(`  Expected error containing: "${testCase.expectedError}", got: "${data.error}"`);
        failed++;
      }
    } catch (error) {
      console.log('❌ ERROR');
      console.log(`  ${error.message}`);
      failed++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(50));

  if (failed === 0) {
    console.log('\n🎉 All tests passed! The fix is working correctly.');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Please review the errors above.');
    process.exit(1);
  }
}

// Check if server is running
fetch('http://localhost:3000/api/v1/integrations/woocommerce')
  .then(() => {
    console.log('✓ Development server is running\n');
    return runTests();
  })
  .catch((error) => {
    console.error('❌ Development server is not running at http://localhost:3000');
    console.error('   Please start the server with: npm run dev:raw');
    console.error('\n   Error:', error.message);
    process.exit(1);
  });
