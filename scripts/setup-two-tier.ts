/*
 * Two-Tier Inventory Setup Script
 *
 * Initializes SPP and IS-SOH databases and configures FDW bridging so existing
 * queries can join across schemas without code changes.
 *
 * Usage:
 *   npx tsx scripts/setup-two-tier.ts
 *
 * Env required:
 *   - NEON_SPP_DATABASE_URL        (SPP DB)
 *   - ENTERPRISE_DATABASE_URL      (IS-SOH DB)
 */

import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env: ${name}`);
  return v;
}

function parsePgUrl(dsn: string) {
  const u = new URL(dsn);
  return {
    host: u.hostname,
    port: u.port || '5432',
    database: (u.pathname || '/').replace(/^\//, '') || 'postgres',
    user: decodeURIComponent(u.username || ''),
    password: decodeURIComponent(u.password || ''),
  };
}

async function runSqlFile(pool: Pool, relPath: string) {
  const file = path.resolve(process.cwd(), relPath);
  const sql = fs.readFileSync(file, 'utf8');
  await pool.query(sql);
}

function retargetDsn(baseDsn: string, database: string) {
  const u = new URL(baseDsn);
  u.pathname = '/' + database;
  return u.toString();
}

async function main() {
  // Load .env.local if present for convenience
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });
  } catch {}

  const sppUrl = requireEnv('NEON_SPP_DATABASE_URL');
  const issohUrl = requireEnv('ENTERPRISE_DATABASE_URL');
  const adminUrl = process.env.DB_ADMIN_URL || process.env.DATABASE_URL;
  if (!adminUrl) {
    console.warn('No DB_ADMIN_URL/DATABASE_URL provided for elevated ops; using provided DSNs. You may need owner privileges.');
  }

  // Pools: try elevated admin for initialization where required
  const sppDbName = parsePgUrl(sppUrl).database;
  const issohDbName = parsePgUrl(issohUrl).database;
  const sppInitDsn = adminUrl ? retargetDsn(adminUrl, sppDbName) : sppUrl;
  const issohInitDsn = adminUrl ? retargetDsn(adminUrl, issohDbName) : issohUrl;

  const sppPool = new Pool({ connectionString: sppInitDsn, ssl: { rejectUnauthorized: false } });
  const issohPool = new Pool({ connectionString: issohInitDsn, ssl: { rejectUnauthorized: false } });

  console.log('=== Initializing SPP database (spp schema) ===');
  await runSqlFile(sppPool, 'database/scripts/spp_init_min.sql');
  console.log('✓ SPP init complete');

  console.log('=== Initializing IS-SOH database (core + serve schemas) ===');
  await runSqlFile(issohPool, 'database/scripts/core_serve_init_min.sql');
  console.log('✓ IS-SOH init complete');

  console.log('=== Configuring FDW from SPP -> IS-SOH for core/serve ===');
  const issoh = parsePgUrl(issohUrl);

  // Create FDW server + mapping in SPP DB pointing to IS-SOH
  // Safe if re-run: uses IF NOT EXISTS checks
  const fdwSql = `
    CREATE EXTENSION IF NOT EXISTS postgres_fdw;
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_foreign_server WHERE srvname = 'issoh_server') THEN
        CREATE SERVER issoh_server
          FOREIGN DATA WRAPPER postgres_fdw
          OPTIONS (
            host '${issoh.host}',
            dbname '${issoh.database}',
            port '${issoh.port}'
          );
      END IF;
    END $$;

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_user_mappings WHERE srvname = 'issoh_server' AND umuser = current_user::regrole
      ) THEN
        CREATE USER MAPPING FOR CURRENT_USER
          SERVER issoh_server
          OPTIONS (
            user '${issoh.user}',
            password '${issoh.password.replace(/'/g, "''")}'
          );
      END IF;
    END $$;

    CREATE SCHEMA IF NOT EXISTS core;
    CREATE SCHEMA IF NOT EXISTS serve;
  `;

  await sppPool.query(fdwSql);

  // Attempt schema import; ignore if already imported
  const importSql = `
    IMPORT FOREIGN SCHEMA core FROM SERVER issoh_server INTO core;
    IMPORT FOREIGN SCHEMA serve FROM SERVER issoh_server INTO serve;
  `;

  try {
    await sppPool.query(importSql);
    console.log('✓ FDW import complete (core, serve)');
  } catch (err: any) {
    console.warn('! FDW import warning:', err?.message || err);
  }

  // Quick verification
  const ver1 = await sppPool.query("SELECT to_regclass('spp.pricelist_upload') AS exists");
  const ver2 = await issohPool.query("SELECT to_regclass('core.supplier') AS exists");
  console.log('Verification:', {
    spp_pricelist_upload: ver1.rows[0]?.exists,
    core_supplier: ver2.rows[0]?.exists,
  });

  await sppPool.end();
  await issohPool.end();
  console.log('=== Two-tier setup finished ===');
}

main().catch((err) => {
  console.error('Setup failed:', err);
  process.exit(1);
});
