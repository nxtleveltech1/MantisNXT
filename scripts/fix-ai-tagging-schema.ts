#!/usr/bin/env tsx
/**
 * Fix AI Tagging Schema
 * Checks for missing columns and applies migration 0035 if needed
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { query } from '../src/lib/database/unified-connection';

async function checkColumns() {
  console.log('🔍 Checking for AI tagging columns...');
  
  const checkSql = `
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'core'
      AND table_name = 'supplier_product'
      AND column_name IN ('ai_tagging_status', 'ai_tag_confidence', 'ai_tagged_at', 'ai_tag_provider')
  `;
  
  const result = await query<{ column_name: string }>(checkSql);
  const existingColumns = new Set(result.rows.map(r => r.column_name));
  const required = ['ai_tagging_status', 'ai_tag_confidence', 'ai_tagged_at', 'ai_tag_provider'];
  const missing = required.filter(col => !existingColumns.has(col));
  
  return { missing, existingColumns };
}

async function applyMigration() {
  console.log('📝 Applying migration 0035_ai_tagging_tracking.sql...');
  
  const migrationPath = join(process.cwd(), 'database/migrations/0035_ai_tagging_tracking.sql');
  const migrationSql = readFileSync(migrationPath, 'utf-8');
  
  // Split by semicolons but keep function definitions intact
  const statements = migrationSql
    .split(/;(?![^$]*\$\$)/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));
  
  for (const statement of statements) {
    if (statement.trim()) {
      try {
        await query(statement);
      } catch (error) {
        // Ignore "already exists" errors
        if (error instanceof Error && !error.message.includes('already exists')) {
          console.warn(`⚠️  Statement warning: ${error.message}`);
        }
      }
    }
  }
  
  console.log('✅ Migration applied');
}

async function verifyFix() {
  console.log('✅ Verifying fix...');
  
  const { missing } = await checkColumns();
  
  if (missing.length === 0) {
    console.log('✅ All required columns exist!');
    
    // Check product status
    const statusCheck = await query<{ ai_tagging_status: string; count: string }>(`
      SELECT ai_tagging_status, COUNT(*) as count
      FROM core.supplier_product
      GROUP BY ai_tagging_status
    `);
    
    console.log('📊 Current product status distribution:');
    statusCheck.rows.forEach(row => {
      console.log(`   ${row.ai_tagging_status || 'NULL'}: ${row.count}`);
    });
    
    return true;
  } else {
    console.error(`❌ Still missing columns: ${missing.join(', ')}`);
    return false;
  }
}

async function main() {
  try {
    const { missing } = await checkColumns();
    
    if (missing.length === 0) {
      console.log('✅ All AI tagging columns already exist!');
      await verifyFix();
      return;
    }
    
    console.log(`❌ Missing columns: ${missing.join(', ')}`);
    console.log('🔧 Applying migration...');
    
    await applyMigration();
    const success = await verifyFix();
    
    if (success) {
      console.log('\n✅ AI tagging schema fixed successfully!');
      process.exit(0);
    } else {
      console.error('\n❌ Fix incomplete');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error fixing schema:', error);
    process.exit(1);
  }
}

main();




