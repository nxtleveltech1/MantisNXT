/**
 * List Xero connection tenant IDs from the database.
 * Run: bun run scripts/database/xero-list-tenant-ids.ts
 * Requires: DATABASE_URL in .env.local or environment
 *
 * Use this to find the Xero tenant ID for a company (e.g. "NXT DOTX").
 */

import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set. Use .env.local or export DATABASE_URL.');
    process.exit(1);
  }

  const rows = await sql`
    SELECT org_id, xero_tenant_id, xero_tenant_name, connected_at, is_active
    FROM xero_connections
    WHERE is_active = true
    ORDER BY connected_at DESC
  `;

  if (rows.length === 0) {
    console.log('No active Xero connections found.');
    console.log('Connect to Xero from the app (Integrations → Xero Accounting) then run this again.');
    return;
  }

  console.log('Active Xero connections:\n');
  for (const row of rows as Array<{ org_id: string; xero_tenant_id: string; xero_tenant_name: string; connected_at: string; is_active: boolean }>) {
    console.log(`  Xero tenant name: ${row.xero_tenant_name ?? '(unknown)'}`);
    console.log(`  Xero tenant ID:   ${row.xero_tenant_id}`);
    console.log(`  App org_id:       ${row.org_id}`);
    console.log(`  Connected at:     ${row.connected_at}`);
    console.log('');
  }

  const nxtDotx = (rows as Array<{ xero_tenant_name: string; xero_tenant_id: string }>).find(
    (r) => r.xero_tenant_name && /nxt\s*dotx|nxtdotx/i.test(r.xero_tenant_name)
  );
  if (nxtDotx) {
    console.log('---');
    console.log(`Xero tenant ID for company "NXT DOTX": ${nxtDotx.xero_tenant_id}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
