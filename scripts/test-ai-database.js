#!/usr/bin/env node
/**
 * AI Database Integration Test Suite
 *
 * Tests all AI database features:
 * - Natural language to SQL conversion
 * - Data analysis with insights
 * - Anomaly detection
 * - Prediction generation
 *
 * Usage:
 *   node scripts/test-ai-database.js
 *   node scripts/test-ai-database.js --feature query
 *   node scripts/test-ai-database.js --feature analyze
 *   node scripts/test-ai-database.js --feature anomalies
 *   node scripts/test-ai-database.js --feature predictions
 */

const axios = require('axios');

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const API_BASE = `${BASE_URL}/api/ai/data`;

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  tests: [],
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(name, status, duration, details = '') {
  const symbol = status === 'PASS' ? '✓' : '✗';
  const color = status === 'PASS' ? 'green' : 'red';
  log(`${symbol} ${name} (${duration}ms)`, color);
  if (details) {
    log(`  ${details}`, 'cyan');
  }

  results.tests.push({ name, status, duration, details });
  if (status === 'PASS') results.passed++;
  else results.failed++;
}

async function testNaturalLanguageQuery() {
  log('\n=== Testing Natural Language Query API ===', 'blue');

  const testQueries = [
    {
      name: 'Top 5 suppliers by inventory',
      query: 'Show me the top 5 suppliers by total inventory value',
      expectKeys: ['data', 'meta'],
    },
    {
      name: 'Products with low stock',
      query: 'Find products with low stock levels',
      expectKeys: ['data', 'meta'],
    },
    {
      name: 'Suppliers with most products',
      query: 'Which suppliers have the most products?',
      expectKeys: ['data', 'meta'],
    },
    {
      name: 'Recent purchase orders',
      query: 'What are the recent purchase orders?',
      expectKeys: ['data', 'meta'],
    },
    {
      name: 'Inventory needing reorder',
      query: 'Show inventory items that need reordering',
      expectKeys: ['data', 'meta'],
    },
  ];

  for (const test of testQueries) {
    const startTime = Date.now();
    try {
      const response = await axios.post(`${API_BASE}/query`, {
        query: test.query,
        options: {
          explain: true,
          limit: 100,
        },
      });

      const duration = Date.now() - startTime;

      // Validate response structure
      if (response.data.success &&
          test.expectKeys.every(key => key in response.data) &&
          Array.isArray(response.data.data)) {

        const details = `Returned ${response.data.meta.returned_rows} rows, SQL generated, execution time: ${response.data.meta.execution_time_ms}ms`;
        logTest(test.name, 'PASS', duration, details);
      } else {
        logTest(test.name, 'FAIL', duration, 'Invalid response structure');
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      logTest(test.name, 'FAIL', duration, error.message);
    }
  }
}

async function testDataAnalysis() {
  log('\n=== Testing Data Analysis API ===', 'blue');

  const testCases = [
    {
      name: 'Analyze inventory trends',
      payload: {
        table: 'inventory_items',
        focus: 'trends',
      },
    },
    {
      name: 'Find supplier risks',
      payload: {
        table: 'suppliers',
        focus: 'risks',
      },
    },
    {
      name: 'Identify opportunities in products',
      payload: {
        table: 'products',
        focus: 'opportunities',
      },
    },
    {
      name: 'Comprehensive purchase order analysis',
      payload: {
        table: 'purchase_orders',
        focus: 'all',
      },
    },
  ];

  for (const test of testCases) {
    const startTime = Date.now();
    try {
      const response = await axios.post(`${API_BASE}/analyze`, test.payload);

      const duration = Date.now() - startTime;

      // Validate response structure
      if (response.data.success &&
          response.data.analysis &&
          response.data.analysis.summary &&
          Array.isArray(response.data.analysis.insights)) {

        const insightCount = response.data.analysis.insights.length;
        const qualityScore = response.data.analysis.metrics?.data_quality_score || 'N/A';
        const details = `Found ${insightCount} insights, quality score: ${qualityScore}`;
        logTest(test.name, 'PASS', duration, details);
      } else {
        logTest(test.name, 'FAIL', duration, 'Invalid response structure');
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      logTest(test.name, 'FAIL', duration, error.message);
    }
  }
}

async function testAnomalyDetection() {
  log('\n=== Testing Anomaly Detection API ===', 'blue');

  const testCases = [
    {
      name: 'Check inventory data quality',
      payload: {
        table: 'inventory_items',
        checks: ['data_quality', 'statistical'],
      },
    },
    {
      name: 'Full supplier anomaly scan',
      payload: {
        table: 'suppliers',
        checks: ['data_quality', 'statistical', 'business_rule'],
      },
    },
    {
      name: 'Product catalog validation',
      payload: {
        table: 'products',
        checks: ['data_quality', 'business_rule'],
      },
    },
  ];

  for (const test of testCases) {
    const startTime = Date.now();
    try {
      const response = await axios.post(`${API_BASE}/anomalies`, test.payload);

      const duration = Date.now() - startTime;

      // Validate response structure
      if (response.data.success &&
          response.data.detection &&
          typeof response.data.detection.overall_health_score === 'number' &&
          Array.isArray(response.data.detection.anomalies)) {

        const anomalyCount = response.data.detection.total_anomalies;
        const healthScore = response.data.detection.overall_health_score;
        const criticalCount = response.data.detection.by_severity?.critical || 0;
        const details = `Found ${anomalyCount} anomalies (${criticalCount} critical), health: ${healthScore}`;
        logTest(test.name, 'PASS', duration, details);
      } else {
        logTest(test.name, 'FAIL', duration, 'Invalid response structure');
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      logTest(test.name, 'FAIL', duration, error.message);
    }
  }
}

async function testPredictions() {
  log('\n=== Testing Predictions API ===', 'blue');

  const testCases = [
    {
      name: 'Predict inventory demand',
      payload: {
        type: 'inventory_demand',
        forecast_days: 30,
      },
    },
    {
      name: 'Forecast supplier performance',
      payload: {
        type: 'supplier_performance',
        forecast_days: 60,
      },
    },
    {
      name: 'Predict stock levels',
      payload: {
        type: 'stock_levels',
        forecast_days: 45,
      },
    },
  ];

  for (const test of testCases) {
    const startTime = Date.now();
    try {
      const response = await axios.post(`${API_BASE}/predictions`, test.payload);

      const duration = Date.now() - startTime;

      // Validate response structure
      if (response.data.success &&
          response.data.prediction &&
          Array.isArray(response.data.prediction.predictions) &&
          typeof response.data.prediction.confidence === 'number') {

        const predictionCount = response.data.prediction.predictions.length;
        const confidence = response.data.prediction.confidence;
        const trend = response.data.prediction.summary?.trend || 'unknown';
        const details = `Generated ${predictionCount} predictions, confidence: ${confidence}, trend: ${trend}`;
        logTest(test.name, 'PASS', duration, details);
      } else {
        logTest(test.name, 'FAIL', duration, 'Invalid response structure');
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      logTest(test.name, 'FAIL', duration, error.message);
    }
  }
}

async function testAPIEndpoints() {
  log('\n=== Testing API Endpoint Information ===', 'blue');

  const endpoints = [
    { name: 'Query endpoint info', url: `${API_BASE}/query` },
    { name: 'Analyze endpoint info', url: `${API_BASE}/analyze` },
    { name: 'Anomalies endpoint info', url: `${API_BASE}/anomalies` },
    { name: 'Predictions endpoint info', url: `${API_BASE}/predictions` },
  ];

  for (const endpoint of endpoints) {
    const startTime = Date.now();
    try {
      const response = await axios.get(endpoint.url);
      const duration = Date.now() - startTime;

      if (response.data.endpoint && response.data.description) {
        logTest(endpoint.name, 'PASS', duration, `Endpoint: ${response.data.endpoint}`);
      } else {
        logTest(endpoint.name, 'FAIL', duration, 'Invalid info response');
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      logTest(endpoint.name, 'FAIL', duration, error.message);
    }
  }
}

async function testErrorHandling() {
  log('\n=== Testing Error Handling ===', 'blue');

  const errorTests = [
    {
      name: 'Invalid query format',
      endpoint: `${API_BASE}/query`,
      payload: { query: '' }, // Too short
      expectStatus: 400,
    },
    {
      name: 'Missing required fields',
      endpoint: `${API_BASE}/analyze`,
      payload: {}, // No table or query
      expectStatus: 400,
    },
    {
      name: 'Invalid prediction type',
      endpoint: `${API_BASE}/predictions`,
      payload: { type: 'invalid_type' },
      expectStatus: 400,
    },
  ];

  for (const test of errorTests) {
    const startTime = Date.now();
    try {
      await axios.post(test.endpoint, test.payload);
      const duration = Date.now() - startTime;
      logTest(test.name, 'FAIL', duration, 'Should have thrown error');
    } catch (error) {
      const duration = Date.now() - startTime;
      if (error.response && error.response.status === test.expectStatus) {
        logTest(test.name, 'PASS', duration, `Correctly returned ${test.expectStatus}`);
      } else {
        logTest(test.name, 'FAIL', duration, `Expected ${test.expectStatus}, got ${error.response?.status || 'no status'}`);
      }
    }
  }
}

async function printSummary() {
  log('\n' + '='.repeat(60), 'cyan');
  log('TEST SUMMARY', 'cyan');
  log('='.repeat(60), 'cyan');

  const total = results.passed + results.failed;
  const passRate = total > 0 ? ((results.passed / total) * 100).toFixed(1) : 0;

  log(`Total Tests: ${total}`, 'blue');
  log(`Passed: ${results.passed}`, 'green');
  log(`Failed: ${results.failed}`, results.failed > 0 ? 'red' : 'green');
  log(`Pass Rate: ${passRate}%`, passRate >= 80 ? 'green' : 'yellow');

  if (results.failed > 0) {
    log('\nFailed Tests:', 'red');
    results.tests
      .filter(t => t.status === 'FAIL')
      .forEach(t => log(`  - ${t.name}: ${t.details}`, 'red'));
  }

  log('='.repeat(60), 'cyan');

  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

async function runAllTests() {
  log('╔════════════════════════════════════════════════════════╗', 'cyan');
  log('║       AI Database Integration Test Suite              ║', 'cyan');
  log('╚════════════════════════════════════════════════════════╝', 'cyan');
  log(`\nBase URL: ${BASE_URL}`, 'blue');
  log(`Testing against: ${API_BASE}\n`, 'blue');

  try {
    // Check if server is running
    try {
      await axios.get(`${BASE_URL}/api/health`);
      log('✓ Server is running', 'green');
    } catch (error) {
      log('✗ Server is not responding. Please start the server first.', 'red');
      log('  Run: npm run dev', 'yellow');
      process.exit(1);
    }

    // Run feature tests based on args
    const feature = process.argv.find(arg => arg.startsWith('--feature='))?.split('=')[1];

    if (!feature || feature === 'query') {
      await testNaturalLanguageQuery();
    }

    if (!feature || feature === 'analyze') {
      await testDataAnalysis();
    }

    if (!feature || feature === 'anomalies') {
      await testAnomalyDetection();
    }

    if (!feature || feature === 'predictions') {
      await testPredictions();
    }

    if (!feature) {
      await testAPIEndpoints();
      await testErrorHandling();
    }

    await printSummary();

  } catch (error) {
    log(`\nFatal Error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

// Run tests
if (require.main === module) {
  runAllTests();
}

module.exports = {
  testNaturalLanguageQuery,
  testDataAnalysis,
  testAnomalyDetection,
  testPredictions,
};
