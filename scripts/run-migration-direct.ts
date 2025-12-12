#!/usr/bin/env bun
/**
 * Direct Migration Runner (Bypasses unified connection)
 * 
 * Uses direct pg Pool connection - useful when quota issues occur
 * 
 * Usage:
 *   bun scripts/run-migration-direct.ts 0223_sales_services.sql
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import pg from 'pg';

const { Pool } = pg;

const MIGRATIONS_DIR = join(process.cwd(), 'migrations');

async function runMigration(migrationFile: string) {
  const databaseUrl = process.env.DATABASE_URL || process.env.NEON_SPP_DATABASE_URL;
  
  if (!databaseUrl) {
    throw new Error('DATABASE_URL or NEON_SPP_DATABASE_URL environment variable is required');
  }

  const migrationPath = join(MIGRATIONS_DIR, migrationFile);
  
  if (!existsSync(migrationPath)) {
    throw new Error(`Migration file not found: ${migrationPath}`);
  }

  const migrationName = migrationFile.replace('.sql', '');
  const sql = readFileSync(migrationPath, 'utf8');

  // Create direct pool connection
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
    max: 1, // Single connection for migration
  });

  try {
    console.log(`\n📋 Running migration: ${migrationName}`);
    
    // Ensure migration table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        migration_name text PRIMARY KEY,
        executed_at timestamptz DEFAULT now()
      );
    `);

    // Check if already applied
    const checkResult = await pool.query(
      'SELECT migration_name FROM schema_migrations WHERE migration_name = $1',
      [migrationName]
    );

    if (checkResult.rows.length > 0) {
      console.log(`⏭️  Migration ${migrationName} already applied, skipping`);
      return;
    }

    // Execute migration
    await pool.query(sql);
    
    // Record migration
    await pool.query(
      'INSERT INTO schema_migrations (migration_name) VALUES ($1) ON CONFLICT (migration_name) DO NOTHING',
      [migrationName]
    );
    
    console.log(`✅ Migration ${migrationName} completed successfully`);
  } catch (error: any) {
    console.error(`❌ Migration ${migrationName} failed:`, error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

async function main() {
  const migrationFile = process.argv[2];

  if (!migrationFile) {
    console.error('Usage: bun scripts/run-migration-direct.ts <migration-file>');
    console.error('Example: bun scripts/run-migration-direct.ts 0223_sales_services.sql');
    process.exit(1);
  }

  try {
    await runMigration(migrationFile);
    console.log('\n✅ Migration completed successfully');
  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  }
}

main();

