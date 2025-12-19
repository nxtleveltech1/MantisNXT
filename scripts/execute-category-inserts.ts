#!/usr/bin/env bun

/**
 * Execute category INSERT statements in batches
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const sqlFile = join(process.cwd(), 'migrations', 'new_category_hierarchy.sql');
const fullSql = readFileSync(sqlFile, 'utf-8');

// Extract just the INSERT statements (skip BEGIN/COMMIT and UPDATE/DELETE)
const lines = fullSql.split('\n');
const insertStatements: string[] = [];
let inInsert = false;
let currentInsert = '';

for (const line of lines) {
  const trimmed = line.trim();
  
  if (trimmed.startsWith('INSERT INTO')) {
    inInsert = true;
    currentInsert = line;
  } else if (inInsert) {
    currentInsert += '\n' + line;
    if (trimmed.endsWith(';')) {
      insertStatements.push(currentInsert);
      currentInsert = '';
      inInsert = false;
    }
  }
}

console.log(`Found ${insertStatements.length} INSERT statements`);
console.log(`First INSERT (first 200 chars):`);
console.log(insertStatements[0]?.substring(0, 200));
console.log(`\nLast INSERT (last 200 chars):`);
console.log(insertStatements[insertStatements.length - 1]?.substring(Math.max(0, insertStatements[insertStatements.length - 1].length - 200)));

// Export for use in Neon MCP
export { insertStatements };

