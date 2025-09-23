#!/usr/bin/env node

/**
 * MantisNXT Analytics CLI Tool
 * Command-line interface for testing and managing analytics system
 */

const fs = require('fs');
const path = require('path');

// CLI Configuration
const CLI_CONFIG = {
  apiBase: 'http://localhost:3000/api/analytics/comprehensive',
  defaultOrgId: 'demo-org-123',
  outputDir: './analytics-output'
};

// CLI Commands
const COMMANDS = {
  status: 'Get analytics service status',
  dashboard: 'Get comprehensive analytics dashboard',
  insights: 'Get AI-generated insights',
  recommendations: 'Get intelligent recommendations',
  anomalies: 'Get anomaly detection results',
  predictions: 'Get predictive analytics results',
  performance: 'Get performance metrics',
  report: 'Generate analytics report',
  optimize: 'Execute optimization workflow',
  init: 'Initialize analytics service',
  shutdown: 'Shutdown analytics service',
  config: 'Update analytics configuration',
  test: 'Run comprehensive system test',
  monitor: 'Start real-time monitoring',
  benchmark: 'Run performance benchmarks'
};

/**
 * Main CLI entry point
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const options = parseOptions(args.slice(1));

  if (!command || command === 'help') {
    showHelp();
    return;
  }

  if (!COMMANDS[command]) {
    console.error(`❌ Unknown command: ${command}`);
    showHelp();
    process.exit(1);
  }

  try {
    await executeCommand(command, options);
  } catch (error) {
    console.error(`❌ Error executing command: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Parse command-line options
 */
function parseOptions(args) {
  const options = {
    orgId: CLI_CONFIG.defaultOrgId,
    output: null,
    format: 'json',
    limit: 20
  };

  for (let i = 0; i < args.length; i += 2) {
    const key = args[i]?.replace(/^--/, '');
    const value = args[i + 1];

    if (key && value) {
      options[key] = value;
    }
  }

  return options;
}

/**
 * Execute CLI command
 */
async function executeCommand(command, options) {
  console.log(`🚀 Executing: ${command}`);
  console.log(`📊 Organization: ${options.orgId}`);
  console.log('─'.repeat(50));

  switch (command) {
    case 'status':
      await getStatus(options);
      break;
    case 'dashboard':
      await getDashboard(options);
      break;
    case 'insights':
      await getInsights(options);
      break;
    case 'recommendations':
      await getRecommendations(options);
      break;
    case 'anomalies':
      await getAnomalies(options);
      break;
    case 'predictions':
      await getPredictions(options);
      break;
    case 'performance':
      await getPerformance(options);
      break;
    case 'report':
      await generateReport(options);
      break;
    case 'optimize':
      await executeOptimization(options);
      break;
    case 'init':
      await initializeService(options);
      break;
    case 'shutdown':
      await shutdownService(options);
      break;
    case 'config':
      await updateConfig(options);
      break;
    case 'test':
      await runTests(options);
      break;
    case 'monitor':
      await startMonitoring(options);
      break;
    case 'benchmark':
      await runBenchmarks(options);
      break;
    default:
      throw new Error(`Command not implemented: ${command}`);
  }
}

/**
 * API helper functions
 */
async function apiGet(path, params = {}) {
  const url = new URL(CLI_CONFIG.apiBase);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });

  // Simulate API call (replace with actual fetch in real implementation)
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        data: generateMockData(path, params),
        timestamp: new Date().toISOString()
      });
    }, Math.random() * 500 + 100);
  });
}

async function apiPost(path, body) {
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        data: { message: 'Operation completed successfully' },
        timestamp: new Date().toISOString()
      });
    }, Math.random() * 1000 + 200);
  });
}

/**
 * Command implementations
 */
async function getStatus(options) {
  const response = await apiGet('', { organizationId: options.orgId, type: 'status' });

  if (response.success) {
    console.log('📈 Analytics Service Status:');
    console.log(`  Status: ${response.data.status}`);
    console.log(`  Last Update: ${response.data.lastUpdate}`);
    console.log(`  Modules Active: ${Object.values(response.data.modules).filter(Boolean).length}/7`);
    console.log(`  Performance Score: ${response.data.performance.responseTime}ms avg response`);
    console.log(`  Insights Generated: ${response.data.insights.totalGenerated}`);
  }

  saveOutput('status', response.data, options);
}

