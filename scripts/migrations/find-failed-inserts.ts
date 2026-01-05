#!/usr/bin/env bun

/**
 * Find which INSERT statements failed to execute
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { Client } from 'pg';

const sqlFile = join(process.cwd(), 'migrations', 'new_category_hierarchy.sql');
const sql = readFileSync(sqlFile, 'utf-8');

// Extract all INSERT statements
const insertMatches = sql.match(/INSERT INTO core\.category[\s\S]+?;/g) || [];

// Extract path and name from each INSERT
interface CategoryInsert {
  sql: string;
  path?: string;
  name?: string;
  level?: number;
  parentPath?: string;
}

const inserts: CategoryInsert[] = insertMatches.map((sql) => {
  // Handle VALUES format: VALUES (..., 'Name', ..., '/path', ...)
  let pathMatch = sql.match(/VALUES\s*\([^)]*,\s*'([^']+)',\s*[^)]*,\s*(\d+),\s*'([^']+)'/);
  let nameMatch: RegExpMatchArray | null = null;
  let levelMatch: RegExpMatchArray | null = null;
  
  if (!pathMatch) {
    // Handle SELECT format: SELECT ..., 'Name', ..., level, path, ...
    pathMatch = sql.match(/SELECT\s+[^,]+,\s+'([^']+)',\s+[^,]+,\s+(\d+),\s+'([^']+)'/);
  }
  
  if (!pathMatch) {
    // Try alternative SELECT format with path construction
    nameMatch = sql.match(/name,\s+'([^']+)'/);
    levelMatch = sql.match(/level,\s+(\d+)/);
    const pathMatch1 = sql.match(/path = '([^']+)'/);
    const pathMatch2 = sql.match(/'([^']+)',\s*true/);
    const pathMatch3 = sql.match(/path = '([^']+)'/);
    
    return {
      sql,
      path: pathMatch1?.[1] || pathMatch2?.[1] || pathMatch3?.[1],
      name: nameMatch?.[1],
      level: levelMatch ? parseInt(levelMatch[1]) : undefined,
      parentPath: sql.match(/WHERE parent\.path = '([^']+)'/)?.[1],
    };
  }
  
  return {
    sql,
    path: pathMatch[3],
    name: pathMatch[1],
    level: parseInt(pathMatch[2]),
    parentPath: sql.match(/WHERE parent\.path = '([^']+)'/)?.[1],
  };
});

const connString =
  process.env.DATABASE_URL ||
  process.env.ENTERPRISE_DATABASE_URL ||
  process.env.NEON_CONNECTION_STRING ||
  process.env.NEON_SPP_DATABASE_URL;

if (!connString) {
  console.error('No database connection string found');
  process.exit(1);
}

const client = new Client({ connectionString: connString });

async function findFailed() {
  await client.connect();
  console.log('Connected to database\n');

  try {
    // Get all paths from database
    const dbResult = await client.query('SELECT path, name, level FROM core.category');
    const dbPaths = new Set(dbResult.rows.map((r) => r.path));
    const dbMap = new Map(dbResult.rows.map((r) => [r.path, r]));

    console.log(`Total INSERT statements: ${inserts.length}`);
    console.log(`Categories in database: ${dbResult.rows.length}\n`);

    // Find missing categories
    const missing: CategoryInsert[] = [];
    const failed: Array<CategoryInsert & { reason: string }> = [];

    for (const insert of inserts) {
      if (!insert.path) {
        failed.push({ ...insert, reason: 'No path found in SQL' });
        continue;
      }

      if (!dbPaths.has(insert.path)) {
        // Check if parent exists
        if (insert.parentPath && !dbPaths.has(insert.parentPath)) {
          failed.push({
            ...insert,
            reason: `Parent missing: ${insert.parentPath}`,
          });
        } else {
          missing.push(insert);
        }
      }
    }

    console.log(`Missing categories: ${missing.length}`);
    console.log(`Failed (parent missing): ${failed.length}\n`);

    if (missing.length > 0) {
      console.log('Missing categories:');
      missing.slice(0, 20).forEach((m, i) => {
        console.log(`  ${i + 1}. ${m.name} (${m.path}) - Level ${m.level}`);
      });
      if (missing.length > 20) {
        console.log(`  ... and ${missing.length - 20} more`);
      }
    }

    if (failed.length > 0) {
      console.log('\nFailed (parent missing):');
      failed.slice(0, 10).forEach((f, i) => {
        console.log(`  ${i + 1}. ${f.name} (${f.path}) - ${f.reason}`);
      });
      if (failed.length > 10) {
        console.log(`  ... and ${failed.length - 10} more`);
      }
    }

    // Group by level
    const missingByLevel: Record<number, number> = {};
    missing.forEach((m) => {
      if (m.level) {
        missingByLevel[m.level] = (missingByLevel[m.level] || 0) + 1;
      }
    });

    console.log('\nMissing by level:');
    Object.entries(missingByLevel)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .forEach(([level, count]) => {
        console.log(`  Level ${level}: ${count}`);
      });

    // Try to execute missing ones
    if (missing.length > 0) {
      console.log(`\n\nAttempting to execute ${missing.length} missing INSERT statements...`);
      let executed = 0;
      let errors = 0;

      for (const insert of missing) {
        try {
          await client.query(insert.sql);
          executed++;
        } catch (err: any) {
          errors++;
          console.error(`  ✗ Failed: ${insert.name} - ${err.message}`);
        }
      }

      console.log(`\nExecuted: ${executed}, Errors: ${errors}`);

      // Final count
      const finalResult = await client.query('SELECT COUNT(*) as total FROM core.category');
      console.log(`Final total: ${finalResult.rows[0].total}`);
    }
  } finally {
    await client.end();
  }
}

findFailed().catch(console.error);

