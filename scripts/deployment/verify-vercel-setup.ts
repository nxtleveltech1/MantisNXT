#!/usr/bin/env bun
/**
 * Verify Vercel deployment setup
 * Checks configuration files, environment, and CLI availability
 */

import { existsSync } from 'fs';
import { readFileSync } from 'fs';
import { execSync } from 'child_process';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkFile(file: string, description: string): boolean {
  if (existsSync(file)) {
    log(`✅ ${description}: ${file}`, 'green');
    return true;
  } else {
    log(`❌ ${description}: ${file} (missing)`, 'red');
    return false;
  }
}

function checkVercelConfig(): boolean {
  log('\n📋 Checking Vercel Configuration Files...', 'blue');
  
  const vercelJsonExists = checkFile('vercel.json', 'Vercel config');
  const vercelIgnoreExists = checkFile('.vercelignore', 'Vercel ignore');
  
  if (vercelJsonExists) {
    try {
      const config = JSON.parse(readFileSync('vercel.json', 'utf-8'));
      log(`   Framework: ${config.framework || 'not set'}`, 'blue');
      log(`   Build Command: ${config.buildCommand || 'auto-detect'}`, 'blue');
      log(`   Install Command: ${config.installCommand || 'auto-detect'}`, 'blue');
      log(`   Regions: ${config.regions?.join(', ') || 'default'}`, 'blue');
    } catch (error) {
      log(`   ⚠️  Error reading vercel.json: ${error}`, 'yellow');
      return false;
    }
  }
  
  return vercelJsonExists && vercelIgnoreExists;
}

function checkPackageJson(): boolean {
  log('\n📦 Checking package.json...', 'blue');
  
  if (!existsSync('package.json')) {
    log('❌ package.json not found', 'red');
    return false;
  }
  
  try {
    const pkg = JSON.parse(readFileSync('package.json', 'utf-8'));
    
    log(`   Package Manager: ${pkg.packageManager || 'not specified'}`, 'blue');
    log(`   Build Script: ${pkg.scripts?.build || 'not found'}`, 'blue');
    log(`   Dev Script: ${pkg.scripts?.dev || 'not found'}`, 'blue');
    
    if (pkg.packageManager?.includes('bun')) {
      log('   ✅ Bun detected as package manager', 'green');
    } else {
      log('   ⚠️  Bun not specified in packageManager', 'yellow');
    }
    
    return true;
  } catch (error) {
    log(`   ❌ Error reading package.json: ${error}`, 'red');
    return false;
  }
}

function checkVercelCLI(): boolean {
  log('\n🔧 Checking Vercel CLI...', 'blue');
  
  try {
    const version = execSync('vercel --version', { encoding: 'utf-8', stdio: 'pipe' }).trim();
    log(`   ✅ Vercel CLI installed: ${version}`, 'green');
    
    // Check if logged in
    try {
      execSync('vercel whoami', { encoding: 'utf-8', stdio: 'pipe' });
      log('   ✅ Vercel CLI authenticated', 'green');
      return true;
    } catch {
      log('   ⚠️  Vercel CLI not authenticated. Run: vercel login', 'yellow');
      return false;
    }
  } catch {
    log('   ⚠️  Vercel CLI not installed', 'yellow');
    log('   Install with: npm install -g vercel', 'blue');
    log('   Or: bun add -g vercel', 'blue');
    return false;
  }
}

function checkGitHubActions(): boolean {
  log('\n🔄 Checking GitHub Actions Workflow...', 'blue');
  
  const workflowPath = '.github/workflows/deployment.yml';
  if (!existsSync(workflowPath)) {
    log(`   ⚠️  Workflow not found: ${workflowPath}`, 'yellow');
    return false;
  }
  
  try {
    const workflow = readFileSync(workflowPath, 'utf-8');
    
    const hasVercelAction = workflow.includes('vercel-action');
    const hasVercelToken = workflow.includes('VERCEL_TOKEN');
    const hasVercelOrgId = workflow.includes('VERCEL_ORG_ID');
    const hasVercelProjectId = workflow.includes('VERCEL_PROJECT_ID');
    
    if (hasVercelAction) {
      log('   ✅ Vercel action configured', 'green');
    } else {
      log('   ❌ Vercel action not found', 'red');
    }
    
    if (hasVercelToken) {
      log('   ✅ VERCEL_TOKEN secret referenced', 'green');
    } else {
      log('   ⚠️  VERCEL_TOKEN secret not referenced', 'yellow');
    }
    
    if (hasVercelOrgId) {
      log('   ✅ VERCEL_ORG_ID secret referenced', 'green');
    } else {
      log('   ⚠️  VERCEL_ORG_ID secret not referenced', 'yellow');
    }
    
    if (hasVercelProjectId) {
      log('   ✅ VERCEL_PROJECT_ID secret referenced', 'green');
    } else {
      log('   ⚠️  VERCEL_PROJECT_ID secret not referenced', 'yellow');
    }
    
    return hasVercelAction && hasVercelToken && hasVercelOrgId && hasVercelProjectId;
  } catch (error) {
    log(`   ❌ Error reading workflow: ${error}`, 'red');
    return false;
  }
}

