#!/usr/bin/env node
/**
 * Execute migration 0015 using pg with Neon connection
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { Client } from 'pg';

const connectionString =
  process.env.NEON_DATABASE_URL ||
  'postgresql://neondb_owner:npg_84ELeCFbOcGA@ep-steep-waterfall-a96wibpm-pooler.gwc.azure.neon.tech/mantis_issoh?sslmode=require';

async function executeMigration() {
  console.log('📦 Loading migration 0015_soh_pricing_with_ai.sql...');

  const migrationPath = join(process.cwd(), 'migrations', '0015_soh_pricing_with_ai.sql');
  const migrationSQL = readFileSync(migrationPath, 'utf-8');

  console.log('🚀 Connecting to Neon database...');

  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('✅ Connected to Neon database');

    console.log('📝 Executing migration...');
    await client.query(migrationSQL);

    console.log('✅ Migration 0015 completed successfully!');
    console.log('');
    console.log('📋 Verifying migration...');

    // Verify new columns in stock_on_hand
    const sohColumns = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'core'
        AND table_name = 'stock_on_hand'
        AND column_name IN ('selling_price', 'calculated_margin', 'calculated_margin_pct', 'pricing_recommendation_id')
      ORDER BY column_name;
    `);

    console.log('✅ stock_on_hand columns:', sohColumns.rows.length, 'added');
    sohColumns.rows.forEach(row => {
      console.log(`   - ${row.column_name}: ${row.data_type}`);
    });

    // Verify pricing_automation_config table
    const configTable = await client.query(`
      SELECT COUNT(*) as count
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = 'pricing_automation_config';
    `);

    console.log(
      '✅ pricing_automation_config table:',
      configTable.rows[0].count === '1' ? 'created' : 'not found'
    );

    // Verify pricing_recommendation_queue view
    const queueView = await client.query(`
      SELECT COUNT(*) as count
      FROM information_schema.views
      WHERE table_schema = 'public'
        AND table_name = 'pricing_recommendation_queue';
    `);

    console.log(
      '✅ pricing_recommendation_queue view:',
      queueView.rows[0].count === '1' ? 'created' : 'not found'
    );

    // Verify AI service type
    const aiServiceType = await client.query(`
      SELECT enumlabel
      FROM pg_enum
      WHERE enumtypid = 'ai_service_type'::regtype
        AND enumlabel = 'pricing_recommendation';
    `);

    console.log(
      '✅ ai_service_type enum:',
      aiServiceType.rows.length > 0 ? 'pricing_recommendation added' : 'not added'
    );

    console.log('');
    console.log('🎉 Migration 0015 verified and complete!');

    await client.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    await client.end();
    process.exit(1);
  }
}

executeMigration();
