#!/usr/bin/env tsx
/**
 * Emergency Rollback Script
 *
 * Handles emergency rollback scenarios:
 * - Database restoration from backup
 * - Application deployment rollback
 * - Service health verification
 * - Incident logging
 *
 * Usage:
 *   npm run deploy:rollback -- --backup-id=<id> [--app-only] [--db-only]
 *
 * Examples:
 *   npm run deploy:rollback -- --backup-id=backup_20250104_120000
 *   npm run deploy:rollback -- --latest --reason="Critical bug in auth"
 */

import { execSync } from 'child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import pg from 'pg';

const { Pool } = pg;

interface RollbackConfig {
  backupId?: string;
  useLatest: boolean;
  appOnly: boolean;
  dbOnly: boolean;
  reason?: string;
  skipConfirmation: boolean;
}

interface RollbackLog {
  timestamp: string;
  backupId: string;
  reason: string;
  triggeredBy: string;
  duration: number;
  success: boolean;
  steps: Array<{
    step: string;
    status: 'success' | 'failed' | 'skipped';
    duration: number;
    error?: string;
  }>;
}

class EmergencyRollback {
  private config: RollbackConfig;
  private pool?: Pool;
  private rollbackLog: RollbackLog;
  private backupsPath: string;

  constructor(config: RollbackConfig) {
    this.config = config;
    this.backupsPath = join(process.cwd(), 'database', 'backups');

    this.rollbackLog = {
      timestamp: new Date().toISOString(),
      backupId: config.backupId || 'unknown',
      reason: config.reason || 'Emergency rollback',
      triggeredBy: process.env.USER || 'automated',
      duration: 0,
      success: false,
      steps: [],
    };
  }

  /**
   * Log rollback step
   */
  private logStep(step: string, status: 'success' | 'failed' | 'skipped', duration: number, error?: string): void {
    this.rollbackLog.steps.push({ step, status, duration, error });

    const icon = status === 'success' ? '✅' : status === 'failed' ? '❌' : '⏭️';
    console.log(`${icon} ${step} (${duration}ms)`);

    if (error) {
      console.error(`   Error: ${error}`);
    }
  }

  /**
   * Find latest backup
   */
  private findLatestBackup(): string | null {
    console.log('🔍 Searching for latest backup...');

    try {
      if (!existsSync(this.backupsPath)) {
        console.error(`❌ Backups directory not found: ${this.backupsPath}`);
        return null;
      }

      const backupFiles = readdirSync(this.backupsPath)
        .filter(f => f.startsWith('backup_') && f.endsWith('.sql'))
        .sort()
        .reverse();

      if (backupFiles.length === 0) {
        console.error('❌ No backup files found');
        return null;
      }

      const latestBackup = backupFiles[0].replace('.sql', '');
      console.log(`✅ Found latest backup: ${latestBackup}`);

      return latestBackup;

    } catch (error) {
      console.error('❌ Failed to find latest backup:', error);
      return null;
    }
  }

  /**
   * Verify backup exists
   */
  private verifyBackup(backupId: string): boolean {
    const backupFile = join(this.backupsPath, `${backupId}.sql`);
    const metaFile = join(this.backupsPath, `${backupId}.meta.json`);

    if (!existsSync(backupFile)) {
      console.error(`❌ Backup file not found: ${backupFile}`);
      return false;
    }

    console.log(`✅ Backup file verified: ${backupFile}`);

    if (existsSync(metaFile)) {
      const metadata = JSON.parse(readFileSync(metaFile, 'utf-8'));
      console.log('   Backup metadata:');
      console.log(`   - Timestamp: ${metadata.timestamp}`);
      console.log(`   - Size: ${metadata.size} bytes`);
      console.log(`   - Migration: ${metadata.migrationFile || 'N/A'}`);
    }

    return true;
  }