function checkNextConfig(): boolean {
  log('\n⚙️  Checking Next.js Configuration...', 'blue');
  
  if (!existsSync('next.config.js')) {
    log('   ⚠️  next.config.js not found', 'yellow');
    return false;
  }
  
  try {
    const config = readFileSync('next.config.js', 'utf-8');
    
    const hasStandalone = config.includes('output: \'standalone\'');
    const hasWebpack = config.includes('webpack');
    
    if (hasStandalone) {
      log('   ✅ Standalone output configured (good for Vercel)', 'green');
    } else {
      log('   ⚠️  Standalone output not configured', 'yellow');
    }
    
    if (hasWebpack) {
      log('   ✅ Webpack configuration present', 'green');
    }
    
    return true;
  } catch (error) {
    log(`   ❌ Error reading next.config.js: ${error}`, 'red');
    return false;
  }
}

function main() {
  log('🚀 Vercel Deployment Setup Verification\n', 'blue');
  
  const results = {
    vercelConfig: checkVercelConfig(),
    packageJson: checkPackageJson(),
    vercelCLI: checkVercelCLI(),
    githubActions: checkGitHubActions(),
    nextConfig: checkNextConfig(),
  };
  
  // Vercel CLI is optional (GitHub Actions can deploy without it)
  const requiredChecks = {
    vercelConfig: results.vercelConfig,
    packageJson: results.packageJson,
    githubActions: results.githubActions,
    nextConfig: results.nextConfig,
  };
  const allRequiredPassed = Object.values(requiredChecks).every((r) => r);
  
  log('\n📊 Summary:', 'blue');
  log(`   Configuration Files: ${results.vercelConfig ? '✅' : '❌'}`, results.vercelConfig ? 'green' : 'red');
  log(`   Package.json: ${results.packageJson ? '✅' : '❌'}`, results.packageJson ? 'green' : 'red');
  log(`   Vercel CLI: ${results.vercelCLI ? '✅' : '⚠️  (optional)'}`, results.vercelCLI ? 'green' : 'yellow');
  log(`   GitHub Actions: ${results.githubActions ? '✅' : '❌'}`, results.githubActions ? 'green' : 'red');
  log(`   Next.js Config: ${results.nextConfig ? '✅' : '⚠️'}`, results.nextConfig ? 'green' : 'yellow');
  
  if (allRequiredPassed) {
    log('\n✅ All required checks passed! Vercel deployment is configured correctly.', 'green');
    if (!results.vercelCLI) {
      log('\n💡 Note: Vercel CLI is optional. GitHub Actions can deploy without it.', 'blue');
    }
    log('\nNext steps:', 'blue');
    log('1. Set up environment variables in Vercel Dashboard', 'blue');
    log('2. Connect GitHub repository to Vercel (if not already connected)', 'blue');
    log('3. Configure GitHub secrets:', 'blue');
    log('   - VERCEL_TOKEN (get from Vercel Dashboard → Settings → Tokens)', 'blue');
    log('   - VERCEL_ORG_ID (get from Vercel Dashboard → Settings → General)', 'blue');
    log('   - VERCEL_PROJECT_ID (get from Vercel Dashboard → Project Settings)', 'blue');
    log('4. Push to main branch to trigger deployment', 'blue');
    log('   Or run locally: vercel --prod (requires Vercel CLI)', 'blue');
  } else {
    log('\n⚠️  Some required checks failed. Please review the issues above.', 'yellow');
    process.exit(1);
  }
}

main();

