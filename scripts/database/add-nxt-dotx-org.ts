#!/usr/bin/env bun
/**
 * Add NXT DOTX organization to the database.
 * Run: bun scripts/database/add-nxt-dotx-org.ts
 */

import { Pool } from 'pg';

const databaseUrl = process.env.DATABASE_URL || process.env.NEON_SPP_DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL or NEON_SPP_DATABASE_URL required');
  process.exit(1);
}

const sql = `
INSERT INTO organization (id, name, slug, plan_type, is_active)
VALUES (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'NXT DOTX',
  'nxt-dotx',
  'starter',
  true
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();
`;

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
  max: 1,
});

async function main() {
  try {
    console.log('Adding NXT DOTX organization...');
    await pool.query(sql);
    console.log('Done. NXT DOTX should now appear in the org switcher.');
  } catch (err) {
    console.error('Failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
