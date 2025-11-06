#!/usr/bin/env tsx
import pg from 'pg';

const { Pool } = pg;

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL required');
  process.exit(1);
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  const res = await pool.query(`
    SELECT schemaname, tablename FROM pg_tables
    WHERE schemaname NOT IN ('pg_catalog', 'information_schema', 'pgbench')
    ORDER BY schemaname, tablename;
  `);

  console.log('Tables in database:');
  res.rows.forEach((row: any) => {
    console.log(`  ${row.schemaname}.${row.tablename}`);
  });

  // Check specifically for organization and auth tables
  const orgRes = await pool.query(`SELECT 1 FROM pg_tables WHERE tablename = 'organization' AND schemaname = 'public';`);
  const authRes = await pool.query(`SELECT 1 FROM pg_tables WHERE tablename = 'users_extended' AND schemaname = 'auth';`);

  console.log('\nCritical tables for 0024:');
  console.log(`  organization: ${orgRes.rows.length > 0 ? 'EXISTS' : 'MISSING'}`);
  console.log(`  auth.users_extended: ${authRes.rows.length > 0 ? 'EXISTS' : 'MISSING'}`);

  await pool.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
