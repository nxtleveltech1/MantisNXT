#!/usr/bin/env tsx
/**
 * Apply migration 0031 - AI User Preferences and Learning
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
      'migrations',
      '0031_ai_user_preferences.sql'
    );
    const migrationSql = readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration file loaded: 0031_ai_user_preferences.sql');
    console.log('🚀 Applying migration...\n');

    // Execute migration
    await pool.query(migrationSql);

    console.log('✅ Migration applied successfully!');
    console.log('📊 Migration details:');
    console.log('   - Created: ai_user_preferences table');
    console.log('   - Created: ai_learning_signals table');
    console.log('   - Added: RLS policies and indexes\n');

    // Verify tables exist
    const tablesResult = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('ai_user_preferences', 'ai_learning_signals');
    `);

    if (tablesResult.rows.length === 2) {
      console.log('✅ Table verification passed:');
      tablesResult.rows.forEach((row: any) => {
        console.log(`   - ${row.table_name}`);
      });
    } else {
      console.error('❌ Table verification failed: Expected 2 tables, found', tablesResult.rows.length);
      process.exit(1);
    }

    // Check ai_user_preferences columns
    const prefsColumnsResult = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'ai_user_preferences'
      ORDER BY ordinal_position;
    `);

    console.log('\n📋 Columns in ai_user_preferences:');
    prefsColumnsResult.rows.forEach((row: any) => {
      console.log(`   - ${row.column_name} (${row.data_type}) ${row.is_nullable === 'NO' ? 'NOT NULL' : ''}`);
    });

    // Check ai_learning_signals columns
    const signalsColumnsResult = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'ai_learning_signals'
      ORDER BY ordinal_position;
    `);

    console.log('\n📋 Columns in ai_learning_signals:');
    signalsColumnsResult.rows.forEach((row: any) => {
      console.log(`   - ${row.column_name} (${row.data_type}) ${row.is_nullable === 'NO' ? 'NOT NULL' : ''}`);
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