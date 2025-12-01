import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Pool } from 'pg';

function loadEnv() {
  try {
    require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });
  } catch {}
}
function pickAdminDsn(): string {
  for (const k of ['DATABASE_URL', 'ENTERPRISE_DATABASE_URL', 'NEON_SPP_DATABASE_URL']) {
    const v = process.env[k];
    if (v) return v;
  }
  throw new Error('No admin DSN in env');
}
function parseDsn(dsn: string) {
  const u = new URL(dsn);
  return {
    host: u.hostname,
    port: u.port || '5432',
    database: (u.pathname || '/').replace(/^\//, '') || 'postgres',
    user: decodeURIComponent(u.username || ''),
    password: decodeURIComponent(u.password || ''),
  };
}
function genPassword(len = 18) {
  return crypto.randomBytes(len).toString('base64url');
}
async function ensureDatabase(admin: Pool, name: string) {
  const r = await admin.query('SELECT 1 FROM pg_database WHERE datname=$1', [name]);
  if (r.rowCount && r.rowCount > 0) {
    console.log(`DB exists: ${name}`);
    return;
  }
  console.log(`Creating database: ${name}`);
  await admin.query(`CREATE DATABASE ${name}`);
}
async function runSqlFile(pool: Pool, rel: string) {
  const sql = fs.readFileSync(path.resolve(process.cwd(), rel), 'utf8');
  await pool.query(sql);
}
async function ensureRole(admin: Pool, role: string, pass: string) {
  const r = await admin.query('SELECT 1 FROM pg_roles WHERE rolname=$1', [role]);
  const esc = pass.replace(/'/g, "''");
  if (r.rowCount && r.rowCount > 0) {
    console.log(`Role exists: ${role}`);
    await admin.query(`ALTER ROLE ${role} WITH LOGIN PASSWORD '${esc}'`);
    return;
  }
  console.log(`Creating role: ${role}`);
  await admin.query(`CREATE ROLE ${role} WITH LOGIN PASSWORD '${esc}'`);
}
async function grantDb(admin: Pool, db: string, role: string) {
  await admin.query(`GRANT CONNECT ON DATABASE ${db} TO ${role}`);
}
async function transferOwnershipAll(pool: Pool, schema: string, role: string) {
  try {
    await pool.query(`ALTER SCHEMA ${schema} OWNER TO ${role}`);
    const t = await pool.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema=$1 AND table_type='BASE TABLE'`,
      [schema]
    );
    for (const r of t.rows) {
      await pool.query(`ALTER TABLE ${schema}.${r.table_name} OWNER TO ${role}`);
    }
  } catch (e) {
    console.warn(`Ownership transfer failed for schema ${schema}. Falling back to GRANTs.`);
    await pool.query(`GRANT USAGE ON SCHEMA ${schema} TO ${role}`);
    await pool.query(`GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA ${schema} TO ${role}`);
    await pool.query(`GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA ${schema} TO ${role}`);
    await pool.query(
      `ALTER DEFAULT PRIVILEGES IN SCHEMA ${schema} GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${role}`
    );
    await pool.query(
      `ALTER DEFAULT PRIVILEGES IN SCHEMA ${schema} GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO ${role}`
    );
  }
}
function buildDsn(h: string, p: string, d: string, u: string, ps: string) {
  return `postgresql://${encodeURIComponent(u)}:${encodeURIComponent(ps)}@${h}:${p}/${d}?sslmode=require`;
}
function updateEnvLocal(vars: Record<string, string>) {
  const envPath = path.resolve(process.cwd(), '.env.local');
  let content = '';
  try {
    content = fs.readFileSync(envPath, 'utf8');
  } catch {}
  const lines = content ? content.split(/\r?\n/) : [];
  const keys = Object.keys(vars);
  const set = new Set(keys);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const line of lines) {
    const m = line.match(/^([A-Z0-9_]+)=/);
    if (m && set.has(m[1])) {
      out.push(`${m[1]}=${vars[m[1]]}`);
      seen.add(m[1]);
    } else out.push(line);
  }
  for (const k of keys) {
    if (!seen.has(k)) out.push(`${k}=${vars[k]}`);
  }
  fs.writeFileSync(envPath, out.join('\n'), 'utf8');
}

async function main() {
  loadEnv();
  const adminDsn = pickAdminDsn();
  const admin = parseDsn(adminDsn);
  const adminPool = new Pool({ connectionString: adminDsn, ssl: { rejectUnauthorized: false } });
  const sppDb = 'mantis_spp',
    issohDb = 'mantis_issoh',
    sppRole = 'mantis_spp_user',
    issohRole = 'mantis_issoh_user';
  const sppPass = genPassword(),
    issohPass = genPassword();
  await ensureDatabase(adminPool, sppDb);
  await ensureDatabase(adminPool, issohDb);
  await ensureRole(adminPool, sppRole, sppPass);
  await ensureRole(adminPool, issohRole, issohPass);
  await grantDb(adminPool, sppDb, sppRole);
  await grantDb(adminPool, issohDb, issohRole);
  const sppPool = new Pool({
    connectionString: buildDsn(admin.host, admin.port, sppDb, admin.user, admin.password),
    ssl: { rejectUnauthorized: false },
  });
  const issohPool = new Pool({
    connectionString: buildDsn(admin.host, admin.port, issohDb, admin.user, admin.password),
    ssl: { rejectUnauthorized: false },
  });
  await runSqlFile(sppPool, 'database/scripts/spp_init_min.sql');
  await transferOwnershipAll(sppPool, 'spp', sppRole);
  await runSqlFile(issohPool, 'database/scripts/core_serve_init_min.sql');
  await transferOwnershipAll(issohPool, 'core', issohRole);
  await transferOwnershipAll(issohPool, 'serve', issohRole);
  await sppPool.end();
  await issohPool.end();
  await adminPool.end();
  const sppDsn = buildDsn(admin.host, admin.port, sppDb, sppRole, sppPass);
  const issohDsn = buildDsn(admin.host, admin.port, issohDb, issohRole, issohPass);
  updateEnvLocal({ NEON_SPP_DATABASE_URL: sppDsn, ENTERPRISE_DATABASE_URL: issohDsn });
  console.log('Updated .env.local. Re-running two-tier setup...');
  const { spawn } = await import('child_process');
  await new Promise<void>((resolve, reject) => {
    const cp = spawn(
      process.platform === 'win32' ? 'npx.cmd' : 'npx',
      ['-y', 'tsx', 'scripts/setup-two-tier.ts'],
      { stdio: 'inherit', env: { ...process.env } }
    );
    cp.on('exit', c => (c === 0 ? resolve() : reject(new Error('setup-two-tier failed'))));
  });
  console.log('Bootstrap complete.');
}

main().catch(e => {
  console.error('Bootstrap failed:', e);
  process.exit(1);
});
