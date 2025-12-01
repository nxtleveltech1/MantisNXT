#!/usr/bin/env tsx
/**
 * Migration Verification Script
 * Verifies the stock_movement table structure
 */

import { config } from 'dotenv';
import { Pool } from 'pg';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

async function verifyMigration() {
  const pool = new Pool({
    connectionString: process.env.NEON_SPP_DATABASE_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const client = await pool.connect();

    try {
      // Get full column details
      const columnResult = await client.query(`
        SELECT
          column_name,
          data_type,
          character_maximum_length,
          column_default,
          is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'core'
          AND table_name = 'stock_movement'
          AND column_name = 'created_by'
      `);

      console.log('\n📊 Column Details:');
      console.log('================');
      if (columnResult.rows.length > 0) {
        const col = columnResult.rows[0];
        console.log(`✅ Column Name: ${col.column_name}`);
        console.log(
          `   Data Type: ${col.data_type}${col.character_maximum_length ? `(${col.character_maximum_length})` : ''}`
        );
        console.log(`   Default: ${col.column_default || 'NULL'}`);
        console.log(`   Nullable: ${col.is_nullable}`);
      } else {
        console.log('❌ Column not found!');
      }

      // Check index
      const indexResult = await client.query(`
        SELECT
          indexname,
          indexdef
        FROM pg_indexes
        WHERE schemaname = 'core'
          AND tablename = 'stock_movement'
          AND indexname = 'idx_stock_movement_created_by'
      `);

      console.log('\n📇 Index Details:');
      console.log('================');
      if (indexResult.rows.length > 0) {
        console.log(`✅ Index: ${indexResult.rows[0].indexname}`);
        console.log(`   Definition: ${indexResult.rows[0].indexdef}`);
      } else {
        console.log('❌ Index not found!');
      }

      // Test query
      const testResult = await client.query(`
        SELECT COUNT(*) as count
        FROM core.stock_movement
        WHERE created_by IS NOT NULL
      `);

      console.log('\n🧪 Test Query:');
      console.log('================');
      console.log(`   Rows with created_by: ${testResult.rows[0].count}`);

      console.log('\n✅ Migration verification complete!');
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ Verification failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

verifyMigration()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('💥 Verification failed:', error.message);
    process.exit(1);
  });
