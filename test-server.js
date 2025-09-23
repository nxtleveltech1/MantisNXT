/**
 * Simple API Server Test
 * Start server and test endpoints
 */

const { spawn } = require('child_process');
const http = require('http');

let serverProcess = null;

// Start Next.js development server
function startServer() {
  return new Promise((resolve, reject) => {
    console.log('🚀 Starting Next.js development server...');

    serverProcess = spawn('npm', ['run', 'dev'], {
      cwd: __dirname,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true
    });

    let serverReady = false;

    serverProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(output);

      // Check if server is ready
      if (output.includes('Local:') || output.includes('localhost:3000')) {
        if (!serverReady) {
          serverReady = true;
          setTimeout(resolve, 2000); // Wait 2 seconds for server to fully start
        }
      }
    });

    serverProcess.stderr.on('data', (data) => {
      const error = data.toString();
      console.error('Server error:', error);

      // Don't reject on compilation warnings/errors, let it continue
      if (error.includes('Failed to compile') || error.includes('Module not found')) {
        console.log('⚠️ Frontend compilation issues detected, but API endpoints should work');
      }
    });

    serverProcess.on('close', (code) => {
      console.log(`Server process exited with code ${code}`);
      if (!serverReady && code !== 0) {
        reject(new Error(`Server failed to start with code ${code}`));
      }
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      if (!serverReady) {
        reject(new Error('Server startup timeout'));
      }
    }, 30000);
  });
}

// Test API endpoint
function testAPI(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: `/api${path}`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve({
            status: res.statusCode,
            data: result
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            data: data
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

// Main test function
async function runAPITests() {
  console.log('🧪 Starting API Tests...\n');

  const tests = [
    '/test/live',
    '/health/database',
    '/suppliers'
  ];

  for (const path of tests) {
    try {
      console.log(`📋 Testing: ${path}`);
      const result = await testAPI(path);

      console.log(`   Status: ${result.status}`);

      if (result.data && typeof result.data === 'object') {
        if (result.data.success !== undefined) {
          console.log(`   Success: ${result.data.success}`);
        }
        if (result.data.healthScore !== undefined) {
          console.log(`   Health Score: ${result.data.healthScore}%`);
        }
        if (result.data.summary) {
          console.log(`   Tests: ${result.data.summary.passed}/${result.data.summary.total} passed`);
        }
      }

      console.log(`   ✅ Endpoint accessible\n`);
    } catch (error) {
      console.log(`   ❌ Test failed: ${error.message}\n`);
    }
  }
}

// Cleanup function
function cleanup() {
  if (serverProcess) {
    console.log('\n🛑 Stopping server...');
    serverProcess.kill('SIGTERM');
    serverProcess = null;
  }
}

// Handle process termination
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);

// Main execution
async function main() {
  try {
    console.log('🔧 MantisNXT Backend API Test\n');

    // Start server
    await startServer();
    console.log('✅ Server started successfully\n');

    // Wait a bit for server to fully initialize
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Run tests
    await runAPITests();

    console.log('🎉 API testing completed!\n');
    console.log('📝 Server is running at: http://localhost:3000');
    console.log('🔗 Test endpoints:');
    console.log('   - http://localhost:3000/api/test/live');
    console.log('   - http://localhost:3000/api/health/database');
    console.log('   - http://localhost:3000/api/suppliers');
    console.log('\n💡 Press Ctrl+C to stop the server');

    // Keep server running
    await new Promise(() => {}); // Wait indefinitely

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    cleanup();
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}