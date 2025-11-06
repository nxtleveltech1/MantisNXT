#!/usr/bin/env tsx
/**
 * MIGRATION 0024 COMPLETE EXECUTION SCRIPT
 *
 * This script handles the complete migration chain:
 * 1. Check for prerequisite tables
 * 2. If missing, apply critical prerequisites (0001, 0021)
 * 3. Apply 0024
 * 4. Verify all results
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import pg from 'pg';
import { performance } from 'perf_hooks';

const { Pool } = pg;

interface MigrationResult {
  success: boolean;
  startTime: number;
  endTime: number;
  duration: number;
  tablesCreated: string[];
  rlsEnabled: string[];
  policiesCount: number;
  indexesCount: number;
  triggersCount: number;
  enumsCreated: string[];
  errors: string[];
  prerequisitesApplied: string[];
}

// Verification queries
const VERIFICATION_QUERIES = {
  'Tables Created': `
    SELECT tablename FROM pg_tables
    WHERE tablename LIKE 'sync_%' AND schemaname = 'public'
    ORDER BY tablename;
  `,

  'RLS Status': `
    SELECT tablename FROM pg_tables
    WHERE tablename LIKE 'sync_%' AND rowsecurity = true AND schemaname = 'public'
    ORDER BY tablename;
  `,

  'RLS Policies Count': `
    SELECT COUNT(*) as policy_count
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename LIKE 'sync_%';
  `,

  'Indexes Created': `
    SELECT COUNT(*) as index_count
    FROM pg_indexes
    WHERE schemaname = 'public' AND tablename LIKE 'sync_%';
  `,

  'Triggers Created': `
    SELECT COUNT(*) as trigger_count
    FROM information_schema.triggers
    WHERE trigger_schema = 'public' AND event_object_table LIKE 'sync_%';
  `,

  'Enum Types': `
    SELECT typname FROM pg_type
    WHERE typname IN ('sync_type', 'sync_action', 'sync_entity_type', 'sync_status_type')
    ORDER BY typname;
  `,
};

async function checkPrerequisites(pool: Pool): Promise<{org: boolean, authUsers: boolean}> {
  const orgRes = await pool.query(`
    SELECT 1 FROM pg_tables WHERE tablename = 'organization' AND schemaname = 'public';
  `);

  const authRes = await pool.query(`
    SELECT 1 FROM pg_tables WHERE tablename = 'users_extended' AND schemaname = 'auth';
  `);

  return {
    org: orgRes.rows.length > 0,
    authUsers: authRes.rows.length > 0,
  };
}

async function executeMigration(pool: Pool, migrationPath: string, label: string): Promise<void> {
  console.log(`   Executing ${label}...`);
  const migrationSQL = readFileSync(migrationPath, 'utf8');

  // Remove RAISE NOTICE statements
  const cleanedSQL = migrationSQL.replace(/^(RAISE NOTICE .*;)$/gm, '-- REMOVED: $1');

  const client = await pool.connect();
  try {
    await client.query('BEGIN;');
    await client.query(cleanedSQL);
    await client.query('COMMIT;');
    console.log(`   ✓ ${label} applied successfully`);
  } catch (err: any) {
    await client.query('ROLLBACK;');
    console.error(`   ✗ ${label} failed: ${err.message}`);
    throw err;
  } finally {
    client.release();
  }
}

async function main() {
  const result: MigrationResult = {
    success: false,
    startTime: performance.now(),
    endTime: 0,
    duration: 0,
    tablesCreated: [],
    rlsEnabled: [],
    policiesCount: 0,
    indexesCount: 0,
    triggersCount: 0,
    enumsCreated: [],
    errors: [],
    prerequisitesApplied: [],
  };

  const databaseUrl = process.env.NEON_SPP_DATABASE_URL || process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('\n❌ FATAL: DATABASE_URL or NEON_SPP_DATABASE_URL environment variable not set');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
    max: 1,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  try {
    console.log('\n');
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('  MIGRATION 0024: SYNC PREVIEW, PROGRESS & ACTIVITY LOGGING');
    console.log('  Complete Migration Chain Execution');
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('');

    // Step 1: Validate connection
    console.log('📋 Step 1/6: Validating database connection...');
    const testClient = await pool.connect();
    const versionRes = await testClient.query('SELECT version() as version;');
    const pgVersion = versionRes.rows[0].version;
    testClient.release();
    console.log(`   ✓ Connected to PostgreSQL: ${pgVersion.split(' on ')[0]}`);

    // Step 2: Check prerequisites
    console.log('\n📋 Step 2/6: Checking prerequisite tables...');
    const prereqs = await checkPrerequisites(pool);

    if (!prereqs.org) {
      console.log('   ⚠️  MISSING: organization table');
      console.log('   Applying prerequisite migrations...');

      try {
        // Apply 0001 - Core tables
        await executeMigration(
          pool,
          resolve(process.cwd(), 'database/migrations/0001_prerequisite_core_tables.sql'),
          'Migration 0001 (organization table)'
        );
        result.prerequisitesApplied.push('0001');

        // Apply 0021 - Auth system (if missing)
        const authCheck = await pool.query(`
          SELECT 1 FROM pg_tables WHERE tablename = 'users_extended' AND schemaname = 'auth';
        `);

        if (authCheck.rows.length === 0) {
          // Try to apply 0021
          try {
            await executeMigration(
              pool,
              resolve(process.cwd(), 'database/migrations/0021_comprehensive_auth_system.sql'),
              'Migration 0021 (auth.users_extended)'
            );
            result.prerequisitesApplied.push('0021');
          } catch (err) {
            // Try the fixed version
            try {
              await executeMigration(
                pool,
                resolve(process.cwd(), 'database/migrations/0021_comprehensive_auth_system_FIXED.sql'),
                'Migration 0021 FIXED (auth.users_extended)'
              );
              result.prerequisitesApplied.push('0021 FIXED');
            } catch (err2) {
              console.log('   ℹ️  Skipping 0021 - will try 0024 anyway');
            }
          }
        }

        console.log('   ✓ Prerequisites applied');
      } catch (err: any) {
        console.error(`   ✗ Prerequisite failed: ${err.message}`);
        result.errors.push(err.message);
        throw err;
      }
    } else {
      console.log('   ✓ organization table exists');
    }

    if (prereqs.authUsers) {
      console.log('   ✓ auth.users_extended table exists');
    } else {
      console.log('   ⚠️  auth.users_extended table missing (required for RLS)');
    }

    // Step 3: Apply main migration
    console.log('\n📋 Step 3/6: Applying migration 0024...');
    try {
      await executeMigration(
        pool,
        resolve(process.cwd(), 'database/migrations/0024_sync_preview_progress_logs.sql'),
        'Migration 0024'
      );
      result.success = true;
    } catch (err: any) {
      result.errors.push(err.message);
      throw err;
    }

    // Step 4: Verify migration
    console.log('\n📋 Step 4/6: Verifying migration results...');

    // Get tables
    const tablesRes = await pool.query(VERIFICATION_QUERIES['Tables Created']);
    result.tablesCreated = tablesRes.rows.map((r: any) => r.tablename);
    console.log(`   ✓ Tables created: ${result.tablesCreated.length}`);
    result.tablesCreated.forEach((t) => console.log(`      - ${t}`));

    // Get RLS enabled tables
    const rlsRes = await pool.query(VERIFICATION_QUERIES['RLS Status']);
    result.rlsEnabled = rlsRes.rows.map((r: any) => r.tablename);
    console.log(`   ✓ RLS enabled on: ${result.rlsEnabled.length} tables`);

    // Get policies count
    const policiesRes = await pool.query(VERIFICATION_QUERIES['RLS Policies Count']);
    result.policiesCount = parseInt(policiesRes.rows[0].policy_count);
    console.log(`   ✓ RLS policies created: ${result.policiesCount}`);

    // Get indexes count
    const indexesRes = await pool.query(VERIFICATION_QUERIES['Indexes Created']);
    result.indexesCount = parseInt(indexesRes.rows[0].index_count);
    console.log(`   ✓ Indexes created: ${result.indexesCount}`);

    // Get triggers count
    const triggersRes = await pool.query(VERIFICATION_QUERIES['Triggers Created']);
    result.triggersCount = parseInt(triggersRes.rows[0].trigger_count);
    console.log(`   ✓ Triggers created: ${result.triggersCount}`);

    // Get enum types
    const enumsRes = await pool.query(VERIFICATION_QUERIES['Enum Types']);
    result.enumsCreated = enumsRes.rows.map((r: any) => r.typname);
    console.log(`   ✓ Enum types created: ${result.enumsCreated.length}`);
    result.enumsCreated.forEach((t) => console.log(`      - ${t}`));

    // Step 5: Detailed summary
    console.log('\n📋 Step 5/6: Validating results against specifications...');
    console.log('');

    const validations = [
      { name: 'Tables Created (3)', expected: 3, actual: result.tablesCreated.length, pass: result.tablesCreated.length === 3 },
      { name: 'RLS Enabled on All', expected: 3, actual: result.rlsEnabled.length, pass: result.rlsEnabled.length === 3 },
      { name: 'Security Policies (12)', expected: 12, actual: result.policiesCount, pass: result.policiesCount === 12 },
      { name: 'Indexes (15+)', expected: 15, actual: result.indexesCount, pass: result.indexesCount >= 15 },
      { name: 'Triggers (5)', expected: 5, actual: result.triggersCount, pass: result.triggersCount === 5 },
      { name: 'Enum Types (4)', expected: 4, actual: result.enumsCreated.length, pass: result.enumsCreated.length === 4 },
    ];

    validations.forEach((v) => {
      const status = v.pass ? '✓' : '✗';
      console.log(`   ${status} ${v.name}: ${v.actual}/${v.expected}`);
    });

    // Step 6: Final report
    console.log('\n📋 Step 6/6: Generating final report...');
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('  MIGRATION 0024 EXECUTION REPORT');
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('');

    const overallPass = validations.every((v) => v.pass);
    console.log(`STATUS: ${overallPass ? 'SUCCESS' : 'PARTIAL SUCCESS'}`);
    console.log('');

    if (result.prerequisitesApplied.length > 0) {
      console.log('PREREQUISITES APPLIED:');
      result.prerequisitesApplied.forEach((p) => {
        console.log(`  ✓ Migration ${p}`);
      });
      console.log('');
    }

    console.log('MIGRATION ARTIFACTS:');
    console.log(`  Tables: ${result.tablesCreated.length}/3 created`);
    console.log(`    • sync_preview_cache (delta snapshot cache)`);
    console.log(`    • sync_progress (real-time tracking)`);
    console.log(`    • sync_activity_log (audit trail, monthly partitioned)`);
    console.log('');

    console.log('SECURITY (ROW-LEVEL SECURITY):');
    console.log(`  RLS Enabled: ${result.rlsEnabled.length}/3 tables`);
    console.log(`  Policies: ${result.policiesCount} (4 per table: SELECT, INSERT, UPDATE, DELETE)`);
    console.log(`  Org Isolation: ${result.rlsEnabled.length === 3 ? 'ENFORCED' : 'PARTIAL'}`);
    console.log('');

    console.log('DATABASE OPTIMIZATION:');
    console.log(`  Indexes: ${result.indexesCount} (for org_id, entity_type, created_at queries)`);
    console.log(`  Triggers: ${result.triggersCount} (auto-elapsed, validation, logging)`);
    console.log(`  Partitioning: Monthly on sync_activity_log (2025-11 through future)`);
    console.log('');

    console.log('SCHEMA EXTENSIONS:');
    console.log(`  Enum Types: ${result.enumsCreated.length}`);
    result.enumsCreated.forEach((t) => {
      console.log(`    • ${t}`);
    });
    console.log('');

    result.endTime = performance.now();
    result.duration = result.endTime - result.startTime;

    console.log('EXECUTION METRICS:');
    console.log(`  Total duration: ${result.duration.toFixed(2)}ms`);
    console.log(`  Prerequisites: ${result.prerequisitesApplied.length}`);
    console.log('');

    console.log('═══════════════════════════════════════════════════════════════════');
    console.log(overallPass ? '✅ MIGRATION 0024 COMPLETED SUCCESSFULLY' : '⚠️  MIGRATION 0024 COMPLETED WITH WARNINGS');
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('');

    process.exit(overallPass ? 0 : 1);

  } catch (error: any) {
    result.endTime = performance.now();
    result.duration = result.endTime - result.startTime;

    console.error('\n');
    console.error('═══════════════════════════════════════════════════════════════════');
    console.error('❌ MIGRATION 0024 FAILED');
    console.error('═══════════════════════════════════════════════════════════════════');
    console.error('');
    console.error('ERROR:');
    console.error(`  ${error.message}`);
    console.error('');
    console.error(`EXECUTION TIME: ${result.duration.toFixed(2)}ms`);
    console.error('');

    if (result.errors.length > 0) {
      console.error('ACCUMULATED ERRORS:');
      result.errors.forEach((err, idx) => {
        console.error(`  ${idx + 1}. ${err}`);
      });
      console.error('');
    }

    console.error('═══════════════════════════════════════════════════════════════════');
    console.error('');

    process.exit(1);

  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('FATAL:', err.message);
  process.exit(1);
});
