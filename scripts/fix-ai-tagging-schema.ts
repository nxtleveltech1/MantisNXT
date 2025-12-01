#!/usr/bin/env tsx
/**
 * Fix AI Tagging Schema
 * Checks for missing columns and applies migration 0035 if needed
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { query } from '../src/lib/database/unified-connection';

const SUPPLIER_MIGRATION = 'database/migrations/0035_ai_tagging_tracking.sql';
const TAG_PROPOSAL_MIGRATION = 'database/migrations/0039_fix_schema_migrations_duration_ms.sql';

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

async function checkProposalTables() {
  console.log('🔍 Checking AI tag proposal tables...');

  const proposalColumns = await query<{ column_name: string }>(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'core'
      AND table_name = 'ai_tag_proposal'
  `);

  const proposalProductsColumns = await query<{ column_name: string }>(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'core'
      AND table_name = 'ai_tag_proposal_product'
  `);

  const proposalRequired = ['tag_proposal_id'];
  const proposalProductRequired = ['tag_proposal_id', 'resolved_at'];

  const proposalPresent = new Set(proposalColumns.rows.map(r => r.column_name));
  const proposalProductsPresent = new Set(proposalProductsColumns.rows.map(r => r.column_name));

  const missingProposalColumns = proposalRequired.filter(col => !proposalPresent.has(col));
  const missingProposalProductColumns = proposalProductRequired.filter(
    col => !proposalProductsPresent.has(col)
  );

  return { missingProposalColumns, missingProposalProductColumns };
}

async function applyMigration(file: string) {
  console.log(`📝 Applying migration ${file}...`);

  const migrationPath = join(process.cwd(), file);
  const migrationSql = readFileSync(migrationPath, 'utf-8');

  // Split by semicolons but keep function definitions intact
  const statements: string[] = [];
  let current = '';
  let inDollarBlock = false;

  for (let i = 0; i < migrationSql.length; i++) {
    const char = migrationSql[i];
    const nextTwo = migrationSql.slice(i, i + 2);

    if (nextTwo === '$$') {
      current += nextTwo;
      inDollarBlock = !inDollarBlock;
      i++; // Skip the next $
      continue;
    }

    if (!inDollarBlock && char === ';') {
      if (current.trim().length > 0) {
        statements.push(current.trim());
      }
      current = '';
      continue;
    }

    current += char;
  }

  if (current.trim().length > 0) {
    statements.push(current.trim());
  }

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
  const { missingProposalColumns, missingProposalProductColumns } = await checkProposalTables();

  const missingProposalInfo =
    missingProposalColumns.length > 0 || missingProposalProductColumns.length > 0;

  if (missing.length === 0 && !missingProposalInfo) {
    console.log('✅ All required columns exist!');
  } else {
    console.error(`❌ Still missing columns: ${missing.join(', ')}`);
    if (missingProposalColumns.length) {
      console.error(`❌ core.ai_tag_proposal missing: ${missingProposalColumns.join(', ')}`);
    }
    if (missingProposalProductColumns.length) {
      console.error(
        `❌ core.ai_tag_proposal_product missing: ${missingProposalProductColumns.join(', ')}`
      );
    }
    return false;
  }

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
}

async function main() {
  try {
    const { missing } = await checkColumns();

    if (missing.length === 0) {
      console.log('✅ All AI tagging columns already exist!');
    } else {
      console.log(`❌ Missing columns: ${missing.join(', ')}`);
      console.log('🔧 Applying migration 0035...');
      await applyMigration(SUPPLIER_MIGRATION);
    }

    const { missingProposalColumns, missingProposalProductColumns } = await checkProposalTables();
    if (missingProposalColumns.length || missingProposalProductColumns.length) {
      console.log(
        `❌ Missing proposal columns: ${[
          ...missingProposalColumns,
          ...missingProposalProductColumns,
        ].join(', ')}`
      );
      console.log('🔧 Applying migration 0039...');
      await applyMigration(TAG_PROPOSAL_MIGRATION);
    }

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





