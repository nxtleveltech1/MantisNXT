#!/usr/bin/env tsx
/**
 * Critical Database Fixes Verification Script
 *
 * Verifies:
 * - Analytics sequences exist and work correctly
 * - Supplier contact_person column exists with correct type and index
 * - Auto-increment functionality works for analytics tables
 * - Data integrity is maintained
 *
 * Usage:
 *   tsx database/scripts/verify-critical-fixes.ts
 *   npm run db:verify:critical
 *
 * Environment:
 *   Requires DATABASE_URL or NEON_SPP_DATABASE_URL
 */

import { Pool } from 'pg';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

interface VerificationResult {
  test: string;
  passed: boolean;
  details?: string;
  warning?: boolean;
}

class CriticalFixesVerifier {
  private pool: Pool;
  private results: VerificationResult[] = [];

  constructor() {
    const connectionString =
      process.env.NEON_SPP_DATABASE_URL ||
      process.env.DATABASE_URL;

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

  private addResult(test: string, passed: boolean, details?: string, warning = false) {
    this.results.push({ test, passed, details, warning });

    const status = passed ? '✓' : (warning ? '⚠' : '✗');
    const statusColor = passed ? 'green' : (warning ? 'yellow' : 'red');

    this.log(`  ${status} ${test}`, statusColor);
    if (details) {
      this.log(`    ${details}`, 'cyan');
    }
  }

  private async testConnection(): Promise<void> {
    this.log('\n→ Testing database connection...', 'blue');

    try {
      const client = await this.pool.connect();
      const result = await client.query(`
        SELECT
          NOW() as current_time,
          current_database() as db_name,
          version() as db_version
      `);
      client.release();

      this.addResult(
        'Database Connection',
        true,
        `Connected to ${result.rows[0].db_name}`
      );

      this.log(`  Database: ${result.rows[0].db_name}`, 'cyan');
      this.log(`  Version: ${result.rows[0].db_version.split(' ')[0]} ${result.rows[0].db_version.split(' ')[1]}`, 'cyan');
    } catch (error) {
      this.addResult(
        'Database Connection',
        false,
        error instanceof Error ? error.message : String(error)
      );
      throw error;
    }
  }

  private async verifyAnalyticsSequences(): Promise<void> {
    this.log('\n→ Verifying analytics sequences...', 'blue');

    const client = await this.pool.connect();
    try {
      // Check if sequences exist
      const seqResult = await client.query(`
        SELECT
          sequence_name,
          data_type,
          start_value,
          minimum_value,
          maximum_value,
          increment
        FROM information_schema.sequences
        WHERE sequence_schema = 'core'
          AND sequence_name IN (
            'analytics_anomalies_anomaly_id_seq',
            'analytics_predictions_prediction_id_seq'
          )
        ORDER BY sequence_name
      `);

      if (seqResult.rows.length === 2) {
        this.addResult(
          'Analytics Sequences Exist',
          true,
          `Found ${seqResult.rows.length}/2 sequences`
        );

        for (const seq of seqResult.rows) {
          this.addResult(
            `Sequence ${seq.sequence_name}`,
            true,
            `Type: ${seq.data_type}, Increment: ${seq.increment}`
          );
        }
      } else {
        this.addResult(
          'Analytics Sequences Exist',
          false,
          `Found ${seqResult.rows.length}/2 sequences`
        );
        return;
      }

      // Check if sequences are linked to tables
      const linkResult = await client.query(`
        SELECT
          'analytics_anomalies' as table_name,
          'anomaly_id' as column_name,
          pg_get_serial_sequence('core.analytics_anomalies', 'anomaly_id') as linked_sequence
        UNION ALL
        SELECT
          'analytics_predictions' as table_name,
          'prediction_id' as column_name,
          pg_get_serial_sequence('core.analytics_predictions', 'prediction_id') as linked_sequence
      `);

      let allLinked = true;
      for (const row of linkResult.rows) {
        const isLinked = row.linked_sequence !== null;
        if (!isLinked) {
          allLinked = false;
        }
        this.addResult(
          `Sequence linked to ${row.table_name}.${row.column_name}`,
          isLinked,
          isLinked ? row.linked_sequence : 'Not linked'
        );
      }

      // Test auto-increment functionality
      if (allLinked) {
        await this.testAutoIncrement(client);
      }
    } finally {
      client.release();
    }
  }

  private async testAutoIncrement(client: unknown): Promise<void> {
    this.log('\n→ Testing auto-increment functionality...', 'blue');

    // Test analytics_anomalies
    try {
      const anomalyResult = await client.query(`
        INSERT INTO core.analytics_anomalies (
          type, severity, entity_type, entity_id, description
        ) VALUES (
          'test', 'low', 'system', 1, 'Auto-increment verification test'
        ) RETURNING anomaly_id
      `);

      const anomalyId = anomalyResult.rows[0].anomaly_id;

      await client.query(`
        DELETE FROM core.analytics_anomalies WHERE anomaly_id = $1
      `, [anomalyId]);

      this.addResult(
        'Analytics Anomalies Auto-Increment',
        true,
        `Generated ID: ${anomalyId}`
      );
    } catch (error) {
      this.addResult(
        'Analytics Anomalies Auto-Increment',
        false,
        error instanceof Error ? error.message : String(error)
      );
    }

    // Test analytics_predictions
    try {
      const predictionResult = await client.query(`
        INSERT INTO core.analytics_predictions (
          model_type, entity_type, entity_id, prediction_type, prediction_date
        ) VALUES (
          'test', 'system', 1, 'test', NOW()
        ) RETURNING prediction_id
      `);

      const predictionId = predictionResult.rows[0].prediction_id;

      await client.query(`
        DELETE FROM core.analytics_predictions WHERE prediction_id = $1
      `, [predictionId]);

      this.addResult(
        'Analytics Predictions Auto-Increment',
        true,
        `Generated ID: ${predictionId}`
      );
    } catch (error) {
      this.addResult(
        'Analytics Predictions Auto-Increment',
        false,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  private async verifyContactPersonColumn(): Promise<void> {
    this.log('\n→ Verifying supplier contact_person column...', 'blue');

    const client = await this.pool.connect();
    try {
      // Check column exists
      const colResult = await client.query(`
        SELECT
          column_name,
          data_type,
          is_nullable,
          column_default,
          character_maximum_length
        FROM information_schema.columns
        WHERE table_schema = 'core'
          AND table_name = 'supplier'
          AND column_name = 'contact_person'
      `);

      if (colResult.rows.length > 0) {
        const col = colResult.rows[0];
        this.addResult(
          'Contact Person Column Exists',
          true,
          `Type: ${col.data_type}, Nullable: ${col.is_nullable}, Default: ${col.column_default}`
        );

        // Verify data type is JSONB
        if (col.data_type === 'jsonb') {
          this.addResult('Contact Person Data Type', true, 'JSONB');
        } else {
          this.addResult(
            'Contact Person Data Type',
            false,
            `Expected JSONB, got ${col.data_type}`,
            true
          );
        }
      } else {
        this.addResult('Contact Person Column Exists', false, 'Column not found');
        return;
      }

      // Check GIN index exists
      const idxResult = await client.query(`
        SELECT
          indexname,
          indexdef
        FROM pg_indexes
        WHERE schemaname = 'core'
          AND tablename = 'supplier'
          AND indexname = 'idx_supplier_contact_person_gin'
      `);

      if (idxResult.rows.length > 0) {
        this.addResult(
          'Contact Person GIN Index',
          true,
          'idx_supplier_contact_person_gin'
        );
      } else {
        this.addResult(
          'Contact Person GIN Index',
          false,
          'Index not found',
          true // Warning, not critical
        );
      }

      // Test JSONB operations
      await this.testJSONBOperations(client);

      // Check for NULL values
      const nullCheck = await client.query(`
        SELECT COUNT(*) as null_count
        FROM core.supplier
        WHERE contact_person IS NULL
      `);

      const nullCount = parseInt(nullCheck.rows[0].null_count);
      this.addResult(
        'Contact Person NULL Values',
        nullCount === 0,
        nullCount === 0 ? 'No NULL values found' : `Found ${nullCount} NULL values`,
        nullCount > 0
      );
    } finally {
      client.release();
    }
  }

  private async testJSONBOperations(client: unknown): Promise<void> {
    this.log('\n→ Testing JSONB operations...', 'blue');

    try {
      // Test JSONB insert and query
      const testData = {
        name: 'Test Contact',
        email: 'test@example.com',
        phone: '+1-555-0100',
        title: 'Test Manager'
      };

      // Create test supplier
      const insertResult = await client.query(`
        INSERT INTO core.supplier (
          supplier_name,
          contact_person,
          created_by,
          organization_id
        ) VALUES (
          'Test Supplier for Verification',
          $1::jsonb,
          1,
          1
        ) RETURNING supplier_id
      `, [JSON.stringify(testData)]);

      const supplierId = insertResult.rows[0].supplier_id;

      // Query JSONB field
      const queryResult = await client.query(`
        SELECT
          contact_person,
          contact_person->>'name' as contact_name,
          contact_person->>'email' as contact_email
        FROM core.supplier
        WHERE supplier_id = $1
      `, [supplierId]);

      // Verify data
      const retrieved = queryResult.rows[0];
      const dataMatches =
        retrieved.contact_name === testData.name &&
        retrieved.contact_email === testData.email;

      this.addResult(
        'JSONB Insert/Query Operations',
        dataMatches,
        dataMatches ? 'Data correctly stored and retrieved' : 'Data mismatch'
      );

      // Clean up test data
      await client.query(`
        DELETE FROM core.supplier WHERE supplier_id = $1
      `, [supplierId]);

      this.addResult('Test Data Cleanup', true, 'Test supplier removed');
    } catch (error) {
      this.addResult(
        'JSONB Operations',
        false,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  private async verifyRLSPolicies(): Promise<void> {
    this.log('\n→ Verifying RLS policies (optional)...', 'blue');

    const client = await this.pool.connect();
    try {
      // Check if RLS is enabled on key tables
      const rlsResult = await client.query(`
        SELECT
          schemaname,
          tablename,
          rowsecurity
        FROM pg_tables
        WHERE schemaname = 'core'
          AND tablename IN (
            'supplier',
            'analytics_anomalies',
            'analytics_predictions'
          )
        ORDER BY tablename
      `);

      for (const row of rlsResult.rows) {
        this.addResult(
          `RLS on ${row.tablename}`,
          true,
          row.rowsecurity ? 'Enabled' : 'Disabled (OK for single-tenant)',
          !row.rowsecurity
        );
      }

      // List RLS policies if any
      const policiesResult = await client.query(`
        SELECT
          schemaname,
          tablename,
          policyname,
          permissive,
          roles,
          cmd
        FROM pg_policies
        WHERE schemaname = 'core'
          AND tablename IN (
            'supplier',
            'analytics_anomalies',
            'analytics_predictions'
          )
        ORDER BY tablename, policyname
      `);

      if (policiesResult.rows.length > 0) {
        this.addResult(
          'RLS Policies Configured',
          true,
          `Found ${policiesResult.rows.length} policies`
        );

        for (const policy of policiesResult.rows) {
          this.log(`    • ${policy.tablename}.${policy.policyname} (${policy.cmd})`, 'cyan');
        }
      } else {
        this.addResult(
          'RLS Policies Configured',
          true,
          'No policies found (single-tenant mode)',
          true
        );
      }
    } finally {
      client.release();
    }
  }

  private printSummary(): void {
    this.log('\n' + '='.repeat(60), 'cyan');
    this.log('  VERIFICATION SUMMARY', 'bright');
    this.log('='.repeat(60), 'cyan');

    const passed = this.results.filter(r => r.passed && !r.warning).length;
    const warnings = this.results.filter(r => r.warning).length;
    const failed = this.results.filter(r => !r.passed && !r.warning).length;
    const total = this.results.length;

    this.log(`\n  Total Tests: ${total}`, 'cyan');
    this.log(`  Passed: ${passed}`, 'green');
    if (warnings > 0) {
      this.log(`  Warnings: ${warnings}`, 'yellow');
    }
    if (failed > 0) {
      this.log(`  Failed: ${failed}`, 'red');
    }

    const successRate = ((passed / total) * 100).toFixed(1);
    this.log(`  Success Rate: ${successRate}%`, 'cyan');

    // List failed tests
    if (failed > 0) {
      this.log('\n  Failed Tests:', 'red');
      this.results
        .filter(r => !r.passed && !r.warning)
        .forEach(r => {
          this.log(`    • ${r.test}`, 'red');
          if (r.details) {
            this.log(`      ${r.details}`, 'red');
          }
        });
    }

    // List warnings
    if (warnings > 0) {
      this.log('\n  Warnings:', 'yellow');
      this.results
        .filter(r => r.warning)
        .forEach(r => {
          this.log(`    • ${r.test}`, 'yellow');
          if (r.details) {
            this.log(`      ${r.details}`, 'yellow');
          }
        });
    }

    this.log('\n' + '='.repeat(60), 'cyan');

    if (failed === 0) {
      this.log('\n  ✓ ALL CRITICAL VERIFICATIONS PASSED', 'green');
      if (warnings > 0) {
        this.log('  ⚠ Some non-critical warnings present', 'yellow');
      }
    } else {
      this.log('\n  ✗ VERIFICATION FAILED', 'red');
      this.log('  Please review failed tests above', 'red');
    }

    this.log('');
  }

  public async verify(): Promise<boolean> {
    this.log('\n' + '='.repeat(60), 'bright');
    this.log('  CRITICAL DATABASE FIXES VERIFICATION', 'bright');
    this.log('='.repeat(60), 'bright');

    try {
      await this.testConnection();
      await this.verifyAnalyticsSequences();
      await this.verifyContactPersonColumn();
      await this.verifyRLSPolicies();

      this.printSummary();

      const failed = this.results.filter(r => !r.passed && !r.warning).length;
      return failed === 0;
    } catch (error) {
      this.log('\n✗ Verification failed with error:', 'red');
      this.log(`  ${error instanceof Error ? error.message : String(error)}`, 'red');
      return false;
    }
  }

  public async close(): Promise<void> {
    await this.pool.end();
  }
}

// Main execution
async function main() {
  const verifier = new CriticalFixesVerifier();

  try {
    const success = await verifier.verify();
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('\nFatal error:', error);
    process.exit(1);
  } finally {
    await verifier.close();
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { CriticalFixesVerifier };