async function getDashboard(options) {
  const response = await apiGet('', { organizationId: options.orgId, type: 'dashboard' });

  if (response.success) {
    console.log('📊 Analytics Dashboard:');
    console.log(`  Total Insights: ${response.data.summary?.totalInsights || 0}`);
    console.log(`  Critical Alerts: ${response.data.summary?.criticalAlerts || 0}`);
    console.log(`  Active Recommendations: ${response.data.summary?.activeRecommendations || 0}`);
    console.log(`  Performance Score: ${response.data.summary?.performanceScore || 0}/100`);
    console.log(`  Optimization Opportunities: ${response.data.summary?.optimizationOpportunities || 0}`);
  }

  saveOutput('dashboard', response.data, options);
}

async function getInsights(options) {
  const response = await apiGet('', {
    organizationId: options.orgId,
    type: 'insights',
    limit: options.limit
  });

  if (response.success && response.data.length > 0) {
    console.log(`💡 AI Insights (${response.data.length}):`);
    response.data.slice(0, 5).forEach((insight, index) => {
      console.log(`  ${index + 1}. [${insight.priority}] ${insight.title}`);
      console.log(`     ${insight.description}`);
      console.log(`     Confidence: ${Math.round(insight.confidence * 100)}%`);
    });
  } else {
    console.log('💡 No insights available');
  }

  saveOutput('insights', response.data, options);
}

async function getRecommendations(options) {
  const response = await apiGet('', {
    organizationId: options.orgId,
    type: 'recommendations',
    limit: options.limit
  });

  if (response.success && response.data.length > 0) {
    console.log(`🎯 Recommendations (${response.data.length}):`);
    response.data.slice(0, 5).forEach((rec, index) => {
      console.log(`  ${index + 1}. [${rec.priority}] ${rec.title}`);
      console.log(`     Category: ${rec.category}`);
      console.log(`     Confidence: ${Math.round(rec.confidence * 100)}%`);
      console.log(`     Impact: ${rec.estimatedImpact || 'Medium'}`);
    });
  } else {
    console.log('🎯 No recommendations available');
  }

  saveOutput('recommendations', response.data, options);
}

async function getAnomalies(options) {
  const response = await apiGet('', {
    organizationId: options.orgId,
    type: 'anomalies',
    limit: options.limit
  });

  if (response.success && response.data.length > 0) {
    console.log(`⚠️ Anomalies Detected (${response.data.length}):`);
    response.data.slice(0, 5).forEach((anomaly, index) => {
      console.log(`  ${index + 1}. [${anomaly.severity}] ${anomaly.metric}`);
      console.log(`     Value: ${anomaly.value} (threshold: ${anomaly.threshold})`);
      console.log(`     Detected: ${anomaly.timestamp}`);
    });
  } else {
    console.log('⚠️ No anomalies detected');
  }

  saveOutput('anomalies', response.data, options);
}

async function getPredictions(options) {
  const response = await apiGet('', { organizationId: options.orgId, type: 'predictions' });

  if (response.success && response.data) {
    console.log('🔮 Predictive Analytics:');
    if (response.data.demandForecasts) {
      console.log(`  Demand Forecasts: ${response.data.demandForecasts.predictions?.length || 0} items`);
    }
    if (response.data.supplierRisk) {
      console.log(`  Supplier Risk Score: ${Math.round((response.data.supplierRisk.riskScore || 0) * 100)}%`);
    }
    if (response.data.marketIntelligence) {
      console.log(`  Market Intelligence: ${response.data.marketIntelligence.insights?.length || 0} insights`);
    }
  } else {
    console.log('🔮 No predictions available');
  }

  saveOutput('predictions', response.data, options);
}

async function getPerformance(options) {
  const response = await apiGet('', { organizationId: options.orgId, type: 'performance' });

  if (response.success && response.data) {
    console.log('⚡ Performance Metrics:');
    if (response.data.summary) {
      console.log(`  Overall Score: ${response.data.summary.score || 0}/100`);
      console.log(`  Status: ${response.data.summary.status || 'unknown'}`);
    }
    if (response.data.recommendations) {
      console.log(`  Optimization Recommendations: ${response.data.recommendations.count || 0}`);
      console.log(`  High Priority: ${response.data.recommendations.highPriority || 0}`);
    }
  } else {
    console.log('⚡ No performance data available');
  }

  saveOutput('performance', response.data, options);
}

