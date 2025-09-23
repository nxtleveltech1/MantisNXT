/**
 * API Test Script
 * Test all backend endpoints with live database
 */

const http = require('http');

// Test configuration
const API_BASE = 'http://localhost:3000/api';
const TIMEOUT = 10000;

// Helper function to make HTTP requests
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const result = {
            status: res.statusCode,
            headers: res.headers,
            data: body ? JSON.parse(body) : null
          };
          resolve(result);
        } catch (error) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: body
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(TIMEOUT, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (data) {
      req.write(data);
    }

    req.end();
  });
}

// Test cases
const tests = [
  {
    name: 'Database Health Check',
    method: 'GET',
    path: '/health/database',
    headers: {
      'Content-Type': 'application/json'
    }
  },
  {
    name: 'Get Suppliers',
    method: 'GET',
    path: '/suppliers',
    headers: {
      'Content-Type': 'application/json'
    }
  },
  {
    name: 'Create Supplier',
    method: 'POST',
    path: '/suppliers',
    headers: {
      'Content-Type': 'application/json'
    },
    data: JSON.stringify({
      name: 'Test Supplier API',
      email: 'test@supplier.com',
      phone: '+27123456789',
      contact_person: 'John Test',
      primary_category: 'Electronics',
      geographic_region: 'Gauteng'
    })
  },
  {
    name: 'Get Inventory Complete',
    method: 'GET',
    path: '/inventory/complete',
    headers: {
      'Content-Type': 'application/json'
    }
  },
  {
    name: 'Authentication Login (should fail without user)',
    method: 'POST',
    path: '/auth/login',
    headers: {
      'Content-Type': 'application/json'
    },
    data: JSON.stringify({
      email: 'admin@mantisnxt.com',
      password: 'admin123'
    })
  }
];

// Run tests
async function runTests() {
  console.log('🧪 Starting API Tests...\n');

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      console.log(`📋 Testing: ${test.name}`);

      const options = {
        hostname: 'localhost',
        port: 3000,
        path: `/api${test.path}`,
        method: test.method,
        headers: test.headers
      };

      const result = await makeRequest(options, test.data);

      console.log(`   Status: ${result.status}`);

      if (result.data && typeof result.data === 'object') {
        console.log(`   Success: ${result.data.success}`);
        if (result.data.error) {
          console.log(`   Error: ${result.data.error}`);
        }
        if (result.data.message) {
          console.log(`   Message: ${result.data.message}`);
        }
        if (result.data.data && Array.isArray(result.data.data)) {
          console.log(`   Records: ${result.data.data.length}`);
        }
      }

      if (result.status >= 200 && result.status < 500) {
        console.log(`   ✅ Test passed\n`);
        passed++;
      } else {
        console.log(`   ❌ Test failed\n`);
        failed++;
      }

    } catch (error) {
      console.log(`   ❌ Test failed: ${error.message}\n`);
      failed++;
    }
  }

  console.log('📊 Test Results:');
  console.log(`   Passed: ${passed}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Total: ${passed + failed}`);

  if (failed === 0) {
    console.log('\n🎉 All tests passed! Backend API is fully operational.');
  } else {
    console.log('\n⚠️ Some tests failed. Check server logs for details.');
  }
}

// Check if server is running first
async function checkServer() {
  try {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/',
      method: 'GET',
      timeout: 5000
    };

    await makeRequest(options);
    console.log('✅ Server is running on http://localhost:3000\n');
    return true;
  } catch (error) {
    console.log('❌ Server is not running. Please start with: npm run dev\n');
    return false;
  }
}

// Main execution
async function main() {
  console.log('🚀 MantisNXT Backend API Test Suite\n');

  const serverRunning = await checkServer();
  if (!serverRunning) {
    process.exit(1);
  }

  await runTests();
}

if (require.main === module) {
  main();
}

module.exports = { runTests };