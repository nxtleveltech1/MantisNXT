#!/usr/bin/env bun
/**
 * Seed Xero demo data for NXT DOTX org using DATABASE_URL.
 * Run: bun scripts/seed-xero-demo-dotx.ts
 */

import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';

const databaseUrl = process.env.DATABASE_URL ?? process.env.NEON_SPP_DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL or NEON_SPP_DATABASE_URL required');
  process.exit(1);
}

const seedPath = join(import.meta.dir, '..', 'database', 'scripts', 'seed_xero_demo_dotx.sql');
let sql = readFileSync(seedPath, 'utf-8');
// Remove psql directive and ensure we don't double-wrap in transaction
sql = sql.replace(/\\set ON_ERROR_STOP on\n/, '').trim();

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
  max: 1,
});

async function main() {
  try {
    console.log('Seeding Xero demo data for NXT DOTX...');
    await pool.query(sql);
    console.log('Done. NXT DOTX org has suppliers, customers, products, AR/AP invoices.');
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
