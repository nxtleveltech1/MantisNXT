/**
 * ITERATION 2 - ADR-1: Cache Performance Benchmark Script
 *
 * Benchmarks Phase 1 cache implementation against baseline.
 * Measures response times before and after caching.
 *
 * Usage:
 *   node scripts/cache-performance-benchmark.js
 *   node scripts/cache-performance-benchmark.js --endpoint=dashboard
 *   node scripts/cache-performance-benchmark.js --iterations=100
 */

const http = require('http');

// Configuration
const CONFIG = {
  baseUrl: 'http://localhost:3000',
  endpoints: {
    dashboardMetrics: '/api/dashboard_metrics',
    inventoryList: '/api/inventory/complete',
    analyticsOverview: '/api/analytics/dashboard',
  },
  iterations: 50, // Number of requests per endpoint
  warmupRequests: 5, // Warmup requests (not counted in stats)
  delayBetweenRequests: 100, // ms delay between requests
};

// Parse command line arguments
const args = process.argv.slice(2).reduce((acc, arg) => {
  const [key, value] = arg.replace(/^--/, '').split('=');
  acc[key] = value || true;
  return acc;
}, {});

// Override config from CLI args
if (args.endpoint) {
  const endpoint = CONFIG.endpoints[args.endpoint];
  if (endpoint) {
    CONFIG.endpoints = { [args.endpoint]: endpoint };
  } else {
    console.error(`❌ Unknown endpoint: ${args.endpoint}`);
    process.exit(1);
  }
}

if (args.iterations) {
  CONFIG.iterations = parseInt(args.iterations, 10);
}

/**
 * Make HTTP request and measure response time
 */
function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const urlObj = new URL(url);

    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 3000,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        const duration = Date.now() - startTime;

        try {
          const parsed = JSON.parse(data);
          resolve({
            duration,
            statusCode: res.statusCode,
            data: parsed,
            success: res.statusCode === 200,
          });
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.setTimeout(30000); // 30 second timeout
    req.end();
  });
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate statistics from response times
 */
function calculateStats(times) {
  if (times.length === 0) {
    return {
      min: 0,
      max: 0,
      avg: 0,
      median: 0,
      p95: 0,
      p99: 0,
      stdDev: 0,
    };
  }

  const sorted = [...times].sort((a, b) => a - b);
  const sum = times.reduce((a, b) => a + b, 0);
  const avg = sum / times.length;

  // Standard deviation
  const squareDiffs = times.map((value) => Math.pow(value - avg, 2));
  const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / times.length;
  const stdDev = Math.sqrt(avgSquareDiff);

  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    avg: avg,
    median: sorted[Math.floor(sorted.length / 2)],
    p95: sorted[Math.floor(sorted.length * 0.95)],
    p99: sorted[Math.floor(sorted.length * 0.99)],
    stdDev: stdDev,
  };
}

/**
 * Benchmark a single endpoint
 */
async function benchmarkEndpoint(name, url) {
  console.log(`\n📊 Benchmarking: ${name}`);
  console.log(`   URL: ${url}`);
  console.log(`   Iterations: ${CONFIG.iterations}`);
  console.log(`   Warmup: ${CONFIG.warmupRequests} requests\n`);

  const results = {
    name,
    url,
    coldStart: [],
    warmed: [],
    errors: 0,
  };

  // Warmup requests
  console.log('🔥 Warming up cache...');
  for (let i = 0; i < CONFIG.warmupRequests; i++) {
    try {
      const result = await makeRequest(url);
      results.coldStart.push(result.duration);
      process.stdout.write('.');
    } catch (error) {
      console.error(`\n❌ Warmup request ${i + 1} failed:`, error.message);
      results.errors++;
    }
    await sleep(CONFIG.delayBetweenRequests);
  }

  console.log('\n\n📈 Running benchmark...');

  // Main benchmark requests
  for (let i = 0; i < CONFIG.iterations; i++) {
    try {
      const result = await makeRequest(url);
      results.warmed.push(result.duration);

      if ((i + 1) % 10 === 0) {
        process.stdout.write(`\n   Completed: ${i + 1}/${CONFIG.iterations} `);
      } else {
        process.stdout.write('.');
      }
    } catch (error) {
      console.error(`\n❌ Request ${i + 1} failed:`, error.message);
      results.errors++;
    }
    await sleep(CONFIG.delayBetweenRequests);
  }

  console.log('\n');
  return results;
}

/**
 * Format stats for display
 */
