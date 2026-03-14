#!/usr/bin/env bun
/**
 * Run Xero migrations 0257 and 0264
 * 0257 creates xero tables; 0264 alters org_id to TEXT for Clerk compatibility.
 * Uses DATABASE_URL from .env.local
 */
import { Pool } from 'pg';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL not set. Load .env.local first.');
  process.exit(1);
}

const pool = new Pool({ connectionString: databaseUrl });
const migrationsDir = join(import.meta.dir, '..', 'database', 'migrations');

async function runMigrationFile(name: string) {
  const path = join(migrationsDir, name);
  if (!existsSync(path)) {
    throw new Error(`Migration not found: ${path}`);
  }
  const content = readFileSync(path, 'utf8');
  await pool.query(content);
  console.log(`  Executed ${name}`);
}

async function isApplied(name: string): Promise<boolean> {
  const r = await pool.query(
    'SELECT 1 FROM schema_migrations WHERE migration_name = $1',
    [name.replace('.sql', '')]
  );
  return r.rows.length > 0;
}

async function main() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      migration_name text PRIMARY KEY,
      executed_at timestamptz DEFAULT now()
    );
  `);

  // Remove incorrectly applied 0264 (only INSERT ran before)
  await pool.query(
    "DELETE FROM schema_migrations WHERE migration_name = '0264_xero_org_id_text'"
  );

  if (!(await isApplied('0257_xero_integration'))) {
    console.log('Running 0257_xero_integration.sql...');
    await runMigrationFile('0257_xero_integration.sql');
    await pool.query(
      "INSERT INTO schema_migrations (migration_name) VALUES ('0257_xero_integration') ON CONFLICT DO NOTHING"
    );
    console.log('  0257 applied');
  } else {
    console.log('0257 already applied, skipping');
  }

  console.log('Running 0264_xero_org_id_text.sql...');
  await runMigrationFile('0264_xero_org_id_text.sql');
  await pool.query(
    "INSERT INTO schema_migrations (migration_name) VALUES ('0264_xero_org_id_text') ON CONFLICT DO NOTHING"
  );
  console.log('  0264 applied');

  await pool.end();
  console.log('Xero migrations completed successfully.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
