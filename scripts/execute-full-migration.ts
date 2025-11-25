/**
 * Execute full category migration by reading SQL file and executing via Neon connection
 * This script reads the migration file and executes it in chunks
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const migrationFile = join(process.cwd(), 'migrations', '0034_seed_comprehensive_category_hierarchy.sql');
const content = readFileSync(migrationFile, 'utf-8');

// Split into individual INSERT statements
const statements: string[] = [];
let currentStatement = '';

const lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Skip comments, BEGIN/COMMIT, and function definitions
  if (line.trim().startsWith('--') || 
      line.trim() === 'BEGIN;' || 
      line.trim() === 'COMMIT;' ||
      line.includes('CREATE OR REPLACE FUNCTION') ||
      line.includes('DO $$')) {
    continue;
  }
  
  currentStatement += line + '\n';
  
  if (line.trim().endsWith(';')) {
    const stmt = currentStatement.trim();
    if (stmt.startsWith('INSERT INTO')) {
      statements.push(stmt);
    }
    currentStatement = '';
  }
}

console.log(`Total INSERT statements: ${statements.length}`);
console.log(`\nFirst 3 statements:`);
statements.slice(0, 3).forEach((s, i) => {
  console.log(`\n${i + 1}. ${s.substring(0, 100)}...`);
});

// Group by level (approximate - based on level value in INSERT)
const byLevel: { [key: number]: string[] } = {};
statements.forEach(stmt => {
  const levelMatch = stmt.match(/level,\s*(\d+),/);
  if (levelMatch) {
    const level = parseInt(levelMatch[1]);
    if (!byLevel[level]) byLevel[level] = [];
    byLevel[level].push(stmt);
  }
});

console.log(`\nStatements by level:`);
Object.keys(byLevel).sort().forEach(level => {
  console.log(`  Level ${level}: ${byLevel[parseInt(level)].length} statements`);
});

// Output for manual execution
console.log(`\n=== Ready to execute ===`);
console.log(`Execute Level 2 (${byLevel[2]?.length || 0} statements) via Neon MCP run_sql_transaction`);