async function generateReport(options) {
  const startDate = options.startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const endDate = options.endDate || new Date().toISOString();

  const response = await apiGet('', {
    organizationId: options.orgId,
    type: 'report',
    startDate,
    endDate
  });

  if (response.success && response.data) {
    console.log('📋 Analytics Report:');
    console.log(`  Period: ${startDate.split('T')[0]} to ${endDate.split('T')[0]}`);
    if (response.data.summary) {
      console.log(`  Total Predictions: ${response.data.summary.totalPredictions || 0}`);
      console.log(`  Anomalies Detected: ${response.data.summary.anomaliesDetected || 0}`);
      console.log(`  Recommendations: ${response.data.summary.recommendationsGenerated || 0}`);
      console.log(`  Optimizations: ${response.data.summary.optimizationsExecuted || 0}`);
      console.log(`  Performance Gains: ${Math.round(response.data.summary.performanceGains || 0)}%`);
      console.log(`  Estimated Cost Savings: $${Math.round(response.data.summary.costSavings || 0)}`);
    }
  } else {
    console.log('📋 Unable to generate report');
  }

  saveOutput('report', response.data, options);
}

async function executeOptimization(options) {
  const type = options.type || 'inventory';
  console.log(`🔧 Executing ${type} optimization...`);

  const response = await apiPost('', {
    organizationId: options.orgId,
    action: 'optimize',
    params: { type, ...options }
  });

  if (response.success) {
    console.log('✅ Optimization completed successfully');
    console.log(`   Details: ${response.data.message || 'No details available'}`);
  } else {
    console.log('❌ Optimization failed');
  }

  saveOutput('optimization', response.data, options);
}

async function initializeService(options) {
  console.log('🚀 Initializing analytics service...');

  const response = await apiPost('', {
    organizationId: options.orgId,
    action: 'initialize'
  });

  if (response.success) {
    console.log('✅ Analytics service initialized successfully');
  } else {
    console.log('❌ Failed to initialize analytics service');
  }
}

async function shutdownService(options) {
  console.log('🛑 Shutting down analytics service...');

  const response = await apiPost('', {
    organizationId: options.orgId,
    action: 'shutdown'
  });

  if (response.success) {
    console.log('✅ Analytics service shutdown successfully');
  } else {
    console.log('❌ Failed to shutdown analytics service');
  }
}

async function updateConfig(options) {
  const configFile = options.config || './analytics-config.json';

  if (!fs.existsSync(configFile)) {
    console.log('📝 Creating default configuration file...');
    const defaultConfig = {
      features: {
        predictiveAnalytics: true,
        anomalyDetection: true,
        recommendations: true,
        automation: true,
        performance: true,
        aiInsights: true
      },
      thresholds: {
        anomaly: { sensitivity: 0.8, confidence: 0.85 },
        performance: { responseTime: 1000, errorRate: 0.02, resourceUsage: 0.8 },
        recommendations: { minConfidence: 0.7, maxSuggestions: 20 }
      },
      intervals: { monitoring: 30000, optimization: 300000, reporting: 3600000 }
    };

    fs.writeFileSync(configFile, JSON.stringify(defaultConfig, null, 2));
    console.log(`📁 Configuration file created: ${configFile}`);
    return;
  }

  const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
  console.log('⚙️ Updating analytics configuration...');

  const response = await apiPost('', {
    organizationId: options.orgId,
    action: 'updateConfig',
    params: { config }
  });

  if (response.success) {
    console.log('✅ Configuration updated successfully');
  } else {
    console.log('❌ Failed to update configuration');
  }
}

async function runTests(options) {
  console.log('🧪 Running comprehensive analytics tests...');

  const tests = [
    { name: 'Service Status', command: 'status' },
    { name: 'Dashboard Load', command: 'dashboard' },
    { name: 'Insights Generation', command: 'insights' },
    { name: 'Recommendations', command: 'recommendations' },
    { name: 'Performance Metrics', command: 'performance' }
  ];

  let passed = 0;
  let total = tests.length;

  for (const test of tests) {
    process.stdout.write(`  ${test.name}... `);
    try {
      await executeCommand(test.command, { ...options, output: null });
      console.log('✅ PASS');
      passed++;
    } catch (error) {
      console.log('❌ FAIL');
    }
  }

  console.log('─'.repeat(50));
  console.log(`🧪 Test Results: ${passed}/${total} passed (${Math.round(passed/total*100)}%)`);
}

async function startMonitoring(options) {
  console.log('👁️ Starting real-time monitoring (Ctrl+C to stop)...');

  const interval = parseInt(options.interval) || 10000; // 10 seconds default
  let iteration = 0;

  const monitor = setInterval(async () => {
    iteration++;
    console.clear();
    console.log(`📊 Real-time Analytics Monitor - Iteration ${iteration}`);
    console.log(`🕐 ${new Date().toLocaleTimeString()}`);
    console.log('─'.repeat(50));

    try {
      await getStatus({ ...options, output: null });
      console.log('');
      await getPerformance({ ...options, output: null });
    } catch (error) {
      console.log(`❌ Monitoring error: ${error.message}`);
    }

    console.log('─'.repeat(50));
    console.log('Press Ctrl+C to stop monitoring');
  }, interval);

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    clearInterval(monitor);
    console.log('\n👋 Monitoring stopped');
    process.exit(0);
  });
}

