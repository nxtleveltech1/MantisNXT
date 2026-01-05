/**
 * Execute category migration via Neon MCP
 * Reads migration file and executes level by level
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

// Extract all levels
const levels = [1, 2, 3, 4, 5];
const allLevels: { level: number; statements: string[] }[] = [];

for (const level of levels) {
  const statements = extractLevelStatements(level);
  allLevels.push({ level, statements });
  console.log(`Level ${level}: ${statements.length} statements`);
}

// Output Level 2 statements as JSON array for Neon MCP
console.log('\n=== Level 2 Statements (first 5) ===');
console.log(JSON.stringify(allLevels[1].statements.slice(0, 5), null, 2));
