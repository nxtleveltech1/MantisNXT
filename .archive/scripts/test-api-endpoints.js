/**
 * Test API Endpoints After Emergency Fix
 * Validates that all failing endpoints now work correctly
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';

async function testEndpoint(method, path, description) {
  return new Promise((resolve) => {
    const startTime = Date.now();

    console.log(`\n🔍 Testing: ${description}`);
    console.log(`   ${method} ${path}`);

    const options = {
      hostname: 'localhost',
      port: 3000,
      path,
      method,
      headers: {
        'Accept': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        const duration = Date.now() - startTime;
        const status = res.statusCode;

        let parsedData;
        try {
          parsedData = JSON.parse(data);
        } catch (e) {
          parsedData = data;
        }

        const result = {
          path,
          status,
          duration,
          success: status >= 200 && status < 300,
          dataType: typeof parsedData,
          dataLength: Array.isArray(parsedData) ? parsedData.length :
                      parsedData?.data?.length || parsedData?.items?.length || 0,
          error: !parsedData ? null : parsedData.error || parsedData.details || null
        };

        // Log result
        if (result.success) {
          console.log(`   ✅ ${status} - ${duration}ms - ${result.dataLength} items`);
        } else {
          console.log(`   ❌ ${status} - ${duration}ms - Error: ${result.error || 'Unknown'}`);
        }

        resolve(result);
      });
    });

    req.on('error', (error) => {
      console.log(`   ❌ Request failed: ${error.message}`);
      resolve({
        path,
        status: 0,
        duration: Date.now() - startTime,
        success: false,
        error: error.message
      });
    });

    req.setTimeout(10000, () => {
      req.destroy();
      console.log(`   ❌ Timeout after 10s`);
      resolve({
        path,
        status: 0,
        duration: 10000,
        success: false,
        error: 'Timeout'
      });
    });

    req.end();
  });
}

async function runTests() {
  console.log("🚀 Testing API Endpoints After Emergency Fix");
  console.log("=" .repeat(60));

  const tests = [
    ['GET', '/api/inventory?limit=10', 'Inventory list (basic)'],
    ['GET', '/api/inventory?limit=10&format=display', 'Inventory list (display format)'],
    ['GET', '/api/inventory?search=stage', 'Inventory search'],
    ['GET', '/api/inventory?status=in_stock', 'Inventory by status'],
    ['GET', '/api/suppliers?limit=10', 'Suppliers list'],
    ['GET', '/api/suppliers?status=active', 'Suppliers by status'],
    ['GET', '/api/suppliers?search=alpha', 'Suppliers search'],
    ['GET', '/api/analytics/dashboard', 'Analytics dashboard'],
  ];

  const results = [];

  for (const [method, path, description] of tests) {
    const result = await testEndpoint(method, path, description);
    results.push(result);

    // Wait a bit between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log("\n" + "=".repeat(60));
  console.log("📊 TEST SUMMARY");
  console.log("=".repeat(60));

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
  const totalItems = results.reduce((sum, r) => sum + (r.dataLength || 0), 0);

  console.log(`\n✅ Successful: ${successful}/${results.length}`);
  console.log(`❌ Failed: ${failed}/${results.length}`);
  console.log(`⏱️  Average duration: ${avgDuration.toFixed(0)}ms`);
  console.log(`📦 Total items retrieved: ${totalItems}`);

  if (failed > 0) {
    console.log("\n❌ Failed endpoints:");
    results.filter(r => !r.success).forEach(r => {
      console.log(`   - ${r.path}: ${r.error || `Status ${r.status}`}`);
    });
  }

  console.log("\n" + "=".repeat(60));

  if (successful === results.length) {
    console.log("🎉 ALL TESTS PASSED! API endpoints restored successfully.");
    process.exit(0);
  } else {
    console.log("⚠️  Some tests failed. Review errors above.");
    process.exit(1);
  }
}

// Check if server is running
console.log("Checking if Next.js dev server is running...");
const checkServer = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/',
  method: 'HEAD'
}, (res) => {
  console.log("✅ Server is running\n");
  runTests();
});

checkServer.on('error', (error) => {
  console.error("❌ Server is not running!");
  console.error("Please start the dev server first: npm run dev");
  process.exit(1);
});

checkServer.end();
