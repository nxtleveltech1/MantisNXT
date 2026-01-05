#!/usr/bin/env bun

/**
 * Execute category INSERT statements in batches via Neon MCP
 * This script reads the SQL file and executes INSERT statements for levels 2-5
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const sqlFile = join(process.cwd(), 'migrations', 'new_category_hierarchy.sql');
const fullSql = readFileSync(sqlFile, 'utf-8');

// Extract INSERT statements for levels 2-5 only
const lines = fullSql.split('\n');
const insertStatements: string[] = [];
let currentStatement = '';
let inInsert = false;
let skipNext = false; // Skip level 1 categories

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const trimmed = line.trim();
  
  // Check if this is a level 1 category comment - skip these
  if (trimmed.match(/^-- \d+ [^(]+ \(Level 1\)/)) {
    skipNext = true;
    continue;
  }
  
  // Reset skip flag for level 2+
  if (trimmed.match(/^-- \d+\./)) {
    skipNext = false;
  }
  
  if (trimmed.startsWith('INSERT INTO')) {
    if (!skipNext) {
      inInsert = true;
      currentStatement = line;
    }
  } else if (inInsert) {
    currentStatement += '\n' + line;
    if (trimmed.endsWith(';')) {
      insertStatements.push(currentStatement.trim());
      currentStatement = '';
      inInsert = false;
    }
  }
}

console.log(`Extracted ${insertStatements.length} INSERT statements for levels 2-5`);
console.log(`\nSample (first statement, first 300 chars):`);
console.log(insertStatements[0]?.substring(0, 300));

// Split into batches of 50
const batchSize = 50;
const batches: string[][] = [];
for (let i = 0; i < insertStatements.length; i += batchSize) {
  batches.push(insertStatements.slice(i, i + batchSize));
}

console.log(`\nSplit into ${batches.length} batches of up to ${batchSize} statements each`);

// Export for execution
export { batches, insertStatements };

