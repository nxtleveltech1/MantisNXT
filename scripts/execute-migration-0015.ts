#!/usr/bin/env node
/**
 * Execute migration 0015 - SOH Pricing with AI
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { query } from '../lib/database/unified-connection';

async function executeMigration() {
  console.log('📦 Loading migration 0015_soh_pricing_with_ai.sql...');

  const migrationPath = join(process.cwd(), 'migrations', '0015_soh_pricing_with_ai.sql');
  const migrationSQL = readFileSync(migrationPath, 'utf-8');

  console.log('🚀 Executing migration on Neon database...');

  try {
    // Execute the full migration
    await query(migrationSQL, []);

    console.log('✅ Migration 0015 completed successfully!');
    console.log('');
    console.log('📋 Verifying migration...');

    // Verify new columns in stock_on_hand
    const sohColumns = await query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'core'
        AND table_name = 'stock_on_hand'
        AND column_name IN ('selling_price', 'calculated_margin', 'calculated_margin_pct', 'pricing_recommendation_id')
      ORDER BY column_name;
    `, []);

    console.log('✅ stock_on_hand columns:', sohColumns.rows.length, 'added');
    sohColumns.rows.forEach(row => {
      console.log(`   - ${row.column_name}: ${row.data_type}`);
    });

    // Verify pricing_automation_config table
    const configTable = await query(`
      SELECT COUNT(*) as count
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = 'pricing_automation_config';
    `, []);

    console.log('✅ pricing_automation_config table:', configTable.rows[0].count === '1' ? 'created' : 'not found');

    // Verify pricing_recommendation_queue view
    const queueView = await query(`
      SELECT COUNT(*) as count
      FROM information_schema.views
      WHERE table_schema = 'public'
        AND table_name = 'pricing_recommendation_queue';
    `, []);

    console.log('✅ pricing_recommendation_queue view:', queueView.rows[0].count === '1' ? 'created' : 'not found');

    // Verify AI service type
    const aiServiceType = await query(`
      SELECT enumlabel
      FROM pg_enum
      WHERE enumtypid = 'ai_service_type'::regtype
        AND enumlabel = 'pricing_recommendation';
    `, []);

    console.log('✅ ai_service_type enum:', aiServiceType.rows.length > 0 ? 'pricing_recommendation added' : 'not added');

    console.log('');
    console.log('🎉 Migration 0015 verified and complete!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

executeMigration();
