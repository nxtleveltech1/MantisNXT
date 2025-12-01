#!/usr/bin/env tsx
/**
 * Migration Runner Script
 * Runs a single migration file against the database
 */

import { config } from 'dotenv';
import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

async function runMigration(migrationFile: string) {
  const connectionString = process.env.NEON_SPP_DATABASE_URL || process.env.DATABASE_URL;

  const pool = new Pool({
    connectionString,
    ssl: connectionString?.includes('sslmode=require') ? { rejectUnauthorized: false } : false,
  });

  try {
    console.log(`📦 Running migration: ${migrationFile}`);

    const migrationPath = resolve(process.cwd(), 'database', 'migrations', migrationFile);
    const sql = readFileSync(migrationPath, 'utf-8');

    console.log(`📄 Migration file loaded: ${migrationPath}`);
    console.log(`📊 SQL length: ${sql.length} characters`);

    const client = await pool.connect();

    try {
      console.log(`🔌 Connected to database`);

      // Run the migration
      await client.query(sql);

      console.log(`✅ Migration completed successfully!`);

      // Verify the column was added
      const result = await client.query(`
        SELECT column_name, data_type, column_default
        FROM information_schema.columns
        WHERE table_schema = 'core'
          AND table_name = 'stock_movement'
          AND column_name = 'created_by'
      `);

      if (result.rows.length > 0) {
        console.log(`✅ Verification: created_by column exists`);
        console.log(`   Type: ${result.rows[0].data_type}`);
        console.log(`   Default: ${result.rows[0].column_default}`);
      } else {
        console.log(`⚠️  Warning: created_by column not found in verification`);
      }
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(`❌ Migration failed:`, error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Get migration file from command line args or use default
const migrationFile = process.argv[2] || '008_add_created_by_to_stock_movement.sql';

runMigration(migrationFile)
  .then(() => {
    console.log(`\n🎉 Migration process completed successfully!`);
    process.exit(0);
  })
  .catch(error => {
    console.error(`\n💥 Migration process failed:`, error.message);
    process.exit(1);
  });
