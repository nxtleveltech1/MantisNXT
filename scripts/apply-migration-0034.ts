#!/usr/bin/env tsx
/**
 * Apply migration 0034 - Add metadata column to stock_location table
 */

import pg from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';

const { Pool } = pg;

async function applyMigration() {
  const databaseUrl =
    process.env.DATABASE_URL || process.env.NEON_SPP_DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is required');
    process.exit(1);
  }

  console.log('🔄 Connecting to database...');
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    // Read migration file
    const migrationPath = join(
      process.cwd(),
      'database',
      'migrations',
      '0034_add_metadata_to_stock_location.sql'
    );
    const migrationSql = readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration file loaded: 0034_add_metadata_to_stock_location.sql');
    console.log('🚀 Applying migration...\n');

    // Execute migration
    await pool.query(migrationSql);

    console.log('✅ Migration applied successfully!');
    console.log('📊 Migration details:');
    console.log('   - Added: metadata JSONB column to core.stock_location\n');

    // Verify column exists
    const verifyResult = await pool.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_schema = 'core'
        AND table_name = 'stock_location'
        AND column_name = 'metadata';
    `);

    if (verifyResult.rows.length > 0) {
      console.log('✅ Column verification passed:');
      const col = verifyResult.rows[0];
      console.log(`   - ${col.column_name} (${col.data_type})`);
      console.log(`   - Default: ${col.column_default}`);
    } else {
      console.error('❌ Column verification failed: metadata column not found');
      process.exit(1);
    }

    // Check all columns in table
    const allColumnsResult = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'core'
        AND table_name = 'stock_location'
      ORDER BY ordinal_position;
    `);

    console.log('\n📋 All columns in core.stock_location:');
    allColumnsResult.rows.forEach((row: any) => {
      console.log(`   - ${row.column_name} (${row.data_type})`);
    });
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    if (error.code) {
      console.error('   Error code:', error.code);
    }
    if (error.detail) {
      console.error('   Details:', error.detail);
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

applyMigration();
