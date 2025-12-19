#!/usr/bin/env bun

/**
 * Execute remaining category INSERT statements (levels 2-5) in batches
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const sqlFile = join(process.cwd(), 'migrations', 'new_category_hierarchy.sql');
const fullSql = readFileSync(sqlFile, 'utf-8');

// Extract INSERT statements that are NOT level 1 (those use SELECT with parent lookup)
const lines = fullSql.split('\n');
const insertStatements: string[] = [];
let currentStatement = '';
let inInsert = false;
let isLevel1 = false;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const trimmed = line.trim();
  
  // Check if this is a level 1 category comment
  if (trimmed.match(/^-- \d+ [^(]+ \(Level 1\)/)) {
    isLevel1 = true;
  } else if (trimmed.match(/^-- \d+\./)) {
    isLevel1 = false; // Level 2+ category
  }
  
  if (trimmed.startsWith('INSERT INTO')) {
    inInsert = true;
    currentStatement = line;
  } else if (inInsert) {
    currentStatement += '\n' + line;
    if (trimmed.endsWith(';')) {
      // Only add if not level 1 (level 1 already inserted)
      if (!isLevel1) {
        insertStatements.push(currentStatement.trim());
      }
      currentStatement = '';
      inInsert = false;
      isLevel1 = false;
    }
  }
}

console.log(`Found ${insertStatements.length} INSERT statements for levels 2-5`);
console.log(`\nFirst statement (first 200 chars):`);
console.log(insertStatements[0]?.substring(0, 200));
console.log(`\nLast statement (last 200 chars):`);
console.log(insertStatements[insertStatements.length - 1]?.substring(Math.max(0, insertStatements[insertStatements.length - 1].length - 200)));

// Export for execution
export { insertStatements };

