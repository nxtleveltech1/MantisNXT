#!/usr/bin/env node

/**
 * AI Provider Verification Script
 *
 * Verifies Vercel AI SDK v5 provider configuration and connectivity.
 * Tests all configured providers and reports health status.
 */

const fs = require('fs');
const path = require('path');

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function header(text) {
  log('\n' + '='.repeat(60), 'cyan');
  log(`  ${text}`, 'bright');
  log('='.repeat(60), 'cyan');
}

function success(text) {
  log(`✅ ${text}`, 'green');
}

function error(text) {
  log(`❌ ${text}`, 'red');
}

function warning(text) {
  log(`⚠️  ${text}`, 'yellow');
}

function info(text) {
  log(`ℹ️  ${text}`, 'blue');
}

// Load environment variables
function loadEnv() {
  const envPath = path.join(process.cwd(), '.env.local');

  if (!fs.existsSync(envPath)) {
    warning('.env.local not found - using process.env only');
    return;
  }

  const envContent = fs.readFileSync(envPath, 'utf-8');
  const lines = envContent.split('\n');

  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;

    const [key, ...valueParts] = trimmed.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').trim();
      process.env[key.trim()] = value;
    }
  });

  success('.env.local loaded successfully');
}

// Check package.json for required dependencies
function checkDependencies() {
  header('Checking Dependencies');

  const packageJsonPath = path.join(process.cwd(), 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    error('package.json not found!');
    return false;
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

  const requiredPackages = {
    'ai': '^5.0.0',
    '@ai-sdk/anthropic': '^1.0.0',
    '@ai-sdk/openai': '^1.0.0',
    '@ai-sdk/gateway': '^1.0.0',
  };

  let allPresent = true;

  Object.entries(requiredPackages).forEach(([pkg, version]) => {
    if (deps[pkg]) {
      success(`${pkg} @ ${deps[pkg]}`);
    } else {
      error(`${pkg} is missing (required: ${version})`);
      allPresent = false;
    }
  });

  return allPresent;
}

// Check provider configuration
function checkProviderConfig(providerId, envVars) {
  const config = {
    id: providerId,
    enabled: false,
    credentials: {},
    issues: [],
  };

  envVars.forEach(({ key, required, description }) => {
    const value = process.env[key];

    if (value && value !== '...' && value !== 'your-key-here') {
      config.credentials[key] = '***' + value.slice(-4);
      config.enabled = true;
    } else if (required) {
      config.issues.push(`Missing required: ${key} (${description})`);
    }
  });

  return config;
}

// Verify all providers
function verifyProviders() {
  header('Provider Configuration Status');

  const providers = [
    {
      id: 'anthropic',
      name: 'Anthropic (Claude)',
      icon: '🤖',
      envVars: [
        { key: 'ANTHROPIC_API_KEY', required: true, description: 'API Key from console.anthropic.com' },
        { key: 'ANTHROPIC_BASE_URL', required: false, description: 'Custom API endpoint' },
      ],
      capabilities: ['Text Generation', 'Streaming', 'Chat'],
      models: ['claude-3-5-sonnet-latest', 'claude-3-5-haiku-latest'],
    },
    {
      id: 'openai',
      name: 'OpenAI (GPT-4)',
      icon: '🧠',
      envVars: [
        { key: 'OPENAI_API_KEY', required: true, description: 'API Key from platform.openai.com' },
        { key: 'OPENAI_BASE_URL', required: false, description: 'Custom API endpoint' },
        { key: 'OPENAI_ORGANIZATION', required: false, description: 'Organization ID' },
        { key: 'OPENAI_PROJECT', required: false, description: 'Project ID' },
      ],
      capabilities: ['Text Generation', 'Streaming', 'Chat', 'Embeddings'],
      models: ['gpt-4o-mini', 'gpt-4-turbo', 'text-embedding-3-large'],
    },
    {
      id: 'vercel',
      name: 'Vercel AI Gateway',
      icon: '🌐',
      envVars: [
        { key: 'VERCEL_AI_GATEWAY_TOKEN', required: true, description: 'Gateway token from vercel.com' },
        { key: 'VERCEL_AI_GATEWAY_URL', required: true, description: 'Gateway URL' },
      ],
      capabilities: ['Routing', 'Load Balancing', 'All Provider Features'],
      models: ['Depends on configured providers'],
    },
    {
      id: 'openai-compatible',
      name: 'OpenAI-Compatible',
      icon: '🔧',
      envVars: [
        { key: 'OPENAI_COMPATIBLE_API_KEY', required: true, description: 'API Key for custom provider' },
        { key: 'OPENAI_COMPATIBLE_BASE_URL', required: true, description: 'Custom provider URL (e.g., Groq)' },
      ],
      capabilities: ['Depends on provider', 'Text Generation', 'Streaming'],
      models: ['Custom models (Groq, Together AI, etc.)'],
    },
  ];

  const results = [];

  providers.forEach(provider => {
    log(`\n${provider.icon} ${provider.name}`, 'bright');
    log('-'.repeat(50), 'dim');

    const config = checkProviderConfig(provider.id, provider.envVars);

    if (config.enabled) {
      success(`Status: ENABLED`);
      info(`Capabilities: ${provider.capabilities.join(', ')}`);
      info(`Models: ${provider.models.slice(0, 2).join(', ')}`);

      Object.entries(config.credentials).forEach(([key, value]) => {
        info(`${key}: ${value}`);
      });
    } else {
      warning(`Status: NOT CONFIGURED`);
      config.issues.forEach(issue => warning(issue));

      if (provider.id === 'anthropic') {
        error('⚠️  PRIMARY PROVIDER NOT CONFIGURED!');
        info('Get API key from: https://console.anthropic.com/');
      }
    }

    results.push({ ...provider, config });
  });

  return results;
}

// Check global AI configuration
function checkGlobalConfig() {
  header('Global AI Configuration');

  const globalConfig = {
    'DEFAULT_AI_PROVIDER': process.env.DEFAULT_AI_PROVIDER || 'anthropic',
    'ENABLE_AI_FEATURES': process.env.ENABLE_AI_FEATURES || 'true',
    'ENABLE_AI_STREAMING': process.env.ENABLE_AI_STREAMING || 'true',
    'ENABLE_AI_FALLBACK': process.env.ENABLE_AI_FALLBACK || 'true',
    'AI_MAX_TOKENS': process.env.AI_MAX_TOKENS || '8192',
    'AI_TEMPERATURE': process.env.AI_TEMPERATURE || '0.2',
    'AI_REQUEST_TIMEOUT': process.env.AI_REQUEST_TIMEOUT || '30000',
    'AI_FALLBACK_ORDER': process.env.AI_FALLBACK_ORDER || 'anthropic,openai,vercel,openai-compatible',
  };

  Object.entries(globalConfig).forEach(([key, value]) => {
    info(`${key}: ${value}`);
  });

  return globalConfig;
}

// Check analytics and monitoring
function checkMonitoring() {
  header('Analytics & Monitoring Configuration');

  const monitoring = {
    'AI_ANALYTICS_ENABLED': process.env.AI_ANALYTICS_ENABLED || 'true',
    'AI_ANALYTICS_SAMPLE_RATE': process.env.AI_ANALYTICS_SAMPLE_RATE || '1.0',
    'AI_MONITORING_ENABLED': process.env.AI_MONITORING_ENABLED || 'true',
    'AI_HEALTHCHECK_INTERVAL_MS': process.env.AI_HEALTHCHECK_INTERVAL_MS || '60000',
    'AI_UNHEALTHY_THRESHOLD': process.env.AI_UNHEALTHY_THRESHOLD || '3',
  };

  Object.entries(monitoring).forEach(([key, value]) => {
    info(`${key}: ${value}`);
  });

  if (monitoring.AI_ANALYTICS_ENABLED === 'true') {
    success('Analytics enabled - usage metrics will be tracked');
  }

  if (monitoring.AI_MONITORING_ENABLED === 'true') {
    success('Health monitoring enabled - automatic failover active');
  }

  return monitoring;
}

// Generate report summary
function generateSummary(providerResults, globalConfig) {
  header('Configuration Summary');

  const enabledProviders = providerResults.filter(p => p.config.enabled);
  const totalProviders = providerResults.length;

  log(`\n📊 Provider Status:`, 'bright');
  log(`   Total Providers: ${totalProviders}`, 'cyan');
  log(`   Enabled: ${enabledProviders.length}`, 'green');
  log(`   Disabled: ${totalProviders - enabledProviders.length}`, 'yellow');

  log(`\n🎯 Default Provider:`, 'bright');
  const defaultProvider = providerResults.find(p => p.id === globalConfig.DEFAULT_AI_PROVIDER);
  if (defaultProvider && defaultProvider.config.enabled) {
    success(`${defaultProvider.icon} ${defaultProvider.name} (Configured)`);
  } else {
    error(`${globalConfig.DEFAULT_AI_PROVIDER} (Not Configured!)`);
  }

  log(`\n🔄 Fallback Chain:`, 'bright');
  const fallbackOrder = globalConfig.AI_FALLBACK_ORDER.split(',');
  fallbackOrder.forEach((id, index) => {
    const provider = providerResults.find(p => p.id.trim() === id.trim());
    if (provider) {
      const status = provider.config.enabled ? '✅' : '❌';
      log(`   ${index + 1}. ${status} ${provider.name}`, provider.config.enabled ? 'green' : 'dim');
    }
  });

  log(`\n📈 System Status:`, 'bright');
  if (enabledProviders.length === 0) {
    error('NO PROVIDERS CONFIGURED - AI features will not work!');
    log('\n🚀 Quick Fix:', 'yellow');
    log('   1. Get API key from: https://console.anthropic.com/', 'cyan');
    log('   2. Add to .env.local: ANTHROPIC_API_KEY=sk-ant-...', 'cyan');
    log('   3. Restart application', 'cyan');
  } else if (enabledProviders.length === 1) {
    warning('Only one provider configured - no automatic fallback available');
    info('Consider adding a secondary provider for redundancy');
  } else {
    success(`${enabledProviders.length} providers configured with automatic failover`);
  }

  log(''); // Empty line for spacing
}

// Generate recommendations
function generateRecommendations(providerResults, globalConfig) {
  header('Recommendations');

  const recommendations = [];
  const enabledProviders = providerResults.filter(p => p.config.enabled);

  // Check primary provider
  const anthropic = providerResults.find(p => p.id === 'anthropic');
  if (!anthropic.config.enabled) {
    recommendations.push({
      priority: 'HIGH',
      icon: '🚨',
      message: 'Configure Anthropic (Claude) as primary provider',
      action: 'Add ANTHROPIC_API_KEY to .env.local',
      url: 'https://console.anthropic.com/',
    });
  }

  // Check fallback
  if (enabledProviders.length < 2 && globalConfig.ENABLE_AI_FALLBACK === 'true') {
    recommendations.push({
      priority: 'MEDIUM',
      icon: '⚠️',
      message: 'Add secondary provider for automatic failover',
      action: 'Configure OpenAI as backup: Add OPENAI_API_KEY',
      url: 'https://platform.openai.com/api-keys',
    });
  }

  // Check embeddings
  const openai = providerResults.find(p => p.id === 'openai');
  if (!openai.config.enabled) {
    recommendations.push({
      priority: 'LOW',
      icon: 'ℹ️',
      message: 'Embeddings not available (requires OpenAI)',
      action: 'Optional: Add OPENAI_API_KEY for embedding support',
      url: 'https://platform.openai.com/api-keys',
    });
  }

  // Display recommendations
  if (recommendations.length === 0) {
    success('Configuration looks good! No recommendations.');
  } else {
    recommendations.forEach(rec => {
      log(`\n${rec.icon} [${rec.priority}] ${rec.message}`, rec.priority === 'HIGH' ? 'red' : 'yellow');
      info(`   Action: ${rec.action}`);
      info(`   URL: ${rec.url}`);
    });
  }
}

// Main execution
async function main() {
  log('\n' + '█'.repeat(60), 'cyan');
  log('  🤖 AI PROVIDER VERIFICATION - VERCEL AI SDK V5', 'bright');
  log('█'.repeat(60) + '\n', 'cyan');

  try {
    // Load environment
    loadEnv();

    // Check dependencies
    const depsOk = checkDependencies();
    if (!depsOk) {
      error('\nMissing dependencies! Run: npm install');
      process.exit(1);
    }

    // Verify providers
    const providerResults = verifyProviders();

    // Check global config
    const globalConfig = checkGlobalConfig();

    // Check monitoring
    const monitoring = checkMonitoring();

    // Generate summary
    generateSummary(providerResults, globalConfig);

    // Generate recommendations
    generateRecommendations(providerResults, globalConfig);

    // Final status
    header('Verification Complete');

    const enabledCount = providerResults.filter(p => p.config.enabled).length;

    if (enabledCount > 0) {
      success('AI providers are configured and ready to use!');
      info('Next steps:');
      info('  1. Test with: node scripts/test-ai-generation.js');
      info('  2. View docs: /AI_QUICK_START.md');
      info('  3. Full report: /AI_PROVIDER_CONFIGURATION_REPORT.md');
    } else {
      error('No providers configured - AI features disabled');
      info('See recommendations above to get started');
    }

    log(''); // Empty line

  } catch (err) {
    error(`Verification failed: ${err.message}`);
    console.error(err);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };
