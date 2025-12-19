#!/usr/bin/env bun

import { readFileSync } from 'fs';
import { join } from 'path';

const jsonFile = join(process.cwd(), 'migrations', 'all_inserts.json');
const inserts: string[] = JSON.parse(readFileSync(jsonFile, 'utf-8'));

// Add NOT EXISTS clauses to prevent duplicates
const safeInserts = inserts.map(insert => {
  // Extract the path from the INSERT statement
  const pathMatch = insert.match(/path = '([^']+)'/);
  if (pathMatch) {
    const path = pathMatch[1];
    // Add NOT EXISTS clause before the semicolon
    return insert.replace(/FROM core\.category parent\nWHERE parent\.path = '[^']+';/g, 
      `FROM core.category parent\nWHERE parent.path = '${path}'\nAND NOT EXISTS (SELECT 1 FROM core.category WHERE path = '${path}');`);
  }
  return insert;
});

console.log(`Processed ${safeInserts.length} INSERT statements with NOT EXISTS clauses`);

// Split into batches of 50
const batchSize = 50;
const batches: string[][] = [];
for (let i = 0; i < safeInserts.length; i += batchSize) {
  batches.push(safeInserts.slice(i, i + batchSize));
}

console.log(`\nSplit into ${batches.length} batches:`);
batches.forEach((batch, idx) => {
  console.log(`  Batch ${idx + 1}: ${batch.length} statements`);
});

// Export batches for execution
export { batches, safeInserts };

