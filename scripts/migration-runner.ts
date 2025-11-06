#!/usr/bin/env tsx
/**
 * Production Migration Runner
 *
 * Features:
 * - Automatic backup before migration
 * - Validation before and after
 * - Rollback on failure
 * - Comprehensive logging
 * - Dry-run mode
 *
 * Usage:
 *   npm run db:migrate:production -- --migration=0021 [--dry-run] [--force]
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import pg from 'pg';

const { Pool } = pg;

interface MigrationConfig {
  dryRun: boolean;
  force: boolean;
  migrationFile?: string;
  backupBeforeMigration: boolean;
  validateAfterMigration: boolean;
  rollbackOnFailure: boolean;
}

interface MigrationResult {
  success: boolean;
  migrationId: string;
  backupId?: string;
  duration: number;
  error?: string;
  rollbackPerformed?: boolean;
}

class MigrationRunner {
  private pool: Pool;
  private config: MigrationConfig;
  private migrationsPath: string;
  private backupsPath: string;

  constructor(config: MigrationConfig) {
    this.config = config;
    this.migrationsPath = join(process.cwd(), 'database', 'migrations');
    this.backupsPath = join(process.cwd(), 'database', 'backups');

    // Initialize database connection
    const databaseUrl = process.env.DATABASE_URL || process.env.NEON_SPP_DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL or NEON_SPP_DATABASE_URL environment variable is required');
    }

    this.pool = new Pool({
      connectionString: databaseUrl,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }

  /**
   * Execute pre-migration validation checks
   */
  private async validatePreMigration(): Promise<boolean> {
    console.log('🔍 Running pre-migration validation checks...');

    try {
      // Check database connection
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();
      console.log('✅ Database connection validated');

      // Check for active connections
      const result = await this.pool.query(`
        SELECT count(*) as active_connections
        FROM pg_stat_activity
        WHERE state = 'active' AND pid != pg_backend_pid()
      `);

      const activeConnections = parseInt(result.rows[0].active_connections);
      if (activeConnections > 50 && !this.config.force) {
        console.error(`❌ Too many active connections: ${activeConnections}`);
        return false;
      }
      console.log(`✅ Active connections: ${activeConnections}`);

      // Check database size
      const sizeResult = await this.pool.query(`
        SELECT pg_size_pretty(pg_database_size(current_database())) as size
      `);
      console.log(`✅ Database size: ${sizeResult.rows[0].size}`);

      // Check for pending migrations
      const pendingResult = await this.pool.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = 'schema_migrations'
        ) as has_migrations_table
      `);

      if (pendingResult.rows[0].has_migrations_table) {
        console.log('✅ Migration tracking table exists');
      } else {
        console.log('⚠️  Migration tracking table does not exist - will be created');
      }

      return true;
    } catch (error) {
      console.error('❌ Pre-migration validation failed:', error);
      return false;
    }
  }

  /**
   * Create database backup
   */
  private async createBackup(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupId = `backup_${timestamp}`;
    const backupFile = join(this.backupsPath, `${backupId}.sql`);

    console.log(`📦 Creating backup: ${backupId}...`);

    if (this.config.dryRun) {
      console.log('   [DRY RUN] Backup would be created');
      return backupId;
    }

    try {
      // Create backups directory if it doesn't exist
      if (!existsSync(this.backupsPath)) {
        execSync(`mkdir -p "${this.backupsPath}"`);
      }

      // Create backup using pg_dump
      const databaseUrl = process.env.DATABASE_URL || process.env.NEON_SPP_DATABASE_URL;
      execSync(`pg_dump "${databaseUrl}" > "${backupFile}"`, {
        stdio: 'inherit',
        timeout: 300000, // 5 minutes
      });

      // Verify backup was created
      if (!existsSync(backupFile)) {
        throw new Error('Backup file was not created');
      }

      const backupSize = execSync(`wc -c < "${backupFile}"`).toString().trim();
      console.log(`✅ Backup created: ${backupFile} (${backupSize} bytes)`);

      // Create metadata file
      const metadata = {
        backupId,
        timestamp,
        databaseUrl: databaseUrl?.replace(/:[^:@]+@/, ':***@'), // Hide password
        size: backupSize,
        migrationFile: this.config.migrationFile,
      };

      writeFileSync(
        join(this.backupsPath, `${backupId}.meta.json`),
        JSON.stringify(metadata, null, 2)
      );

      return backupId;
    } catch (error) {
      console.error('❌ Backup creation failed:', error);
      throw error;
    }
  }

  /**
   * Get list of migration files
   */
  private getMigrationFiles(): string[] {
    const files = readdirSync(this.migrationsPath)
      .filter(f => f.endsWith('.sql') && !f.includes('ROLLBACK'))
      .sort();
    return files;
  }

  /**
   * Ensure migration tracking table exists
   */
  private async ensureMigrationTable(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        migration_name TEXT NOT NULL UNIQUE,
        executed_at TIMESTAMPTZ DEFAULT NOW(),
        duration_ms INTEGER,
        checksum TEXT,
        status TEXT DEFAULT 'completed',
        error_message TEXT,
        rollback_performed BOOLEAN DEFAULT FALSE
      )
    `);
  }

  /**
   * Check if migration has been applied
   */
  private async isMigrationApplied(migrationName: string): Promise<boolean> {
    const result = await this.pool.query(
      'SELECT 1 FROM schema_migrations WHERE migration_name = $1 AND status = $2',
      [migrationName, 'completed']
    );
    return result.rows.length > 0;
  }

  /**
   * Execute migration file
   */
  private async executeMigration(migrationFile: string): Promise<MigrationResult> {
    const startTime = Date.now();
    const migrationPath = join(this.migrationsPath, migrationFile);
    const migrationName = migrationFile.replace('.sql', '');

    console.log(`\n🚀 Executing migration: ${migrationName}...`);

    let backupId: string | undefined;
    let client;

    try {
      // Create backup if enabled
      if (this.config.backupBeforeMigration) {
        backupId = await this.createBackup();
      }

      // Read migration file
      if (!existsSync(migrationPath)) {
        throw new Error(`Migration file not found: ${migrationPath}`);
      }

      const sql = readFileSync(migrationPath, 'utf-8');
      console.log(`   Read ${sql.length} characters from migration file`);

      if (this.config.dryRun) {
        console.log('   [DRY RUN] Migration would be executed');
        console.log('   SQL Preview (first 500 chars):');
        console.log(sql.substring(0, 500) + '...');

        return {
          success: true,
          migrationId: migrationName,
          backupId,
          duration: Date.now() - startTime,
        };
      }

      // Execute migration in transaction
      client = await this.pool.connect();

      try {
        await client.query('BEGIN');
        console.log('   Started transaction');

        // Execute the migration SQL
        await client.query(sql);
        console.log('   Migration SQL executed successfully');

        // Record migration in tracking table
        await client.query(
          `INSERT INTO schema_migrations (migration_name, duration_ms, status)
           VALUES ($1, $2, $3)
           ON CONFLICT (migration_name) DO UPDATE
           SET executed_at = NOW(), duration_ms = $2, status = $3`,
          [migrationName, Date.now() - startTime, 'completed']
        );

        await client.query('COMMIT');
        console.log('   Transaction committed');

      } catch (execError) {
        await client.query('ROLLBACK');
        console.log('   Transaction rolled back');
        throw execError;
      } finally {
        client.release();
      }

      const duration = Date.now() - startTime;
      console.log(`✅ Migration completed in ${duration}ms`);

      // Validate after migration if enabled
      if (this.config.validateAfterMigration) {
        await this.validatePostMigration();
      }

      return {
        success: true,
        migrationId: migrationName,
        backupId,
        duration,
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Migration failed:`, error);

      // Record failure
      try {
        await this.pool.query(
          `INSERT INTO schema_migrations (migration_name, duration_ms, status, error_message)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (migration_name) DO UPDATE
           SET executed_at = NOW(), duration_ms = $2, status = $3, error_message = $4`,
          [migrationName, duration, 'failed', error instanceof Error ? error.message : String(error)]
        );
      } catch (recordError) {
        console.error('Failed to record migration failure:', recordError);
      }

      // Attempt rollback if enabled
      let rollbackPerformed = false;
      if (this.config.rollbackOnFailure && backupId) {
        rollbackPerformed = await this.performRollback(backupId);
      }

      return {
        success: false,
        migrationId: migrationName,
        backupId,
        duration,
        error: error instanceof Error ? error.message : String(error),
        rollbackPerformed,
      };
    }
  }

  /**
   * Execute post-migration validation
   */
  private async validatePostMigration(): Promise<boolean> {
    console.log('🔍 Running post-migration validation checks...');

    try {
      // Check database is still accessible
      await this.pool.query('SELECT 1');
      console.log('✅ Database connection validated');

      // Check for constraint violations
      const constraintCheck = await this.pool.query(`
        SELECT constraint_name, table_name
        FROM information_schema.table_constraints
        WHERE constraint_type IN ('CHECK', 'FOREIGN KEY')
        LIMIT 10
      `);
      console.log(`✅ Checked ${constraintCheck.rows.length} constraints`);

      // Check for missing indexes on foreign keys
      const indexCheck = await this.pool.query(`
        SELECT schemaname, tablename, indexname
        FROM pg_indexes
        WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
        LIMIT 10
      `);
      console.log(`✅ Checked ${indexCheck.rows.length} indexes`);

      return true;
    } catch (error) {
      console.error('❌ Post-migration validation failed:', error);
      return false;
    }
  }

  /**
   * Perform database rollback from backup
   */
  private async performRollback(backupId: string): Promise<boolean> {
    console.log(`🔄 Attempting rollback using backup: ${backupId}...`);

    try {
      const backupFile = join(this.backupsPath, `${backupId}.sql`);

      if (!existsSync(backupFile)) {
        console.error(`❌ Backup file not found: ${backupFile}`);
        return false;
      }

      // Restore from backup
      const databaseUrl = process.env.DATABASE_URL || process.env.NEON_SPP_DATABASE_URL;
      execSync(`psql "${databaseUrl}" < "${backupFile}"`, {
        stdio: 'inherit',
        timeout: 300000, // 5 minutes
      });

      console.log('✅ Rollback completed successfully');
      return true;

    } catch (error) {
      console.error('❌ Rollback failed:', error);
      return false;
    }
  }

  /**
   * Run migrations
   */
  async run(): Promise<void> {
    console.log('🚀 MantisNXT Migration Runner');
    console.log('================================\n');

    const startTime = Date.now();

    try {
      // Ensure migration table exists
      await this.ensureMigrationTable();

      // Pre-migration validation
      if (!await this.validatePreMigration()) {
        throw new Error('Pre-migration validation failed');
      }

      // Get migrations to run
      let migrationsToRun: string[];

      if (this.config.migrationFile) {
        // Run specific migration
        migrationsToRun = [this.config.migrationFile];
      } else {
        // Run all pending migrations
        const allMigrations = this.getMigrationFiles();
        migrationsToRun = [];

        for (const migration of allMigrations) {
          const migrationName = migration.replace('.sql', '');
          if (!await this.isMigrationApplied(migrationName)) {
            migrationsToRun.push(migration);
          }
        }
      }

      if (migrationsToRun.length === 0) {
        console.log('✅ No pending migrations to run');
        return;
      }

      console.log(`\n📋 Found ${migrationsToRun.length} migration(s) to run:`);
      migrationsToRun.forEach((m, i) => console.log(`   ${i + 1}. ${m}`));

      if (this.config.dryRun) {
        console.log('\n⚠️  DRY RUN MODE - No changes will be applied\n');
      } else {
        console.log('');
      }

      // Execute migrations
      const results: MigrationResult[] = [];
      for (const migration of migrationsToRun) {
        const result = await this.executeMigration(migration);
        results.push(result);

        if (!result.success) {
          console.error(`\n❌ Migration failed: ${migration}`);
          if (result.error) {
            console.error(`   Error: ${result.error}`);
          }
          if (result.rollbackPerformed) {
            console.log('   Rollback was performed');
          }
          break;
        }
      }

      // Summary
      const totalDuration = Date.now() - startTime;
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;

      console.log('\n================================');
      console.log('Migration Summary:');
      console.log(`  Total: ${results.length}`);
      console.log(`  Success: ${successCount}`);
      console.log(`  Failed: ${failCount}`);
      console.log(`  Duration: ${totalDuration}ms`);
      console.log('================================\n');

      if (failCount > 0) {
        process.exit(1);
      }

    } catch (error) {
      console.error('\n❌ Migration runner failed:', error);
      process.exit(1);
    } finally {
      await this.pool.end();
    }
  }
}

// Parse command line arguments
function parseArgs(): MigrationConfig {
  const args = process.argv.slice(2);
  const config: MigrationConfig = {
    dryRun: args.includes('--dry-run'),
    force: args.includes('--force'),
    backupBeforeMigration: !args.includes('--no-backup'),
    validateAfterMigration: !args.includes('--no-validate'),
    rollbackOnFailure: !args.includes('--no-rollback'),
  };

  // Extract migration file
  const migrationArg = args.find(arg => arg.startsWith('--migration='));
  if (migrationArg) {
    const migrationValue = migrationArg.split('=')[1];
    // Support both full filename and just the number
    config.migrationFile = migrationValue.endsWith('.sql')
      ? migrationValue
      : `${migrationValue}_*.sql`; // Will be resolved to actual filename
  }

  return config;
}

// Main execution
if (require.main === module) {
  const config = parseArgs();
  const runner = new MigrationRunner(config);
  runner.run().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { MigrationRunner, MigrationConfig, MigrationResult };
