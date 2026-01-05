/**
 * Extract and prepare remaining migration statements for execution
 * Groups statements by level for batch execution
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const migrationFile = join(
  process.cwd(),
  'migrations',
  '0034_seed_comprehensive_category_hierarchy.sql'
);
const content = readFileSync(migrationFile, 'utf-8');

function extractLevelStatements(level: number): string[] {
  const levelMarker = `-- Level ${level} Categories`;
  const lines = content.split('\n');
  let inLevel = false;
  const statements: string[] = [];
  let currentStatement = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.includes(levelMarker)) {
      inLevel = true;
      continue;
    }

    if (inLevel) {
      if (line.match(/^-- Level \d+ Categories/)) {
        break;
      }

      if (line.trim().startsWith('--') || line.trim() === '') {
        continue;
      }

      if (line.trim() === 'BEGIN;' || line.trim() === 'COMMIT;') {
        continue;
      }

      currentStatement += line + '\n';

      if (line.trim().endsWith(';')) {
        statements.push(currentStatement.trim());
        currentStatement = '';
      }
    }
  }

  return statements;
}

// Extract all remaining levels
const levels = [3, 4, 5];
const batches: { level: number; batchNum: number; statements: string[] }[] = [];

for (const level of levels) {
  const statements = extractLevelStatements(level);
  const batchSize = 20;

  for (let i = 0; i < statements.length; i += batchSize) {
    const batch = statements.slice(i, i + batchSize);
    batches.push({
      level,
      batchNum: Math.floor(i / batchSize) + 1,
      statements: batch,
    });
  }

  console.log(
    `Level ${level}: ${statements.length} statements in ${Math.ceil(statements.length / batchSize)} batches`
  );
}

console.log(`\nTotal batches to execute: ${batches.length}`);
console.log(`\nFirst batch of Level 3 (statements 21-40):`);
console.log(
  JSON.stringify(
    batches.find(b => b.level === 3 && b.batchNum === 2)?.statements.slice(0, 2),
    null,
    2
  )
);
