/**
 * Execute category migration level by level via Neon MCP
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
        statements.push(currentStatement.trim());
        currentStatement = '';
      }
    }
  }

  return statements;
}

// Export for manual execution
const levels = [1, 2, 3, 4, 5];
const allStatements: { level: number; statements: string[] }[] = [];

for (const level of levels) {
  const statements = extractLevelStatements(level);
  allStatements.push({ level, statements });
  console.log(`Level ${level}: ${statements.length} statements`);
}

// Output as JSON for use with Neon MCP
console.log('\n=== Level 1 Statements ===');
console.log(JSON.stringify(allStatements[0].statements, null, 2));