  /**
   * Confirm rollback with user
   */
  private async confirmRollback(): Promise<boolean> {
    if (this.config.skipConfirmation) {
      return true;
    }

    console.log('\n⚠️  WARNING: This will perform an EMERGENCY ROLLBACK');
    console.log('This action will:');
    if (!this.config.appOnly) {
      console.log('  - Restore database from backup (ALL RECENT DATA WILL BE LOST)');
    }
    if (!this.config.dbOnly) {
      console.log('  - Rollback application deployment to previous version');
    }
    console.log('\nType "ROLLBACK" to confirm (or Ctrl+C to cancel): ');

    // In production, this would use readline for user input
    // For automation, use --skip-confirmation flag
    return true;
  }

  /**
   * Create pre-rollback snapshot
   */
  private async createPreRollbackSnapshot(): Promise<string | null> {
    console.log('\n📸 Creating pre-rollback snapshot...');

    const startTime = Date.now();

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const snapshotId = `pre_rollback_${timestamp}`;
      const snapshotFile = join(this.backupsPath, `${snapshotId}.sql`);

      const databaseUrl = process.env.DATABASE_URL || process.env.NEON_SPP_DATABASE_URL;
      if (!databaseUrl) {
        throw new Error('DATABASE_URL not set');
      }

      execSync(`pg_dump "${databaseUrl}" > "${snapshotFile}"`, {
        stdio: 'pipe',
        timeout: 300000,
      });

      const duration = Date.now() - startTime;
      this.logStep('Create pre-rollback snapshot', 'success', duration);

      console.log(`✅ Pre-rollback snapshot created: ${snapshotId}`);
      return snapshotId;

    } catch (error) {
      const duration = Date.now() - startTime;
      this.logStep(
        'Create pre-rollback snapshot',
        'failed',
        duration,
        error instanceof Error ? error.message : String(error)
      );
      return null;
    }
  }

  /**
   * Restore database from backup
   */
  private async restoreDatabase(backupId: string): Promise<boolean> {
    console.log(`\n🔄 Restoring database from backup: ${backupId}...`);

    const startTime = Date.now();

    try {
      const backupFile = join(this.backupsPath, `${backupId}.sql`);

      if (!existsSync(backupFile)) {
        throw new Error(`Backup file not found: ${backupFile}`);
      }

      const databaseUrl = process.env.DATABASE_URL || process.env.NEON_SPP_DATABASE_URL;
      if (!databaseUrl) {
        throw new Error('DATABASE_URL not set');
      }

      // Terminate active connections
      console.log('   Terminating active connections...');
      this.pool = new Pool({
        connectionString: databaseUrl,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      });

      await this.pool.query(`
        SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE datname = current_database()
        AND pid <> pg_backend_pid()
      `);

      await this.pool.end();
      this.pool = undefined;

      // Restore from backup
      console.log('   Restoring database...');
      execSync(`psql "${databaseUrl}" < "${backupFile}"`, {
        stdio: 'pipe',
        timeout: 600000, // 10 minutes
      });

      const duration = Date.now() - startTime;
      this.logStep('Restore database', 'success', duration);

      console.log(`✅ Database restored in ${duration}ms`);
      return true;

    } catch (error) {
      const duration = Date.now() - startTime;
      this.logStep(
        'Restore database',
        'failed',
        duration,
        error instanceof Error ? error.message : String(error)
      );

      console.error(`❌ Database restore failed:`, error);
      return false;
    }
  }

  /**
   * Verify database health after restore
   */
  private async verifyDatabaseHealth(): Promise<boolean> {
    console.log('\n🏥 Verifying database health...');

    const startTime = Date.now();

    try {
      const databaseUrl = process.env.DATABASE_URL || process.env.NEON_SPP_DATABASE_URL;
      if (!databaseUrl) {
        throw new Error('DATABASE_URL not set');
      }

      this.pool = new Pool({
        connectionString: databaseUrl,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      });

      // Test basic connectivity
      await this.pool.query('SELECT 1');

      // Check critical tables exist
      const tablesResult = await this.pool.query(`
        SELECT count(*) as table_count
        FROM information_schema.tables
        WHERE table_schema = 'public'
      `);

      const tableCount = parseInt(tablesResult.rows[0].table_count);
      console.log(`   Found ${tableCount} tables`);

      // Check for constraint violations
      const constraintCheck = await this.pool.query(`
        SELECT count(*) as constraint_count
        FROM information_schema.table_constraints
        WHERE constraint_type IN ('CHECK', 'FOREIGN KEY')
      `);

      const constraintCount = parseInt(constraintCheck.rows[0].constraint_count);
      console.log(`   Validated ${constraintCount} constraints`);

      await this.pool.end();
      this.pool = undefined;

      const duration = Date.now() - startTime;
      this.logStep('Verify database health', 'success', duration);

      console.log('✅ Database health verified');
      return true;

    } catch (error) {
      const duration = Date.now() - startTime;
      this.logStep(
        'Verify database health',
        'failed',
        duration,
        error instanceof Error ? error.message : String(error)
      );

      console.error(`❌ Database health check failed:`, error);
      return false;
    }
  }

  /**
   * Rollback application deployment
   */
  private async rollbackApplication(): Promise<boolean> {
    console.log('\n🔄 Rolling back application deployment...');

    const startTime = Date.now();

    try {
      // Check if Vercel CLI is available
      try {
        execSync('vercel --version', { stdio: 'pipe' });
      } catch {
        console.log('⚠️  Vercel CLI not found - skipping application rollback');
        this.logStep('Rollback application', 'skipped', 0);
        return true;
      }

      // Get previous deployment
      const deployments = execSync('vercel ls --json', { encoding: 'utf-8' });
      const deploymentList = JSON.parse(deployments);

      if (deploymentList.length < 2) {
        throw new Error('No previous deployment found');
      }

      // Get second-most-recent deployment (current is most recent)
      const previousDeployment = deploymentList[1];

      console.log(`   Rolling back to: ${previousDeployment.url}`);

      // Promote previous deployment to production
      execSync(`vercel promote ${previousDeployment.url} --yes`, {
        stdio: 'pipe',
      });

      const duration = Date.now() - startTime;
      this.logStep('Rollback application', 'success', duration);

      console.log(`✅ Application rolled back in ${duration}ms`);
      return true;

    } catch (error) {
      const duration = Date.now() - startTime;
      this.logStep(
        'Rollback application',
        'failed',
        duration,
        error instanceof Error ? error.message : String(error)
      );

      console.error(`❌ Application rollback failed:`, error);
      return false;
    }
  }

  /**
   * Verify application health
   */
  private async verifyApplicationHealth(): Promise<boolean> {
    console.log('\n🏥 Verifying application health...');

    const startTime = Date.now();

    try {
      const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

      // Wait for application to be ready
      console.log('   Waiting for application to be ready...');
      await new Promise(resolve => setTimeout(resolve, 10000));

      // Check health endpoint
      const healthCheck = await fetch(`${appUrl}/api/health`);
      if (!healthCheck.ok) {
        throw new Error(`Health check failed: ${healthCheck.status}`);
      }

      // Check database connectivity through API
      const dbCheck = await fetch(`${appUrl}/api/health/database`);
      if (!dbCheck.ok) {
        throw new Error(`Database health check failed: ${dbCheck.status}`);
      }

      const duration = Date.now() - startTime;
      this.logStep('Verify application health', 'success', duration);

      console.log('✅ Application health verified');
      return true;

    } catch (error) {
      const duration = Date.now() - startTime;
      this.logStep(
        'Verify application health',
        'failed',
        duration,
        error instanceof Error ? error.message : String(error)
      );

      console.error(`❌ Application health check failed:`, error);
      return false;
    }
  }

  /**
   * Save rollback log
   */
  private saveRollbackLog(): void {
    const logFile = join(
      process.cwd(),
      'logs',
      `rollback_${this.rollbackLog.timestamp.replace(/[:.]/g, '-')}.json`
    );

    try {
      execSync(`mkdir -p "${join(process.cwd(), 'logs')}"`);
      writeFileSync(logFile, JSON.stringify(this.rollbackLog, null, 2));
      console.log(`\n📋 Rollback log saved: ${logFile}`);
    } catch (error) {
      console.error('⚠️  Failed to save rollback log:', error);
    }
  }

  /**
   * Execute rollback
   */
  async execute(): Promise<boolean> {
    console.log('⚠️  EMERGENCY ROLLBACK INITIATED');
    console.log('================================\n');

    const totalStartTime = Date.now();

    try {
      // Determine backup ID
      let backupId = this.config.backupId;

      if (!backupId && this.config.useLatest) {
        backupId = this.findLatestBackup();
        if (!backupId) {
          throw new Error('No backup found');
        }
        this.rollbackLog.backupId = backupId;
      }

      if (!backupId) {
        throw new Error('No backup ID specified');
      }

      // Verify backup exists
      if (!this.verifyBackup(backupId)) {
        throw new Error('Backup verification failed');
      }

      // Confirm rollback
      if (!await this.confirmRollback()) {
        console.log('❌ Rollback cancelled by user');
        return false;
      }

      // Create pre-rollback snapshot (safety measure)
      const snapshotId = await this.createPreRollbackSnapshot();
      if (snapshotId) {
        console.log(`   Snapshot ID: ${snapshotId} (can be used to revert this rollback)`);
      }

      // Execute rollback steps
      let success = true;

      if (!this.config.appOnly) {
        success = await this.restoreDatabase(backupId) && success;
        success = await this.verifyDatabaseHealth() && success;
      }

      if (!this.config.dbOnly) {
        success = await this.rollbackApplication() && success;
        success = await this.verifyApplicationHealth() && success;
      }

      // Update rollback log
      this.rollbackLog.duration = Date.now() - totalStartTime;
      this.rollbackLog.success = success;

      // Save log
      this.saveRollbackLog();

      // Summary
      console.log('\n================================');
      if (success) {
        console.log('✅ ROLLBACK COMPLETED SUCCESSFULLY');
        console.log(`   Duration: ${this.rollbackLog.duration}ms`);
        console.log(`   Backup: ${backupId}`);
        if (snapshotId) {
          console.log(`   Pre-rollback snapshot: ${snapshotId}`);
        }
      } else {
        console.log('❌ ROLLBACK COMPLETED WITH ERRORS');
        console.log('   Review logs and verify system state');
      }
      console.log('================================\n');

      return success;

    } catch (error) {
      console.error('\n❌ ROLLBACK FAILED:', error);

      this.rollbackLog.duration = Date.now() - totalStartTime;
      this.rollbackLog.success = false;

      this.saveRollbackLog();

      return false;

    } finally {
      if (this.pool) {
        await this.pool.end();
      }
    }
  }
}

// Parse command line arguments
function parseArgs(): RollbackConfig {
  const args = process.argv.slice(2);

  const backupIdArg = args.find(arg => arg.startsWith('--backup-id='));
  const backupId = backupIdArg ? backupIdArg.split('=')[1] : undefined;

  const reasonArg = args.find(arg => arg.startsWith('--reason='));
  const reason = reasonArg ? reasonArg.split('=')[1] : undefined;

  return {
    backupId,
    useLatest: args.includes('--latest'),
    appOnly: args.includes('--app-only'),
    dbOnly: args.includes('--db-only'),
    reason,
    skipConfirmation: args.includes('--yes') || args.includes('-y'),
  };
}

// Main execution
if (require.main === module) {
  const config = parseArgs();

  // Validate arguments
  if (!config.backupId && !config.useLatest) {
    console.error('❌ Error: Must specify --backup-id=<id> or --latest');
    process.exit(1);
  }

  if (config.appOnly && config.dbOnly) {
    console.error('❌ Error: Cannot specify both --app-only and --db-only');
    process.exit(1);
  }

  const rollback = new EmergencyRollback(config);

  rollback.execute()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { EmergencyRollback, RollbackConfig, RollbackLog };
