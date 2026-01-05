#!/usr/bin/env tsx
/**
 * Apply migration 0033 - Create stock_locations table
 */

import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';

async function applyMigration() {
  const databaseUrl = process.env.DATABASE_URL || process.env.NEON_SPP_DATABASE_URL;

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
      '0033_create_stock_locations.sql'
    );
    const migrationSql = readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration file loaded: 0033_create_stock_locations.sql');
    console.log('🚀 Applying migration...\n');

    // Execute migration
    await pool.query(migrationSql);

    console.log('✅ Migration applied successfully!');
    console.log('📊 Migration details:');
    console.log('   - Created: core.stock_location_type ENUM');
    console.log('   - Created: core.stock_location table');
    console.log('   - Created: Indexes for performance');
    console.log('   - Created: Auto-update trigger');
    console.log('   - Inserted: Default locations for existing orgs\n');

    // Verify table exists
    const verifyResult = await pool.query(`
      SELECT table_name, column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'core'
        AND table_name = 'stock_location'
      ORDER BY ordinal_position;
    `);

    if (verifyResult.rows.length > 0) {
      console.log('✅ Table verification passed:');
      console.log('   Columns created:', verifyResult.rows.length);
      verifyResult.rows.forEach((row: any) => {
        console.log(`   - ${row.column_name} (${row.data_type})`);
      });
    }

    // Check count
    const countResult = await pool.query('SELECT COUNT(*) as count FROM core.stock_location');
    console.log(`\n📦 Total locations in database: ${countResult.rows[0].count}`);
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
