#!/usr/bin/env bun

/**
 * Execute remaining category INSERT statements directly via pg client
 * This script reads the all_inserts.json and executes all remaining INSERTs
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { Client } from 'pg';

const jsonFile = join(process.cwd(), 'migrations', 'all_inserts.json');
const inserts: string[] = JSON.parse(readFileSync(jsonFile, 'utf-8'));

// Get database connection
const connString =
  process.env.DATABASE_URL ||
  process.env.ENTERPRISE_DATABASE_URL ||
  process.env.NEON_CONNECTION_STRING ||
  process.env.NEON_SPP_DATABASE_URL;

if (!connString) {
  console.error('No database connection string found. Set DATABASE_URL or NEON_CONNECTION_STRING');
  process.exit(1);
}

const client = new Client({ connectionString: connString });

async function executeRemaining() {
  await client.connect();
  console.log('Connected to database');

  try {
    // Check current count
    const countResult = await client.query('SELECT COUNT(*) as total FROM core.category');
    const currentCount = parseInt(countResult.rows[0].total);
    console.log(`Current categories in database: ${currentCount}`);

    // Add NOT EXISTS clauses to prevent duplicates
    const safeInserts = inserts.map((insert) => {
      const pathMatch = insert.match(/path = '([^']+)'/);
      if (pathMatch) {
        const path = pathMatch[1];
        return insert.replace(
          /FROM core\.category parent\nWHERE parent\.path = '[^']+';/g,
          `FROM core.category parent\nWHERE parent.path = '${path}'\nAND NOT EXISTS (SELECT 1 FROM core.category WHERE path = '${path}');`
        );
      }
      return insert;
    });

    console.log(`\nExecuting ${safeInserts.length} INSERT statements...`);

    // Execute in batches of 50
    const batchSize = 50;
    let executed = 0;
    let errors = 0;

    for (let i = 0; i < safeInserts.length; i += batchSize) {
      const batch = safeInserts.slice(i, i + batchSize);
      console.log(`\nExecuting batch ${Math.floor(i / batchSize) + 1} (${batch.length} statements)...`);

      try {
        await client.query('BEGIN');
        for (const sql of batch) {
          try {
            await client.query(sql);
            executed++;
          } catch (err: any) {
            // Skip duplicate errors
            if (err.code === '23505' || err.message?.includes('duplicate')) {
              console.log(`  Skipped duplicate: ${sql.match(/name,\s+'([^']+)'/)?.[1] || 'unknown'}`);
            } else {
              console.error(`  Error: ${err.message}`);
              errors++;
            }
          }
        }
        await client.query('COMMIT');
        console.log(`  ✓ Batch completed (${executed} executed, ${errors} errors)`);
      } catch (err: any) {
        await client.query('ROLLBACK');
        console.error(`  ✗ Batch failed: ${err.message}`);
        errors += batch.length;
      }
    }

    // Final count
    const finalResult = await client.query('SELECT COUNT(*) as total FROM core.category');
    const finalCount = parseInt(finalResult.rows[0].total);
    console.log(`\n✅ Migration complete!`);
    console.log(`   Total categories: ${finalCount}`);
    console.log(`   Executed: ${executed}`);
    console.log(`   Errors: ${errors}`);
  } finally {
    await client.end();
  }
}

executeRemaining().catch(console.error);

