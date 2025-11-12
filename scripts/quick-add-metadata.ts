#!/usr/bin/env tsx
/**
 * Quick script to add metadata column to stock_location table
 */

import { query } from '../lib/database/unified-connection';

async function addMetadataColumn() {
  console.log('🔄 Adding metadata column to core.stock_location...');

  try {
    // Check if column already exists
    const checkResult = await query<{ exists: boolean }>(`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'core'
          AND table_name = 'stock_location'
          AND column_name = 'metadata'
      ) as exists
    `);

    if (checkResult.rows[0]?.exists) {
      console.log('✅ metadata column already exists');
      return;
    }

    // Add the column
    await query(`
      ALTER TABLE core.stock_location
      ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
    `);

    console.log('✅ metadata column added successfully!');

    // Verify
    const verifyResult = await query<{ column_name: string; data_type: string }>(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'core'
        AND table_name = 'stock_location'
        AND column_name = 'metadata';
    `);

    if (verifyResult.rows.length > 0) {
      console.log('✅ Verification passed:', verifyResult.rows[0]);
    } else {
      console.error('❌ Verification failed');
      process.exit(1);
    }
  } catch (error: any) {
    console.error('❌ Failed to add metadata column:', error.message);
    process.exit(1);
  }
}

addMetadataColumn();
