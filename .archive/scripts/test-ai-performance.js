#!/usr/bin/env node

/**
 * AI SDK v5 - Performance Testing Script
 * Measures response time, throughput, and resource usage
 */

const http = require('http');
const { performance } = require('perf_hooks');

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const CONCURRENT_REQUESTS = 10;
const TEST_DURATION_MS = 30000;

// Test configurations
const ENDPOINTS = [
  {
    name: 'Chat API',
    path: '/api/ai/chat',
    method: 'POST',
    body: {
      messages: [{ role: 'user', content: 'Test message' }]
    }
  },
  {
    name: 'Generate API',
    path: '/api/ai/generate',
    method: 'POST',
    body: {
      prompt: 'Test prompt',
      mode: 'concise'
    }
  },
  {
    name: 'Analyze API',
    path: '/api/ai/analyze',
    method: 'POST',
    body: {
      data: { test: 'data' },
      context: 'testing'
    }
  }
];

// Results storage
const results = {
  timestamp: new Date().toISOString(),
  endpoints: {},
  summary: {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    medianResponseTime: 0,
    p95ResponseTime: 0,
    p99ResponseTime: 0,
    throughput: 0,
    errorRate: 0
  }
};

/**
 * Make HTTP request and measure performance
 */
async function makeRequest(endpoint) {
  const startTime = performance.now();

  return new Promise((resolve) => {
    const url = new URL(endpoint.path, BASE_URL);
    const options = {
      method: endpoint.method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(url, options, (res) => {
      let data = '';

      res.on('data', chunk => {
        data += chunk;
      });

      res.on('end', () => {
        const endTime = performance.now();
        const duration = endTime - startTime;

        resolve({
          success: res.statusCode >= 200 && res.statusCode < 300,
          statusCode: res.statusCode,
          duration,
          responseSize: data.length,
          error: null
        });
      });
    });

    req.on('error', (error) => {
      const endTime = performance.now();
      const duration = endTime - startTime;

      resolve({
        success: false,
        statusCode: null,
        duration,
        responseSize: 0,
        error: error.message
      });
    });

    if (endpoint.body) {
      req.write(JSON.stringify(endpoint.body));
    }

    req.end();
  });
}

/**
 * Run concurrent requests
 */
async function runConcurrentTest(endpoint, numRequests) {
  console.log(`\n  Testing ${endpoint.name} with ${numRequests} concurrent requests...`);

  const requests = Array(numRequests).fill(null).map(() => makeRequest(endpoint));
  const responses = await Promise.all(requests);

  const successful = responses.filter(r => r.success).length;
  const failed = responses.filter(r => !r.success).length;
  const durations = responses.map(r => r.duration);

  durations.sort((a, b) => a - b);

  const avg = durations.reduce((sum, d) => sum + d, 0) / durations.length;
  const median = durations[Math.floor(durations.length / 2)];
  const p95 = durations[Math.floor(durations.length * 0.95)];
  const p99 = durations[Math.floor(durations.length * 0.99)];
  const min = Math.min(...durations);
  const max = Math.max(...durations);

  return {
    totalRequests: numRequests,
    successful,
    failed,
    errorRate: (failed / numRequests) * 100,
    durations: {
      min,
      max,
      average: avg,
      median,
      p95,
      p99
    },
    responseSizes: responses.map(r => r.responseSize)
  };
}

/**
 * Run throughput test
 */
async function runThroughputTest(endpoint, durationMs) {
  console.log(`\n  Testing ${endpoint.name} throughput for ${durationMs / 1000}s...`);

  const startTime = Date.now();
  let requestCount = 0;
  const responses = [];

  while (Date.now() - startTime < durationMs) {
    const response = await makeRequest(endpoint);
    responses.push(response);
    requestCount++;

    // Small delay to prevent overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  const actualDuration = Date.now() - startTime;
  const throughput = (requestCount / actualDuration) * 1000; // requests per second

  const successful = responses.filter(r => r.success).length;
  const failed = responses.filter(r => !r.success).length;

  return {
    totalRequests: requestCount,
    successful,
    failed,
    duration: actualDuration,
    throughput: throughput.toFixed(2),
    errorRate: ((failed / requestCount) * 100).toFixed(2)
  };
}

/**
 * Run streaming performance test
 */
async function testStreamingPerformance() {
  console.log('\n  Testing streaming performance...');

  const startTime = performance.now();
  let firstChunkTime = null;
  let lastChunkTime = null;
  let chunkCount = 0;

  // This would need actual streaming implementation
  // Placeholder for now
  return {
    firstTokenLatency: 0,
    tokensPerSecond: 0,
    totalChunks: 0,
    success: false,
    note: 'Streaming test requires live implementation'
  };
}

/**
 * Main test execution
 */
async function runTests() {
  console.log('🚀 AI SDK v5 - Performance Testing Suite');
  console.log('='.repeat(50));
  console.log(`Target: ${BASE_URL}`);
  console.log(`Concurrent Requests: ${CONCURRENT_REQUESTS}`);
  console.log('');

  // Check if server is accessible
  console.log('Checking server availability...');
  try {
    await makeRequest({ path: '/api/health', method: 'GET' });
    console.log('✅ Server is accessible');
  } catch (error) {
    console.error('❌ Server is not accessible:', error.message);
    process.exit(1);
  }

  // Test each endpoint
  for (const endpoint of ENDPOINTS) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`Testing: ${endpoint.name}`);
    console.log('='.repeat(50));

    // Concurrent test
    const concurrentResults = await runConcurrentTest(endpoint, CONCURRENT_REQUESTS);
    results.endpoints[endpoint.name] = {
      concurrent: concurrentResults
    };

    console.log(`  ✅ Success Rate: ${((concurrentResults.successful / concurrentResults.totalRequests) * 100).toFixed(1)}%`);
    console.log(`  ⏱️  Average Response Time: ${concurrentResults.durations.average.toFixed(2)}ms`);
    console.log(`  📊 Median Response Time: ${concurrentResults.durations.median.toFixed(2)}ms`);
    console.log(`  📈 P95 Response Time: ${concurrentResults.durations.p95.toFixed(2)}ms`);
    console.log(`  🔝 P99 Response Time: ${concurrentResults.durations.p99.toFixed(2)}ms`);

    // Update summary
    results.summary.totalRequests += concurrentResults.totalRequests;
    results.summary.successfulRequests += concurrentResults.successful;
    results.summary.failedRequests += concurrentResults.failed;
  }

  // Streaming test
  console.log(`\n${'='.repeat(50)}`);
  console.log('Testing: Streaming Performance');
  console.log('='.repeat(50));
  const streamingResults = await testStreamingPerformance();
  results.streaming = streamingResults;

  // Calculate overall summary
  results.summary.errorRate =
    ((results.summary.failedRequests / results.summary.totalRequests) * 100).toFixed(2);

  // Display summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Performance Summary');
  console.log('='.repeat(50));
  console.log(`Total Requests: ${results.summary.totalRequests}`);
  console.log(`Successful: ${results.summary.successfulRequests}`);
  console.log(`Failed: ${results.summary.failedRequests}`);
  console.log(`Error Rate: ${results.summary.errorRate}%`);

  // Performance targets
  console.log('\n📋 Performance Targets:');

  const avgResponseTime = Object.values(results.endpoints)
    .reduce((sum, e) => sum + e.concurrent.durations.average, 0) /
    Object.keys(results.endpoints).length;

  const meetsTargets = {
    responseTime: avgResponseTime < 3000,
    errorRate: parseFloat(results.summary.errorRate) < 1,
    availability: results.summary.successfulRequests > 0
  };

  console.log(`  Response Time (< 3s): ${meetsTargets.responseTime ? '✅' : '❌'} ${avgResponseTime.toFixed(0)}ms`);
  console.log(`  Error Rate (< 1%): ${meetsTargets.errorRate ? '✅' : '❌'} ${results.summary.errorRate}%`);
  console.log(`  Availability: ${meetsTargets.availability ? '✅' : '❌'}`);

  // Save results
  const fs = require('fs');
  const outputPath = 'test-results/ai-performance-results.json';

  try {
    const dir = 'test-results';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
    console.log(`\n💾 Results saved to: ${outputPath}`);
  } catch (error) {
    console.error('Failed to save results:', error.message);
  }

  // Exit with appropriate code
  const allTargetsMet = Object.values(meetsTargets).every(v => v === true);
  if (allTargetsMet) {
    console.log('\n✅ All performance targets met!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some performance targets not met.');
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('\n❌ Test execution failed:', error);
  process.exit(1);
});
