#!/usr/bin/env bun
/**
 * Seed mock financial data - one set of each entity for dashboard/testing
 * Run: bun scripts/database/seed-financial-mock.ts
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { Pool } from 'pg';

const databaseUrl = process.env.DATABASE_URL || process.env.NEON_SPP_DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL or NEON_SPP_DATABASE_URL required');
  process.exit(1);
}

const sqlPath = join(process.cwd(), 'database', 'scripts', 'seed_financial_mock.sql');
const sql = readFileSync(sqlPath, 'utf8').replace(/\\set ON_ERROR_STOP on\n/, '');

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
  max: 1,
});

async function main() {
  try {
    console.log('Seeding mock financial data...');
    await pool.query(sql);
    console.log('Done.');
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
