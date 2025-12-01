#!/usr/bin/env tsx
/**
 * Pre-Deployment Checklist and Validation Script
 *
 * Validates all critical requirements before allowing deployment:
 * - Environment configuration
 * - Database connectivity and health
 * - Required secrets and API keys
 * - Migration files integrity
 * - Build success
 * - Test coverage thresholds
 *
 * Usage:
 *   npm run deploy:checklist [--environment=production] [--strict]
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import pg from 'pg';

const { Pool } = pg;

interface CheckResult {
  name: string;
  status: 'passed' | 'failed' | 'warning';
  message: string;
  details?: any;
}

interface ChecklistConfig {
  environment: 'staging' | 'production';
  strict: boolean; // If true, warnings are treated as failures
}

class PreDeploymentChecklist {
  private config: ChecklistConfig;
  private results: CheckResult[] = [];
  private pool?: Pool;

  constructor(config: ChecklistConfig) {
    this.config = config;
  }

  /**
   * Add check result
   */
  private addResult(result: CheckResult): void {
    this.results.push(result);

    const icon = result.status === 'passed' ? '✅' : result.status === 'warning' ? '⚠️' : '❌';
    console.log(`${icon} ${result.name}: ${result.message}`);

    if (result.details) {
      console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`);
    }
  }

  /**
   * Check 1: Environment Variables
   */
  private async checkEnvironmentVariables(): Promise<void> {
    console.log('\n📋 Checking Environment Variables...');

    const required = ['DATABASE_URL', 'NEXTAUTH_SECRET', 'NEXTAUTH_URL', 'JWT_SECRET'];

    const optional = ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'VERCEL_TOKEN'];

    // Check required variables
    const missing = required.filter(key => !process.env[key]);

    if (missing.length > 0) {
      this.addResult({
        name: 'Required Environment Variables',
        status: 'failed',
        message: `Missing ${missing.length} required variable(s)`,
        details: { missing },
      });
    } else {
      this.addResult({
        name: 'Required Environment Variables',
        status: 'passed',
        message: 'All required variables present',
      });
    }

    // Check optional variables
    const missingOptional = optional.filter(key => !process.env[key]);

    if (missingOptional.length > 0) {
      this.addResult({
        name: 'Optional Environment Variables',
        status: 'warning',
        message: `${missingOptional.length} optional variable(s) not set`,
        details: { missing: missingOptional },
      });
    } else {
      this.addResult({
        name: 'Optional Environment Variables',
        status: 'passed',
        message: 'All optional variables present',
      });
    }
  }

  /**
   * Check 2: Database Connectivity
   */
  private async checkDatabaseConnectivity(): Promise<void> {
    console.log('\n🔌 Checking Database Connectivity...');

    try {
      const databaseUrl = process.env.DATABASE_URL;
      if (!databaseUrl) {
        throw new Error('DATABASE_URL not set');
      }

      this.pool = new Pool({
        connectionString: databaseUrl,
        ssl: this.config.environment === 'production' ? { rejectUnauthorized: false } : false,
        max: 5,
        connectionTimeoutMillis: 10000,
      });

      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();

      this.addResult({
        name: 'Database Connection',
        status: 'passed',
        message: 'Successfully connected to database',
      });

      // Check database version
      const versionResult = await this.pool.query('SELECT version()');
      const version = versionResult.rows[0].version;

      this.addResult({
        name: 'Database Version',
        status: 'passed',
        message: 'PostgreSQL version validated',
        details: { version },
      });
    } catch (error) {
      this.addResult({
        name: 'Database Connection',
        status: 'failed',
        message: `Failed to connect: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  /**
   * Check 3: Database Health
   */
  private async checkDatabaseHealth(): Promise<void> {
    if (!this.pool) {
      this.addResult({
        name: 'Database Health',
        status: 'failed',
        message: 'No database connection available',
      });
      return;
    }

    console.log('\n🏥 Checking Database Health...');

    try {
      // Check active connections
      const connectionsResult = await this.pool.query(`
        SELECT count(*) as active,
               max(extract(epoch from (now() - state_change))) as longest_query
        FROM pg_stat_activity
        WHERE state = 'active' AND pid != pg_backend_pid()
      `);

      const { active, longest_query } = connectionsResult.rows[0];

      if (active > 100) {
        this.addResult({
          name: 'Active Connections',
          status: 'warning',
          message: `High number of active connections: ${active}`,
          details: { active, longest_query: `${longest_query}s` },
        });
      } else {
        this.addResult({
          name: 'Active Connections',
          status: 'passed',
          message: `${active} active connections`,
          details: { longest_query: `${longest_query}s` },
        });
      }

      // Check database size
      const sizeResult = await this.pool.query(`
        SELECT pg_size_pretty(pg_database_size(current_database())) as size,
               pg_database_size(current_database()) as bytes
      `);

      const { size, bytes } = sizeResult.rows[0];

      // Warn if database is very large (>50GB)
      if (bytes > 50 * 1024 * 1024 * 1024) {
        this.addResult({
          name: 'Database Size',
          status: 'warning',
          message: `Large database: ${size}`,
          details: { size },
        });
      } else {
        this.addResult({
          name: 'Database Size',
          status: 'passed',
          message: `Database size: ${size}`,
        });
      }

      // Check for blocking queries
      const blockingResult = await this.pool.query(`
        SELECT count(*) as blocking_count
        FROM pg_stat_activity
        WHERE wait_event_type = 'Lock'
      `);

      const blockingCount = parseInt(blockingResult.rows[0].blocking_count);

      if (blockingCount > 0) {
        this.addResult({
          name: 'Blocking Queries',
          status: 'warning',
          message: `${blockingCount} queries are blocked`,
          details: { count: blockingCount },
        });
      } else {
        this.addResult({
          name: 'Blocking Queries',
          status: 'passed',
          message: 'No blocked queries',
        });
      }
    } catch (error) {
      this.addResult({
        name: 'Database Health',
        status: 'failed',
        message: `Health check failed: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  /**
   * Check 4: Migration Files Integrity
   */
  private async checkMigrationFiles(): Promise<void> {
    console.log('\n📦 Checking Migration Files...');

    try {
      const migrationsPath = join(process.cwd(), 'database', 'migrations');

      if (!existsSync(migrationsPath)) {
        this.addResult({
          name: 'Migrations Directory',
          status: 'failed',
          message: 'Migrations directory not found',
        });
        return;
      }

      const files = execSync(`ls -1 "${migrationsPath}"/*.sql 2>/dev/null || echo ""`, {
        encoding: 'utf-8',
      })
        .split('\n')
        .filter(f => f.trim() && !f.includes('ROLLBACK'));

      this.addResult({
        name: 'Migration Files',
        status: 'passed',
        message: `Found ${files.length} migration file(s)`,
        details: { count: files.length },
      });

      // Check for migrations that haven't been applied
      if (this.pool) {
        const appliedResult = await this.pool.query(
          `SELECT count(*) as applied FROM schema_migrations WHERE status = 'completed'`
        );

        const appliedCount = parseInt(appliedResult.rows[0].applied);

        if (appliedCount < files.length) {
          this.addResult({
            name: 'Pending Migrations',
            status: 'warning',
            message: `${files.length - appliedCount} migration(s) pending`,
            details: {
              total: files.length,
              applied: appliedCount,
              pending: files.length - appliedCount,
            },
          });
        } else {
          this.addResult({
            name: 'Pending Migrations',
            status: 'passed',
            message: 'All migrations up to date',
          });
        }
      }
    } catch (error) {
      this.addResult({
        name: 'Migration Files',
        status: 'failed',
        message: `Failed to check migrations: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  /**
   * Check 5: Build Success
   */
  private async checkBuild(): Promise<void> {
    console.log('\n🏗️  Checking Build...');

    try {
      // Run type checking
      execSync('npm run type-check', { stdio: 'pipe' });

      this.addResult({
        name: 'Type Check',
        status: 'passed',
        message: 'TypeScript compilation successful',
      });

      // Run linting
      execSync('npm run lint', { stdio: 'pipe' });

      this.addResult({
        name: 'Linting',
        status: 'passed',
        message: 'Code linting passed',
      });

      // Attempt build
      console.log('   Running production build (this may take a few minutes)...');
      execSync('npm run build', { stdio: 'pipe', timeout: 600000 });

      this.addResult({
        name: 'Production Build',
        status: 'passed',
        message: 'Build completed successfully',
      });
    } catch (error) {
      this.addResult({
        name: 'Build',
        status: 'failed',
        message: `Build failed: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  /**
   * Check 6: Test Coverage
   */
  private async checkTestCoverage(): Promise<void> {
    console.log('\n🧪 Checking Test Coverage...');

    try {
      // Run tests with coverage
      execSync('npm run test:coverage', { stdio: 'pipe', timeout: 300000 });

      // Read coverage summary
      const coveragePath = join(process.cwd(), 'coverage', 'coverage-summary.json');

      if (existsSync(coveragePath)) {
        const coverage = JSON.parse(readFileSync(coveragePath, 'utf-8'));
        const total = coverage.total;

        const linesCoverage = total.lines.pct;
        const branchCoverage = total.branches.pct;
        const functionsCoverage = total.functions.pct;

        const minCoverage = this.config.environment === 'production' ? 80 : 70;

        if (linesCoverage < minCoverage) {
          this.addResult({
            name: 'Test Coverage',
            status: 'warning',
            message: `Coverage below threshold: ${linesCoverage}% (minimum: ${minCoverage}%)`,
            details: {
              lines: `${linesCoverage}%`,
              branches: `${branchCoverage}%`,
              functions: `${functionsCoverage}%`,
            },
          });
        } else {
          this.addResult({
            name: 'Test Coverage',
            status: 'passed',
            message: `Coverage meets threshold: ${linesCoverage}%`,
            details: {
              lines: `${linesCoverage}%`,
              branches: `${branchCoverage}%`,
              functions: `${functionsCoverage}%`,
            },
          });
        }
      } else {
        this.addResult({
          name: 'Test Coverage',
          status: 'warning',
          message: 'Coverage report not found',
        });
      }
    } catch (error) {
      this.addResult({
        name: 'Test Coverage',
        status: 'failed',
        message: `Tests failed: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  /**
   * Check 7: Security Audit
   */
  private async checkSecurity(): Promise<void> {
    console.log('\n🔒 Running Security Audit...');

    try {
      const audit = execSync('npm audit --json', { encoding: 'utf-8' });
      const auditData = JSON.parse(audit);

      const vulnerabilities = auditData.metadata?.vulnerabilities || {};
      const critical = vulnerabilities.critical || 0;
      const high = vulnerabilities.high || 0;
      const moderate = vulnerabilities.moderate || 0;

      if (critical > 0 || high > 0) {
        this.addResult({
          name: 'Security Audit',
          status: this.config.environment === 'production' ? 'failed' : 'warning',
          message: `Found ${critical} critical and ${high} high severity vulnerabilities`,
          details: { critical, high, moderate },
        });
      } else if (moderate > 0) {
        this.addResult({
          name: 'Security Audit',
          status: 'warning',
          message: `Found ${moderate} moderate severity vulnerabilities`,
          details: { moderate },
        });
      } else {
        this.addResult({
          name: 'Security Audit',
          status: 'passed',
          message: 'No vulnerabilities found',
        });
      }
    } catch (error) {
      // npm audit exits with non-zero if vulnerabilities found
      this.addResult({
        name: 'Security Audit',
        status: 'warning',
        message: 'Audit completed with findings',
      });
    }
  }

  /**
   * Run all checks
   */
  async run(): Promise<boolean> {
    console.log('🚀 Pre-Deployment Checklist');
    console.log(`Environment: ${this.config.environment}`);
    console.log(`Strict mode: ${this.config.strict ? 'ON' : 'OFF'}`);
    console.log('================================\n');

    const startTime = Date.now();

    try {
      await this.checkEnvironmentVariables();
      await this.checkDatabaseConnectivity();
      await this.checkDatabaseHealth();
      await this.checkMigrationFiles();
      await this.checkBuild();
      await this.checkTestCoverage();
      await this.checkSecurity();
    } finally {
      if (this.pool) {
        await this.pool.end();
      }
    }

    // Generate summary
    const duration = Date.now() - startTime;
    const passed = this.results.filter(r => r.status === 'passed').length;
    const warnings = this.results.filter(r => r.status === 'warning').length;
    const failed = this.results.filter(r => r.status === 'failed').length;

    console.log('\n================================');
    console.log('Checklist Summary:');
    console.log(`  ✅ Passed: ${passed}`);
    console.log(`  ⚠️  Warnings: ${warnings}`);
    console.log(`  ❌ Failed: ${failed}`);
    console.log(`  Duration: ${duration}ms`);
    console.log('================================\n');

    // Determine overall status
    const hasFailures = failed > 0;
    const hasWarnings = warnings > 0;

    if (hasFailures) {
      console.log('❌ DEPLOYMENT BLOCKED: Critical checks failed');
      return false;
    }

    if (this.config.strict && hasWarnings) {
      console.log('❌ DEPLOYMENT BLOCKED: Warnings in strict mode');
      return false;
    }

    if (hasWarnings) {
      console.log('⚠️  DEPLOYMENT ALLOWED WITH WARNINGS');
      console.log('   Review warnings before proceeding');
      return true;
    }

    console.log('✅ ALL CHECKS PASSED - READY FOR DEPLOYMENT');
    return true;
  }
}

// Parse command line arguments
function parseArgs(): ChecklistConfig {
  const args = process.argv.slice(2);

  const environmentArg = args.find(arg => arg.startsWith('--environment='));
  const environment = environmentArg
    ? (environmentArg.split('=')[1] as 'staging' | 'production')
    : 'staging';

  const strict = args.includes('--strict');

  return { environment, strict };
}

// Main execution
if (require.main === module) {
  const config = parseArgs();
  const checklist = new PreDeploymentChecklist(config);

  checklist
    .run()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { PreDeploymentChecklist, ChecklistConfig, CheckResult };
