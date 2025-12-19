#!/usr/bin/env bun

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const sqlFile = join(process.cwd(), 'migrations', 'levels_2_5_only.sql');
const fullSql = readFileSync(sqlFile, 'utf-8');

// Extract all INSERT statements (handling multi-line)
const statements: string[] = [];
let currentStatement = '';
let inInsert = false;

const lines = fullSql.split('\n');
for (const line of lines) {
  const trimmed = line.trim();
  
  if (trimmed.startsWith('INSERT INTO')) {
    if (inInsert) {
      // Previous INSERT wasn't closed properly
      statements.push(currentStatement.trim());
    }
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

// Handle any remaining statement
if (currentStatement.trim()) {
  statements.push(currentStatement.trim());
}

console.log(`Extracted ${statements.length} INSERT statements`);

// Write to JSON file for easy import
const outputFile = join(process.cwd(), 'migrations', 'all_inserts.json');
writeFileSync(outputFile, JSON.stringify(statements, null, 2));

console.log(`Saved to ${outputFile}`);

// Also create batches
const batchSize = 50;
const batches: string[][] = [];
for (let i = 0; i < statements.length; i += batchSize) {
  batches.push(statements.slice(i, i + batchSize));
}

console.log(`\nSplit into ${batches.length} batches of up to ${batchSize} statements`);
console.log(`\nBatch sizes: ${batches.map(b => b.length).join(', ')}`);

export { statements, batches };

