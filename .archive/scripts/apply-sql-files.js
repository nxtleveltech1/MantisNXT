// Apply one or more SQL files to the configured database
// Usage: node scripts/apply-sql-files.js <file1.sql> [file2.sql ...]

require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const cfg = {
  host: process.env.DB_HOST || '62.169.20.53',
  port: parseInt(process.env.DB_PORT || '6600', 10),
  database: process.env.DB_NAME || 'nxtprod-db_001',
  user: process.env.DB_USER || 'nxtdb_admin',
  password: process.env.DB_PASSWORD || 'P@33w0rd-1',
  ssl: false,
  max: 5,
  connectionTimeoutMillis: 30000,
  idleTimeoutMillis: 30000,
};

async function run() {
  const files = process.argv.slice(2);
  if (files.length === 0) {
    console.error('No SQL files provided.');
    process.exit(1);
  }
  const pool = new Pool(cfg);
  const client = await pool.connect();
  try {
    for (const f of files) {
      const abs = path.resolve(process.cwd(), f);
      if (!fs.existsSync(abs)) throw new Error(`Missing SQL file: ${abs}`);
      const sql = fs.readFileSync(abs, 'utf8');
      console.log(`\nApplying SQL: ${abs}`);
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('COMMIT');
        console.log(`Applied: ${path.basename(abs)}`);
      } catch (e) {
        await client.query('ROLLBACK');
        console.error(`Failed applying ${abs}:`, e.message);
        throw e;
      }
    }
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((e) => {
  console.error('Migration run failed:', e);
  process.exit(1);
});

