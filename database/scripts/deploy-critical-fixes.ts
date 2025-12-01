#!/usr/bin/env tsx
/**
 * Critical Database Fixes Deployment Script
 *
 * Deploys:
 * - 005_fix_analytics_sequences.sql (Analytics auto-increment fix)
 * - 006_add_supplier_contact_person.sql (Supplier contact_person column)
 *
 * Usage:
 *   tsx database/scripts/deploy-critical-fixes.ts
 *   npm run db:deploy:critical
 *
 * Environment:
 *   Requires DATABASE_URL or NEON_SPP_DATABASE_URL
 */

import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

interface MigrationResult {
  success: boolean;
  migration: string;
  error?: string;
  duration?: number;
}

class CriticalFixesDeployer {
  private pool: Pool;
  private migrations = ['005_fix_analytics_sequences.sql', '006_add_supplier_contact_person.sql'];

  constructor() {
    const connectionString = process.env.NEON_SPP_DATABASE_URL || process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error(
        'Database connection string not found. Set DATABASE_URL or NEON_SPP_DATABASE_URL'
      );
    }

    this.pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }

  private log(message: string, color: keyof typeof colors = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  private async testConnection(): Promise<boolean> {
    try {
      const client = await this.pool.connect();
      const result = await client.query(
        'SELECT NOW() as current_time, current_database() as db_name'
      );
      client.release();

      this.log('\n✓ Database Connection Verified', 'green');
      this.log(`  Database: ${result.rows[0].db_name}`, 'cyan');
      this.log(`  Time: ${result.rows[0].current_time}`, 'cyan');
      return true;
    } catch (error) {
      this.log('\n✗ Database Connection Failed', 'red');
      this.log(`  Error: ${error instanceof Error ? error.message : String(error)}`, 'red');
      return false;
    }
  }

  private async executeMigration(filename: string): Promise<MigrationResult> {
    const startTime = Date.now();
    const migrationPath = join(process.cwd(), 'database', 'migrations', filename);

    try {
      this.log(`\n→ Deploying ${filename}...`, 'blue');

      const sql = readFileSync(migrationPath, 'utf-8');

      const client = await this.pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('COMMIT');

        const duration = Date.now() - startTime;
        this.log(`  ✓ Success (${duration}ms)`, 'green');

        return { success: true, migration: filename, duration };
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.log(`  ✗ Failed (${duration}ms)`, 'red');
      this.log(`  Error: ${errorMessage}`, 'red');

      return { success: false, migration: filename, error: errorMessage, duration };
    }
  }

  private async verifyMigrations(): Promise<boolean> {
    this.log('\n→ Verifying migrations...', 'blue');

    const client = await this.pool.connect();
    try {
      // Verify analytics sequences
      const seqCheck = await client.query(`
        SELECT
          'analytics_anomalies' as table_name,
          pg_get_serial_sequence('core.analytics_anomalies', 'anomaly_id') as sequence_name,
          EXISTS(
            SELECT 1 FROM information_schema.sequences
            WHERE sequence_schema = 'core'
            AND sequence_name = 'analytics_anomalies_anomaly_id_seq'
          ) as sequence_exists
        UNION ALL
        SELECT
          'analytics_predictions' as table_name,
          pg_get_serial_sequence('core.analytics_predictions', 'prediction_id') as sequence_name,
          EXISTS(
            SELECT 1 FROM information_schema.sequences
            WHERE sequence_schema = 'core'
            AND sequence_name = 'analytics_predictions_prediction_id_seq'
          ) as sequence_exists
      `);

      // Verify contact_person column
      const colCheck = await client.query(`
        SELECT
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_schema = 'core'
          AND table_name = 'supplier'
          AND column_name = 'contact_person'
      `);

      let allPassed = true;

      // Check sequences
      for (const row of seqCheck.rows) {
        if (row.sequence_exists) {
          this.log(`  ✓ Sequence ${row.sequence_name} exists`, 'green');
        } else {
          this.log(`  ✗ Sequence ${row.sequence_name} missing`, 'red');
          allPassed = false;
        }
      }

      // Check contact_person column
      if (colCheck.rows.length > 0) {
        const col = colCheck.rows[0];
        this.log(`  ✓ Column contact_person exists (${col.data_type})`, 'green');

        // Verify GIN index exists
        const idxCheck = await client.query(`
          SELECT indexname
          FROM pg_indexes
          WHERE schemaname = 'core'
            AND tablename = 'supplier'
            AND indexname = 'idx_supplier_contact_person_gin'
        `);

        if (idxCheck.rows.length > 0) {
          this.log(`  ✓ GIN index idx_supplier_contact_person_gin exists`, 'green');
        } else {
          this.log(`  ✗ GIN index idx_supplier_contact_person_gin missing`, 'yellow');
        }
      } else {
        this.log(`  ✗ Column contact_person missing`, 'red');
        allPassed = false;
      }

      return allPassed;
    } finally {
      client.release();
    }
  }

  public async deploy(): Promise<void> {
    this.log('\n' + '='.repeat(60), 'bright');
    this.log('  CRITICAL DATABASE FIXES DEPLOYMENT', 'bright');
    this.log('='.repeat(60), 'bright');

    // Test connection
    const connected = await this.testConnection();
    if (!connected) {
      process.exit(1);
    }

    // Deploy migrations
    this.log('\n' + '-'.repeat(60), 'cyan');
    this.log('  DEPLOYING MIGRATIONS', 'cyan');
    this.log('-'.repeat(60), 'cyan');

    const results: MigrationResult[] = [];
    let totalDuration = 0;

    for (const migration of this.migrations) {
      const result = await this.executeMigration(migration);
      results.push(result);
      if (result.duration) {
        totalDuration += result.duration;
      }

      // Stop on first failure
      if (!result.success) {
        this.log('\n✗ Deployment stopped due to error', 'red');
        break;
      }
    }

    // Verify all migrations
    if (results.every(r => r.success)) {
      this.log('\n' + '-'.repeat(60), 'cyan');
      this.log('  VERIFICATION', 'cyan');
      this.log('-'.repeat(60), 'cyan');

      const verified = await this.verifyMigrations();

      if (verified) {
        this.log('\n' + '='.repeat(60), 'green');
        this.log('  ✓ ALL CRITICAL FIXES DEPLOYED SUCCESSFULLY', 'green');
        this.log('='.repeat(60), 'green');
        this.log(`\n  Total Duration: ${totalDuration}ms`, 'cyan');
      } else {
        this.log('\n' + '='.repeat(60), 'yellow');
        this.log('  ⚠ Deployment completed with warnings', 'yellow');
        this.log('='.repeat(60), 'yellow');
      }
    } else {
      this.log('\n' + '='.repeat(60), 'red');
      this.log('  ✗ DEPLOYMENT FAILED', 'red');
      this.log('='.repeat(60), 'red');

      const failed = results.filter(r => !r.success);
      this.log('\nFailed migrations:', 'red');
      failed.forEach(f => {
        this.log(`  - ${f.migration}: ${f.error}`, 'red');
      });

      process.exit(1);
    }

    // Summary
    this.log('\n' + '-'.repeat(60), 'cyan');
    this.log('  DEPLOYMENT SUMMARY', 'cyan');
    this.log('-'.repeat(60), 'cyan');

    results.forEach(r => {
      const status = r.success ? '✓' : '✗';
      const color = r.success ? 'green' : 'red';
      this.log(`  ${status} ${r.migration} (${r.duration}ms)`, color);
    });

    this.log('');
  }

  public async close(): Promise<void> {
    await this.pool.end();
  }
}

// Main execution
async function main() {
  const deployer = new CriticalFixesDeployer();

  try {
    await deployer.deploy();
  } catch (error) {
    console.error('\n' + colors.red + '✗ Deployment failed:', colors.reset);
    console.error(
      colors.red + (error instanceof Error ? error.message : String(error)) + colors.reset
    );
    process.exit(1);
  } finally {
    await deployer.close();
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { CriticalFixesDeployer };