function formatStats(stats) {
  return {
    'Min': `${stats.min.toFixed(0)}ms`,
    'Max': `${stats.max.toFixed(0)}ms`,
    'Avg': `${stats.avg.toFixed(0)}ms`,
    'Median': `${stats.median.toFixed(0)}ms`,
    'P95': `${stats.p95.toFixed(0)}ms`,
    'P99': `${stats.p99.toFixed(0)}ms`,
    'Std Dev': `${stats.stdDev.toFixed(0)}ms`,
  };
}

/**
 * Display benchmark results
 */
function displayResults(results) {
  console.log('\n' + '='.repeat(80));
  console.log(`BENCHMARK RESULTS: ${results.name}`);
  console.log('='.repeat(80));

  const coldStats = calculateStats(results.coldStart);
  const warmedStats = calculateStats(results.warmed);

  console.log('\n🥶 Cold Start (First 5 requests):');
  console.table(formatStats(coldStats));

  console.log('\n🔥 Warmed Cache (After warmup):');
  console.table(formatStats(warmedStats));

  // Calculate improvement
  const improvement = ((coldStats.avg - warmedStats.avg) / coldStats.avg) * 100;
  const improvementFactor = coldStats.avg / warmedStats.avg;

  console.log('\n📊 Performance Improvement:');
  console.log(`   Avg Response Time Reduction: ${improvement.toFixed(1)}%`);
  console.log(`   Speed Improvement: ${improvementFactor.toFixed(2)}x faster`);
  console.log(`   Cold Start Avg: ${coldStats.avg.toFixed(0)}ms`);
  console.log(`   Cached Avg: ${warmedStats.avg.toFixed(0)}ms`);
  console.log(`   Time Saved: ${(coldStats.avg - warmedStats.avg).toFixed(0)}ms per request`);

  // Check if target met (70-90% reduction)
  const targetMet = improvement >= 70 && improvement <= 90;
  console.log(`\n🎯 Target (70-90% reduction): ${targetMet ? '✅ MET' : '⚠️  NOT MET'}`);

  if (results.errors > 0) {
    console.log(`\n⚠️  Errors encountered: ${results.errors}`);
  }

  console.log('\n' + '='.repeat(80) + '\n');

  return {
    endpoint: results.name,
    coldAvg: coldStats.avg,
    warmedAvg: warmedStats.avg,
    improvement: improvement,
    improvementFactor: improvementFactor,
    targetMet: targetMet,
    errors: results.errors,
  };
}

/**
 * Main benchmark runner
 */
async function runBenchmarks() {
  console.log('\n🚀 Starting Cache Performance Benchmark');
  console.log(`   Base URL: ${CONFIG.baseUrl}`);
  console.log(`   Endpoints: ${Object.keys(CONFIG.endpoints).join(', ')}`);
  console.log('\n' + '='.repeat(80));

  const allResults = [];

  for (const [name, path] of Object.entries(CONFIG.endpoints)) {
    const url = `${CONFIG.baseUrl}${path}`;
    const results = await benchmarkEndpoint(name, url);
    const summary = displayResults(results);
    allResults.push(summary);

    // Delay between endpoints
    await sleep(1000);
  }

  // Overall summary
  if (allResults.length > 1) {
    console.log('\n' + '='.repeat(80));
    console.log('OVERALL SUMMARY');
    console.log('='.repeat(80) + '\n');

    console.table(
      allResults.map((r) => ({
        Endpoint: r.endpoint,
        'Cold (ms)': r.coldAvg.toFixed(0),
        'Cached (ms)': r.warmedAvg.toFixed(0),
        'Improvement': `${r.improvement.toFixed(1)}%`,
        'Factor': `${r.improvementFactor.toFixed(2)}x`,
        'Target Met': r.targetMet ? '✅' : '⚠️',
      }))
    );

    const avgImprovement =
      allResults.reduce((sum, r) => sum + r.improvement, 0) /
      allResults.length;
    const allTargetsMet = allResults.every((r) => r.targetMet);

    console.log(`\n📊 Average Improvement: ${avgImprovement.toFixed(1)}%`);
    console.log(
      `🎯 All Targets Met: ${allTargetsMet ? '✅ YES' : '⚠️  NO'}\n`
    );
  }

  console.log('✅ Benchmark complete!\n');
}

// Run benchmarks
runBenchmarks().catch((error) => {
  console.error('\n❌ Benchmark failed:', error);
  process.exit(1);
});
