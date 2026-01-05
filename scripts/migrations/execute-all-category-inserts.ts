#!/usr/bin/env bun

/**
 * Execute all category INSERT statements from SQL file
 * Reads the SQL file and extracts INSERT statements, then executes them in batches
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const sqlFile = join(process.cwd(), 'migrations', 'new_category_hierarchy.sql');
const fullSql = readFileSync(sqlFile, 'utf-8');

// Split SQL into statements by looking for INSERT INTO and semicolons
// Handle multi-line INSERT statements
const statements: string[] = [];
let currentStatement = '';
let inInsert = false;

const lines = fullSql.split('\n');
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const trimmed = line.trim();
  
  if (trimmed.startsWith('INSERT INTO')) {
    inInsert = true;
    currentStatement = line;
  } else if (inInsert) {
    currentStatement += '\n' + line;
    if (trimmed.endsWith(';')) {
      statements.push(currentStatement.trim());
      currentStatement = '';
      inInsert = false;
    }
  }
}

console.log(`Extracted ${statements.length} INSERT statements`);
console.log(`\nSample statements (first 3):`);
statements.slice(0, 3).forEach((stmt, idx) => {
  console.log(`\n--- Statement ${idx + 1} (${stmt.length} chars) ---`);
  console.log(stmt.substring(0, 150) + '...');
});

// Export for execution
export { statements };

