/**
 * Execute category hierarchy migration level by level
 * Reads migration file and executes each level separately via Neon MCP
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const migrationFile = join(
  process.cwd(),
  'migrations',
  '0034_seed_comprehensive_category_hierarchy.sql'
);
const content = readFileSync(migrationFile, 'utf-8');

// Split by level markers
const levels: { level: number; sql: string }[] = [];
const levelMarkers = [
  { level: 1, marker: '-- Level 1 Categories' },
  { level: 2, marker: '-- Level 2 Categories' },
  { level: 3, marker: '-- Level 3 Categories' },
  { level: 4, marker: '-- Level 4 Categories' },
  { level: 5, marker: '-- Level 5 Categories' },
];

let currentLevel = 0;
let currentSql = '';
const lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  // Check if this is a level marker
  const marker = levelMarkers.find(m => line.includes(m.marker));
  if (marker) {
    // Save previous level if exists
    if (currentLevel > 0 && currentSql.trim()) {
      levels.push({ level: currentLevel, sql: currentSql.trim() });
    }
    currentLevel = marker.level;
    currentSql = '';
    continue;
  }

  // Skip BEGIN/COMMIT and function definitions (already executed)
  if (
    line.trim() === 'BEGIN;' ||
    line.trim() === 'COMMIT;' ||
    line.includes('CREATE OR REPLACE FUNCTION') ||
    line.includes('DO $$')
  ) {
    continue;
  }

  // Collect SQL for current level
  if (currentLevel > 0) {
    currentSql += line + '\n';
  }
}

// Save last level
if (currentLevel > 0 && currentSql.trim()) {
  levels.push({ level: currentLevel, sql: currentSql.trim() });
}

console.log(`Found ${levels.length} levels to execute`);
levels.forEach(l => {
  const insertCount = (l.sql.match(/INSERT INTO/g) || []).length;
  console.log(`  Level ${l.level}: ${insertCount} INSERT statements`);
});

// Export for use in execution
export { levels };