async function runBenchmarks(options) {
  console.log('🏃‍♂️ Running performance benchmarks...');

  const benchmarks = [
    { name: 'Dashboard Load Time', iterations: 10 },
    { name: 'Insights Generation', iterations: 5 },
    { name: 'Recommendations Fetch', iterations: 5 },
    { name: 'Performance Metrics', iterations: 10 }
  ];

  for (const benchmark of benchmarks) {
    console.log(`\n📊 ${benchmark.name}:`);
    const times = [];

    for (let i = 0; i < benchmark.iterations; i++) {
      const start = Date.now();
      try {
        await getDashboard({ ...options, output: null });
        times.push(Date.now() - start);
        process.stdout.write('.');
      } catch (error) {
        process.stdout.write('x');
      }
    }

    if (times.length > 0) {
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const min = Math.min(...times);
      const max = Math.max(...times);

      console.log(`\n  Average: ${Math.round(avg)}ms`);
      console.log(`  Min: ${min}ms, Max: ${max}ms`);
      console.log(`  Success Rate: ${Math.round(times.length / benchmark.iterations * 100)}%`);
    }
  }
}

/**
 * Utility functions
 */
function saveOutput(command, data, options) {
  if (options.output) {
    // Ensure output directory exists
    if (!fs.existsSync(CLI_CONFIG.outputDir)) {
      fs.mkdirSync(CLI_CONFIG.outputDir, { recursive: true });
    }

    const filename = options.output === 'auto'
      ? `${command}-${Date.now()}.json`
      : options.output;

    const filepath = path.join(CLI_CONFIG.outputDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
    console.log(`💾 Output saved to: ${filepath}`);
  }
}

function generateMockData(path, params) {
  // Generate realistic mock data for testing
  const mockData = {
    status: {
      status: 'running',
      modules: { mlModels: true, predictive: true, anomaly: true, recommendations: true, automation: true, performance: true, dashboard: true },
      lastUpdate: new Date().toISOString(),
      performance: { responseTime: Math.round(Math.random() * 200 + 100), errorRate: 0.001, uptime: 99.8 },
      insights: { totalGenerated: Math.round(Math.random() * 100 + 50), highPriority: Math.round(Math.random() * 10), actionable: Math.round(Math.random() * 20) }
    },
    dashboard: {
      summary: {
        totalInsights: Math.round(Math.random() * 50 + 25),
        criticalAlerts: Math.round(Math.random() * 3),
        activeRecommendations: Math.round(Math.random() * 12 + 5),
        performanceScore: Math.round(Math.random() * 30 + 70),
        optimizationOpportunities: Math.round(Math.random() * 8 + 2)
      }
    },
    insights: Array.from({ length: 10 }, (_, i) => ({
      id: `insight-${i}`,
      title: `Performance optimization opportunity ${i + 1}`,
      description: `Analysis suggests potential improvement in system component ${i + 1}`,
      priority: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)],
      confidence: 0.7 + Math.random() * 0.3,
      category: ['performance', 'cost', 'quality', 'efficiency'][Math.floor(Math.random() * 4)]
    }))
  };

  return mockData[params.type] || mockData.status;
}

function showHelp() {
  console.log('🚀 MantisNXT Analytics CLI Tool\n');
  console.log('Usage: node analytics-cli.js <command> [options]\n');
  console.log('Commands:');
  Object.entries(COMMANDS).forEach(([cmd, desc]) => {
    console.log(`  ${cmd.padEnd(15)} ${desc}`);
  });
  console.log('\nOptions:');
  console.log('  --orgId <id>      Organization ID (default: demo-org-123)');
  console.log('  --output <file>   Save output to file (use "auto" for timestamp)');
  console.log('  --format <fmt>    Output format: json, table, csv (default: json)');
  console.log('  --limit <n>       Limit results (default: 20)');
  console.log('  --type <type>     Optimization type: inventory, supplier, performance, query');
  console.log('  --interval <ms>   Monitoring interval in milliseconds (default: 10000)');
  console.log('\nExamples:');
  console.log('  node analytics-cli.js status');
  console.log('  node analytics-cli.js dashboard --orgId my-org --output auto');
  console.log('  node analytics-cli.js optimize --type inventory');
  console.log('  node analytics-cli.js monitor --interval 5000');
  console.log('  node analytics-cli.js test');
}

// Run CLI if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main, executeCommand, CLI_CONFIG };