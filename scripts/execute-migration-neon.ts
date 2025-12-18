#!/usr/bin/env bun

/**
 * Execute migration file using Neon database connection
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { query as dbQuery } from '@/lib/database/unified-connection';

async function executeMigration() {
  const migrationFile = join(process.cwd(), 'migrations', '0040_seed_new_category_hierarchy.sql');
  const sql = readFileSync(migrationFile, 'utf-8');

  console.log('Executing migration:', migrationFile);
  console.log('SQL length:', sql.length, 'characters');

  try {
    // Execute the migration SQL
    // Note: The SQL file contains BEGIN/COMMIT, so we execute it as-is
    // The database connection should handle the transaction
    const result = await dbQuery(sql);
    console.log('✅ Migration executed successfully');
    console.log('Result:', result);
  } catch (error) {
    console.error('❌ Error executing migration:', error);
    process.exit(1);
  }
}

if (import.meta.main) {
  executeMigration();
}

