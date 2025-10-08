#!/usr/bin/env node
/**
 * AI SDK v5 Verification Script
 * Tests Vercel AI SDK installation and configuration
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Vercel AI SDK v5 Verification\n');
console.log('='.repeat(50));

// Check packages
const packages = [
  'ai',
  '@ai-sdk/anthropic',
  '@ai-sdk/openai',
  '@ai-sdk/vercel'
];

console.log('\n📦 Package Versions:\n');
packages.forEach(pkg => {
  try {
    const pkgPath = path.join(process.cwd(), 'node_modules', pkg, 'package.json');
    const version = JSON.parse(fs.readFileSync(pkgPath, 'utf8')).version;
    console.log(`   ✅ ${pkg.padEnd(25)} v${version}`);
  } catch (e) {
    console.log(`   ❌ ${pkg.padEnd(25)} NOT INSTALLED`);
  }
});

// Check environment
console.log('\n🔐 Environment Variables:\n');
const envFile = path.join(process.cwd(), '.env.local');
let hasAnthropicKey = false;
let hasOpenAIKey = false;
let hasVercelKV = false;

if (fs.existsSync(envFile)) {
  const envContent = fs.readFileSync(envFile, 'utf8');
  hasAnthropicKey = /ANTHROPIC_API_KEY=.+/.test(envContent);
  hasOpenAIKey = /OPENAI_API_KEY=.+/.test(envContent);
  hasVercelKV = /KV_REST_API_URL=.+/.test(envContent);
}

console.log(`   ${hasAnthropicKey ? '✅' : '❌'} ANTHROPIC_API_KEY: ${hasAnthropicKey ? 'Set' : 'Not set'}`);
console.log(`   ${hasOpenAIKey ? '✅' : '❌'} OPENAI_API_KEY:   ${hasOpenAIKey ? 'Set' : 'Not set'}`);
console.log(`   ${hasVercelKV ? '✅' : '⚠️ '} KV_REST_API_URL:   ${hasVercelKV ? 'Set' : 'Optional'}`);

// Check provider files
const providerFiles = [
  'src/lib/ai/providers.ts',
  'src/lib/ai/config.ts',
  'src/lib/ai/index.ts',
  'src/lib/ai/secrets.ts'
];

console.log('\n📁 Core AI Files:\n');
providerFiles.forEach(file => {
  const exists = fs.existsSync(path.join(process.cwd(), file));
  console.log(`   ${exists ? '✅' : '❌'} ${file}`);
});

// Check API routes
const apiRoutes = [
  'src/app/api/ai/chat/route.ts',
  'src/app/api/ai/generate/route.ts',
  'src/app/api/ai/analyze/route.ts',
  'src/app/api/ai/insights/generate/route.ts',
  'src/app/api/ai/suppliers/discover/route.ts',
  'src/app/api/ai/analytics/predictive/route.ts',
  'src/app/api/ai/analytics/anomalies/route.ts'
];

console.log('\n🛣️  API Routes (7 endpoints):\n');
let apiRoutesCount = 0;
apiRoutes.forEach(route => {
  const exists = fs.existsSync(path.join(process.cwd(), route));
  if (exists) apiRoutesCount++;
  console.log(`   ${exists ? '✅' : '❌'} ${route}`);
});

// Check UI components
const uiComponents = [
  'src/components/ai/ChatInterfaceV5.tsx',
  'src/components/ai/MobileAIInterfaceV5.tsx',
  'src/components/ai/InsightCards.tsx',
  'src/components/ai/AIErrorHandler.tsx',
  'src/components/ai/ChatInterface.tsx',
  'src/components/ai/MobileAIInterface.tsx'
];

console.log('\n🎨 UI Components (6 components):\n');
let uiComponentsCount = 0;
uiComponents.forEach(component => {
  const exists = fs.existsSync(path.join(process.cwd(), component));
  if (exists) uiComponentsCount++;
  console.log(`   ${exists ? '✅' : '❌'} ${component.split('/').pop()}`);
});

// Summary
console.log('\n' + '='.repeat(50));
console.log('\n📊 VERIFICATION SUMMARY:\n');

const packagesInstalled = packages.every(pkg => {
  try {
    const pkgPath = path.join(process.cwd(), 'node_modules', pkg, 'package.json');
    return fs.existsSync(pkgPath);
  } catch {
    return false;
  }
});

const coreFilesPresent = providerFiles.every(file =>
  fs.existsSync(path.join(process.cwd(), file))
);

const apiRoutesPresent = apiRoutesCount === apiRoutes.length;
const uiComponentsPresent = uiComponentsCount === uiComponents.length;

const apiKeysConfigured = hasAnthropicKey || hasOpenAIKey;

console.log(`   Packages Installed:    ${packagesInstalled ? '✅ YES' : '❌ NO'}`);
console.log(`   Core Files Present:    ${coreFilesPresent ? '✅ YES' : '❌ NO'}`);
console.log(`   API Routes Present:    ${apiRoutesPresent ? '✅ YES' : '⚠️  PARTIAL'} (${apiRoutesCount}/${apiRoutes.length})`);
console.log(`   UI Components Present: ${uiComponentsPresent ? '✅ YES' : '⚠️  PARTIAL'} (${uiComponentsCount}/${uiComponents.length})`);
console.log(`   API Keys Configured:   ${apiKeysConfigured ? '✅ YES' : '❌ NO'}`);

const allGood = packagesInstalled && coreFilesPresent && apiRoutesPresent && uiComponentsPresent && apiKeysConfigured;

console.log(`\n   Overall Status:        ${allGood ? '✅ READY' : '⚠️  NEEDS ATTENTION'}`);

console.log('\n' + '='.repeat(50));

if (allGood) {
  console.log('\n✅ AI SDK v5 Verification Complete!');
  console.log('\n📝 Test the API:');
  console.log('   curl -X POST http://localhost:3000/api/ai/chat \\');
  console.log('     -H "Content-Type: application/json" \\');
  console.log('     -d \'{"messages": [{"role": "user", "content": "Hello"}]}\'');
} else {
  console.log('\n⚠️  Please address the issues above before proceeding.');
  console.log('\n📝 Next Steps:');
  if (!apiKeysConfigured) {
    console.log('   1. Add API keys to .env.local:');
    console.log('      ANTHROPIC_API_KEY=sk-ant-...');
    console.log('      OPENAI_API_KEY=sk-...');
  }
  if (!packagesInstalled) {
    console.log('   2. Install missing packages:');
    console.log('      npm install ai @ai-sdk/anthropic @ai-sdk/openai @ai-sdk/vercel');
  }
}

console.log('\n' + '='.repeat(50) + '\n');

process.exit(allGood ? 0 : 1);
