/**
 * Extract SQL statements for a specific level from migration file
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const migrationFile = join(
  process.cwd(),
  'migrations',
  '0034_seed_comprehensive_category_hierarchy.sql'
);
const content = readFileSync(migrationFile, 'utf-8');

const level = parseInt(process.argv[2] || '1');
const levelMarker = `-- Level ${level} Categories`;

const lines = content.split('\n');
let inLevel = false;
let levelSql: string[] = [];
let currentStatement = '';

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  if (line.includes(levelMarker)) {
    inLevel = true;
    continue;
  }

  if (inLevel) {
    // Check if we've hit the next level
    if (line.match(/^-- Level \d+ Categories/)) {
      break;
    }

    // Skip comments and empty lines
    if (line.trim().startsWith('--') || line.trim() === '') {
      continue;
    }

    // Skip BEGIN/COMMIT
    if (line.trim() === 'BEGIN;' || line.trim() === 'COMMIT;') {
      continue;
    }

    currentStatement += line + '\n';

    // Check if statement is complete (ends with semicolon)
    if (line.trim().endsWith(';')) {
      levelSql.push(currentStatement.trim());
      currentStatement = '';
    }
  }
}

console.log(JSON.stringify(levelSql, null, 2));
