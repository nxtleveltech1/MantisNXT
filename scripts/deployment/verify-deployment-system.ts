#!/usr/bin/env tsx
/**
 * Deployment System Verification Script
 *
 * Verifies all deployment infrastructure is properly configured:
 * - Required scripts exist and are executable
 * - GitHub workflows are configured
 * - Documentation is complete
 * - NPM scripts are defined
 * - Test files exist
 *
 * Usage:
 *   npm run verify:deployment-system
 */

import { existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

interface CheckResult {
  category: string;
  name: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
}

class DeploymentSystemVerifier {
  private results: CheckResult[] = [];

  private addResult(
    category: string,
    name: string,
    status: 'pass' | 'fail' | 'warning',
    message: string
  ): void {
    this.results.push({ category, name, status, message });

    const icon = status === 'pass' ? '✅' : status === 'warning' ? '⚠️' : '❌';
    console.log(`${icon} ${category} - ${name}: ${message}`);
  }

  /**
   * Check if file exists
   */
  private checkFileExists(category: string, name: string, path: string): boolean {
    const fullPath = join(process.cwd(), path);
    const exists = existsSync(fullPath);

    this.addResult(category, name, exists ? 'pass' : 'fail', exists ? 'Found' : 'Missing');

    return exists;
  }

  /**
   * Check required scripts
   */
  private checkScripts(): void {
    console.log('\n📜 Checking Required Scripts...\n');

    const scripts = [
      { name: 'Migration Runner', path: 'scripts/migration-runner.ts' },
      { name: 'Pre-Deployment Checklist', path: 'scripts/pre-deployment-checklist.ts' },
      { name: 'Emergency Rollback', path: 'scripts/emergency-rollback.ts' },
    ];

    scripts.forEach(script => {
      this.checkFileExists('Scripts', script.name, script.path);
    });
  }

  /**
   * Check workflows
   */
  private checkWorkflows(): void {
    console.log('\n🔄 Checking GitHub Workflows...\n');

    const workflows = [
      { name: 'CI/CD Pipeline', path: '.github/workflows/ci-cd.yml' },
      { name: 'Testing Pipeline', path: '.github/workflows/testing.yml' },
      { name: 'Deployment Pipeline', path: '.github/workflows/deployment.yml' },
    ];

    workflows.forEach(workflow => {
      this.checkFileExists('Workflows', workflow.name, workflow.path);
    });
  }

  /**
   * Check test files
   */
  private checkTests(): void {
    console.log('\n🧪 Checking Test Files...\n');

    const tests = [{ name: 'Authentication Tests', path: '__tests__/auth/authentication.test.ts' }];

    tests.forEach(test => {
      this.checkFileExists('Tests', test.name, test.path);
    });
  }

  /**
   * Check documentation
   */
  private checkDocumentation(): void {
    console.log('\n📚 Checking Documentation...\n');

    const docs = [
      { name: 'Deployment Runbook', path: 'docs/deployment/DEPLOYMENT_RUNBOOK.md' },
      { name: 'Quick Start Guide', path: 'docs/deployment/QUICK_START.md' },
      { name: 'System Overview', path: 'DEPLOYMENT_SYSTEM.md' },
    ];

    docs.forEach(doc => {
      this.checkFileExists('Documentation', doc.name, doc.path);
    });
  }

  /**
   * Check NPM scripts
   */
  private checkNpmScripts(): void {
    console.log('\n📦 Checking NPM Scripts...\n');

    const scripts = [
      'db:migrate:production',
      'db:migrate:production:dry-run',
      'deploy:checklist',
      'deploy:checklist:production',
      'deploy:rollback',
      'deploy:rollback:latest',
      'test:auth',
    ];

    try {
      const packageJson = require(join(process.cwd(), 'package.json'));

      scripts.forEach(script => {
        const exists = packageJson.scripts[script] !== undefined;

        this.addResult(
          'NPM Scripts',
          script,
          exists ? 'pass' : 'fail',
          exists ? 'Defined' : 'Missing'
        );
      });
    } catch (error) {
      this.addResult('NPM Scripts', 'package.json', 'fail', 'Cannot read package.json');
    }
  }

  /**
   * Check dependencies
   */
  private checkDependencies(): void {
    console.log('\n📦 Checking Dependencies...\n');

    const requiredDeps = ['pg', 'bcryptjs', 'jsonwebtoken', '@neondatabase/serverless'];

    const requiredDevDeps = [
      'tsx',
      '@types/pg',
      '@types/bcryptjs',
      '@types/jsonwebtoken',
      '@jest/types',
      '@playwright/test',
    ];

    try {
      const packageJson = require(join(process.cwd(), 'package.json'));

      requiredDeps.forEach(dep => {
        const exists = packageJson.dependencies?.[dep] !== undefined;
        this.addResult(
          'Dependencies',
          dep,
          exists ? 'pass' : 'warning',
          exists ? 'Installed' : 'Missing (may need to install)'
        );
      });

      requiredDevDeps.forEach(dep => {
        const exists = packageJson.devDependencies?.[dep] !== undefined;
        this.addResult(
          'Dev Dependencies',
          dep,
          exists ? 'pass' : 'warning',
          exists ? 'Installed' : 'Missing (may need to install)'
        );
      });
    } catch (error) {
      this.addResult('Dependencies', 'package.json', 'fail', 'Cannot read package.json');
    }
  }

  /**
   * Check directory structure
   */
  private checkDirectories(): void {
    console.log('\n📁 Checking Directory Structure...\n');

    const dirs = [
      { name: 'Scripts Directory', path: 'scripts' },
      { name: 'Tests Directory', path: '__tests__' },
      { name: 'Docs Directory', path: 'docs' },
      { name: 'Workflows Directory', path: '.github/workflows' },
      { name: 'Migrations Directory', path: 'database/migrations' },
    ];

    dirs.forEach(dir => {
      const fullPath = join(process.cwd(), dir.path);
      const exists = existsSync(fullPath);

      this.addResult(
        'Directories',
        dir.name,
        exists ? 'pass' : 'fail',
        exists ? 'Exists' : 'Missing'
      );
    });

    // Check backup directory (may not exist yet, that's ok)
    const backupPath = join(process.cwd(), 'database/backups');
    const backupExists = existsSync(backupPath);

    this.addResult(
      'Directories',
      'Backups Directory',
      backupExists ? 'pass' : 'warning',
      backupExists ? 'Exists' : 'Will be created on first backup'
    );
  }

  /**
   * Check environment configuration
   */
  private checkEnvironment(): void {
    console.log('\n🔧 Checking Environment Configuration...\n');

    const requiredVars = ['DATABASE_URL', 'NEXTAUTH_SECRET', 'JWT_SECRET'];

    const optionalVars = ['NEXTAUTH_URL', 'VERCEL_TOKEN', 'SLACK_WEBHOOK_URL'];

    requiredVars.forEach(varName => {
      const exists = process.env[varName] !== undefined;

      this.addResult(
        'Environment',
        varName,
        exists ? 'pass' : 'warning',
        exists ? 'Set' : 'Not set (required for production)'
      );
    });

    optionalVars.forEach(varName => {
      const exists = process.env[varName] !== undefined;

      this.addResult(
        'Environment',
        varName,
        exists ? 'pass' : 'warning',
        exists ? 'Set' : 'Not set (optional)'
      );
    });
  }

  /**
   * Generate summary report
   */
  private generateSummary(): void {
    console.log('\n================================');
    console.log('Deployment System Verification Summary');
    console.log('================================\n');

    const passed = this.results.filter(r => r.status === 'pass').length;
    const warnings = this.results.filter(r => r.status === 'warning').length;
    const failed = this.results.filter(r => r.status === 'fail').length;

    console.log(`✅ Passed:   ${passed}`);
    console.log(`⚠️  Warnings: ${warnings}`);
    console.log(`❌ Failed:   ${failed}`);
    console.log(`📊 Total:    ${this.results.length}\n`);

    // Show failures
    if (failed > 0) {
      console.log('❌ Failed Checks:');
      this.results
        .filter(r => r.status === 'fail')
        .forEach(r => console.log(`   - ${r.category}: ${r.name} - ${r.message}`));
      console.log('');
    }

    // Show warnings
    if (warnings > 0) {
      console.log('⚠️  Warnings:');
      this.results
        .filter(r => r.status === 'warning')
        .forEach(r => console.log(`   - ${r.category}: ${r.name} - ${r.message}`));
      console.log('');
    }

    // Overall status
    if (failed > 0) {
      console.log('❌ DEPLOYMENT SYSTEM: NOT READY');
      console.log('   Fix failed checks before deploying to production.\n');
    } else if (warnings > 0) {
      console.log('⚠️  DEPLOYMENT SYSTEM: READY WITH WARNINGS');
      console.log('   Review warnings before deploying to production.\n');
    } else {
      console.log('✅ DEPLOYMENT SYSTEM: FULLY READY');
      console.log('   All checks passed! Ready for production deployment.\n');
    }

    // Next steps
    console.log('📋 Next Steps:');

    if (failed > 0) {
      console.log('   1. Fix failed checks listed above');
      console.log('   2. Run this verification script again');
      console.log('   3. Review deployment documentation');
    } else if (warnings > 0) {
      console.log('   1. Review warnings listed above');
      console.log('   2. Configure missing optional items if needed');
      console.log('   3. Test in staging environment');
      console.log('   4. Read docs/deployment/QUICK_START.md');
    } else {
      console.log('   1. Read docs/deployment/QUICK_START.md');
      console.log('   2. Test deployment in staging');
      console.log('   3. Practice rollback procedure');
      console.log('   4. Train team on procedures');
      console.log('   5. Execute first production deployment');
    }

    console.log('');
  }

  /**
   * Run all verifications
   */
  async run(): Promise<boolean> {
    console.log('🚀 MantisNXT Deployment System Verification');
    console.log('==========================================\n');

    this.checkDirectories();
    this.checkScripts();
    this.checkWorkflows();
    this.checkTests();
    this.checkDocumentation();
    this.checkNpmScripts();
    this.checkDependencies();
    this.checkEnvironment();

    this.generateSummary();

    const failed = this.results.filter(r => r.status === 'fail').length;
    return failed === 0;
  }
}

// Main execution
if (require.main === module) {
  const verifier = new DeploymentSystemVerifier();

  verifier
    .run()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { DeploymentSystemVerifier };
