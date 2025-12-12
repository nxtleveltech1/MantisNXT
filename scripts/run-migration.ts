#!/usr/bin/env bun
/**
 * Simple Migration Runner
 * 
 * Runs a specific migration file or all pending migrations from migrations/ directory
 * 
 * Usage:
 *   bun run db:migrate                    # Run all pending migrations
 *   bun run db:migrate -- 0223_sales_services.sql  # Run specific migration
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { query } from '../src/lib/database';

const MIGRATIONS_DIR = join(process.cwd(), 'migrations');

interface MigrationRecord {
  migration_name: string;
}

async function ensureMigrationTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      migration_name text PRIMARY KEY,
      executed_at timestamptz DEFAULT now()
    );
  `);
}

async function isMigrationApplied(migrationName: string): Promise<boolean> {
  const result = await query<MigrationRecord>(
    'SELECT migration_name FROM schema_migrations WHERE migration_name = $1',
    [migrationName]
  );
  return result.rows.length > 0;
}

async function recordMigration(migrationName: string) {
  await query(
    'INSERT INTO schema_migrations (migration_name) VALUES ($1) ON CONFLICT (migration_name) DO NOTHING',
    [migrationName]
  );
}

async function runMigration(migrationFile: string) {
  const migrationPath = join(MIGRATIONS_DIR, migrationFile);
  
  if (!existsSync(migrationPath)) {
    throw new Error(`Migration file not found: ${migrationPath}`);
  }

  const migrationName = migrationFile.replace('.sql', '');
  
  if (await isMigrationApplied(migrationName)) {
    console.log(`⏭️  Migration ${migrationName} already applied, skipping`);
    return;
  }

  console.log(`\n📋 Running migration: ${migrationName}`);
  const sql = readFileSync(migrationPath, 'utf8');

  try {
    // Execute migration (it should handle its own transaction)
    await query(sql);
    
    // Record migration
    await recordMigration(migrationName);
    
    console.log(`✅ Migration ${migrationName} completed successfully`);
  } catch (error: any) {
    console.error(`❌ Migration ${migrationName} failed:`, error.message);
    throw error;
  }
}

async function main() {
  const specificMigration = process.argv[2];

  try {
    await ensureMigrationTable();

    if (specificMigration) {
      // Run specific migration
      const migrationFile = specificMigration.endsWith('.sql') 
        ? specificMigration 
        : `${specificMigration}.sql`;
      await runMigration(migrationFile);
    } else {
      // Run all pending migrations
      const migrationFiles = readdirSync(MIGRATIONS_DIR)
        .filter(f => f.endsWith('.sql'))
        .sort();

      if (migrationFiles.length === 0) {
        console.log('No migration files found');
        return;
      }

      console.log(`Found ${migrationFiles.length} migration file(s)`);
      
      for (const migrationFile of migrationFiles) {
        await runMigration(migrationFile);
      }
    }

    console.log('\n✅ All migrations completed successfully');
  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  }
}

main();

