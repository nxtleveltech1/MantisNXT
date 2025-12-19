#!/usr/bin/env bun

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const sqlFile = join(process.cwd(), 'migrations', 'new_category_hierarchy.sql');
const fullSql = readFileSync(sqlFile, 'utf-8');

const lines = fullSql.split('\n');
const filtered: string[] = [];
let skipLevel1 = false;
let inInsert = false;
let currentInsert = '';

filtered.push('BEGIN;');
filtered.push('');
filtered.push('-- Insert categories for levels 2-5 only (level 1 already inserted)');
filtered.push('');

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const trimmed = line.trim();
  
  // Skip level 1 category comments
  if (trimmed.includes('Level 1)')) {
    skipLevel1 = true;
    inInsert = false;
    currentInsert = '';
    continue;
  }
  
  // Reset skip flag for level 2+
  if (trimmed.match(/Level [2-5]\)/)) {
    skipLevel1 = false;
  }
  
  // Skip DELETE and UPDATE statements
  if (trimmed.startsWith('DELETE') || trimmed.startsWith('UPDATE') || 
      trimmed.includes('Step 1') || trimmed.includes('Step 2')) {
    continue;
  }
  
  // Handle INSERT statements
  if (trimmed.startsWith('INSERT INTO')) {
    if (skipLevel1) {
      inInsert = true;
      currentInsert = '';
      continue; // Skip level 1 INSERTs
    } else {
      inInsert = true;
      currentInsert = line;
    }
  } else if (inInsert) {
    if (skipLevel1) {
      // Still skipping level 1 INSERT
      if (trimmed.endsWith(';')) {
        inInsert = false;
        currentInsert = '';
      }
      continue;
    } else {
      currentInsert += '\n' + line;
      if (trimmed.endsWith(';')) {
        filtered.push(currentInsert);
        inInsert = false;
        currentInsert = '';
      }
    }
  } else {
    // Regular line - include if not skipping level 1
    if (!skipLevel1 || trimmed.startsWith('--') || trimmed === '') {
      filtered.push(line);
    }
  }
}

filtered.push('');
filtered.push('COMMIT;');

const newSql = filtered.join('\n');
const outputFile = join(process.cwd(), 'migrations', 'levels_2_5_only.sql');
writeFileSync(outputFile, newSql);

console.log(`Created ${outputFile}`);
console.log(`Length: ${newSql.length} characters`);
console.log(`Lines: ${filtered.length}`);

