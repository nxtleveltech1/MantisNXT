#!/usr/bin/env bun

/**
 * Split SQL file into individual statements and prepare for execution
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const sqlFile = join(process.cwd(), 'migrations', 'levels_2_5_only.sql');
const fullSql = readFileSync(sqlFile, 'utf-8');

// Split SQL into individual statements
// Look for statements ending with semicolon, but handle multi-line INSERTs
const statements: string[] = [];
let currentStatement = '';
let inStatement = false;

const lines = fullSql.split('\n');
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const trimmed = line.trim();
  
  // Skip empty lines and comments (unless we're in a statement)
  if (!inStatement && (trimmed === '' || trimmed.startsWith('--'))) {
    continue;
  }
  
  // Start of a statement
  if (trimmed.startsWith('INSERT INTO') || trimmed.startsWith('BEGIN') || trimmed.startsWith('COMMIT')) {
    inStatement = true;
    currentStatement = line;
  } else if (inStatement) {
    currentStatement += '\n' + line;
    
    // End of statement
    if (trimmed.endsWith(';')) {
      statements.push(currentStatement.trim());
      currentStatement = '';
      inStatement = false;
    }
  }
}

console.log(`Split into ${statements.length} statements`);
console.log(`\nFirst statement (first 200 chars):`);
console.log(statements[0]?.substring(0, 200));
console.log(`\nLast statement (last 200 chars):`);
console.log(statements[statements.length - 1]?.substring(Math.max(0, statements[statements.length - 1].length - 200)));

// Filter out BEGIN and COMMIT, keep only INSERTs
const insertStatements = statements.filter(s => s.startsWith('INSERT INTO'));
console.log(`\nFound ${insertStatements.length} INSERT statements`);

// Split into batches of 50
const batchSize = 50;
const batches: string[][] = [];
for (let i = 0; i < insertStatements.length; i += batchSize) {
  batches.push(insertStatements.slice(i, i + batchSize));
}

console.log(`\nSplit into ${batches.length} batches of up to ${batchSize} statements`);

export { batches, insertStatements };

