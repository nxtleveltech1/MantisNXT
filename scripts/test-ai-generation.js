#!/usr/bin/env node

/**
 * AI Provider Test Script
 *
 * Simple test to verify AI text generation is working.
 * Tests the configured provider with a basic prompt.
 */

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const { getProviderClient, getAllProviderHealthStatus } = require('../src/lib/ai/providers');

// Color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  bright: '\x1b[1m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testProvider(providerId) {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(`  Testing: ${providerId.toUpperCase()}`, 'bright');
  log('='.repeat(60), 'cyan');

  try {
    const client = getProviderClient(providerId);

    log(`\n📊 Provider Info:`, 'blue');
    log(`   ID: ${client.id}`);
    log(`   Streaming: ${client.supportsStreaming ? '✅' : '❌'}`);
    log(`   Embeddings: ${client.supportsEmbeddings ? '✅' : '❌'}`);

    // Test 1: Simple text generation
    log(`\n🔄 Test 1: Text Generation`, 'blue');
    log(`   Prompt: "What is 2+2?"`, 'cyan');

    const result = await client.generateText("What is 2+2? Answer in one sentence.", {
      temperature: 0.3,
      maxTokens: 100,
    });

    log(`\n✅ Response:`, 'green');
    log(`   ${result.text}`, 'bright');
    log(`\n📈 Metadata:`, 'blue');
    log(`   Model: ${result.model || 'default'}`);
    log(`   Provider: ${result.provider}`);
    log(`   Tokens: ${result.usage?.totalTokens || 'N/A'}`);
    log(`   Duration: ${result.usage?.durationMs || 'N/A'}ms`);

    // Test 2: Streaming (if supported)
    if (client.supportsStreaming) {
      log(`\n🔄 Test 2: Streaming`, 'blue');
      log(`   Prompt: "Count to 5"`, 'cyan');
      log(`\n📝 Stream Output:`, 'bright');
      process.stdout.write('   ');

      const stream = await client.streamText("Count from 1 to 5, one number per line.", {
        temperature: 0.3,
        maxTokens: 50,
      });

      for await (const chunk of stream) {
        process.stdout.write(chunk.token);
        if (chunk.done) break;
      }

      log('\n\n✅ Streaming test complete', 'green');
    }

    // Test 3: Chat (all providers support this)
    log(`\n🔄 Test 3: Chat Completion`, 'blue');

    const chatResult = await client.chat([
      { role: 'system', content: 'You are a helpful assistant. Be concise.' },
      { role: 'user', content: 'What is the capital of France?' },
    ], {
      temperature: 0.3,
      maxTokens: 50,
    });

    log(`\n✅ Chat Response:`, 'green');
    log(`   ${chatResult.text}`, 'bright');

    // Test 4: Embeddings (if supported)
    if (client.supportsEmbeddings) {
      log(`\n🔄 Test 4: Embeddings`, 'blue');

      const embeddingResult = await client.embed({
        input: "Test embedding generation",
      });

      log(`\n✅ Embedding Generated:`, 'green');
      log(`   Dimensions: ${embeddingResult.vector.length}`);
      log(`   First 5 values: [${embeddingResult.vector.slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]`);
    }

    log(`\n✅ All tests passed for ${providerId}!`, 'green');
    return true;

  } catch (error) {
    log(`\n❌ Test failed for ${providerId}:`, 'red');
    log(`   Error: ${error.message}`, 'red');
    if (error.stack) {
      log(`\n   Stack: ${error.stack.split('\n')[1]}`, 'yellow');
    }
    return false;
  }
}

async function checkProviderHealth() {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(`  Provider Health Status`, 'bright');
  log('='.repeat(60), 'cyan');

  try {
    const healthStatuses = await getAllProviderHealthStatus();

    healthStatuses.forEach(health => {
      const statusColor = health.status === 'healthy' ? 'green' :
                         health.status === 'degraded' ? 'yellow' : 'red';
      const statusIcon = health.status === 'healthy' ? '✅' :
                        health.status === 'degraded' ? '⚠️' : '❌';

      log(`\n${statusIcon} ${health.id}:`, statusColor);
      log(`   Status: ${health.status}`, statusColor);
      log(`   Last Checked: ${new Date(health.lastChecked).toLocaleTimeString()}`);

      if (health.latencyMs) {
        log(`   Latency: ${health.latencyMs}ms`);
      }
      if (health.consecutiveFailures > 0) {
        log(`   Failures: ${health.consecutiveFailures}`, 'yellow');
      }
      if (health.lastError) {
        log(`   Last Error: ${health.lastError}`, 'red');
      }
    });

  } catch (error) {
    log(`\n❌ Health check failed: ${error.message}`, 'red');
  }
}

async function main() {
  log('\n' + '█'.repeat(60), 'cyan');
  log('  🤖 AI PROVIDER TEST SUITE', 'bright');
  log('█'.repeat(60) + '\n', 'cyan');

  const defaultProvider = process.env.DEFAULT_AI_PROVIDER || 'anthropic';
  const testAllProviders = process.argv.includes('--all');

  if (testAllProviders) {
    log('📋 Testing all configured providers...', 'blue');

    const providers = ['anthropic', 'openai', 'vercel', 'openai-compatible'];
    const results = {};

    for (const provider of providers) {
      results[provider] = await testProvider(provider);
    }

    // Summary
    log(`\n${'='.repeat(60)}`, 'cyan');
    log(`  Test Summary`, 'bright');
    log('='.repeat(60), 'cyan');

    Object.entries(results).forEach(([provider, passed]) => {
      const icon = passed ? '✅' : '❌';
      const color = passed ? 'green' : 'red';
      log(`${icon} ${provider}: ${passed ? 'PASSED' : 'FAILED'}`, color);
    });

  } else {
    log(`📋 Testing default provider: ${defaultProvider}`, 'blue');
    await testProvider(defaultProvider);
  }

  // Always check health at the end
  await checkProviderHealth();

  log(`\n${'='.repeat(60)}`, 'cyan');
  log(`  Test Complete!`, 'bright');
  log('='.repeat(60), 'cyan');

  log(`\n📚 Next Steps:`, 'blue');
  log(`   • View full config: cat AI_PROVIDER_CONFIGURATION_REPORT.md`);
  log(`   • Quick start guide: cat AI_QUICK_START.md`);
  log(`   • Test all providers: node scripts/test-ai-generation.js --all`);
  log('');
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    log(`\n❌ Fatal error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  });
}

module.exports = { testProvider, checkProviderHealth };
