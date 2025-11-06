/*
 Phase A DB execution via Neon MCP server
 - Connects to an MCP server (Streamable HTTP) specified by env NEON_MCP_URL
 - Optional bearer auth via NEON_MCP_TOKEN
 - Discovers a suitable SQL execution tool and applies Phase A migrations
 - Falls back to verification queries

 Usage:
   NEON_MCP_URL=https://<your-mcp-endpoint>/mcp \
   NEON_MCP_TOKEN=<token-if-required> \
   tsx scripts/neon-mcp-apply.ts --apply --verify

 Notes:
 - Tool discovery is heuristic: prefers names containing "sql", then "query", then "execute".
 - Arguments tried per tool: {sql}, {query}, {text}, {statements}, {input}
*/

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

type ToolInfo = { name: string; description?: string };

function env(name: string, required = true): string | undefined {
  const v = process.env[name];
  if (required && !v) throw new Error(`${name} is required`);
  return v;
}

const serverUrl = process.env.NEON_MCP_URL; // not used in this script (stdio mode)
const token = process.env.NEON_MCP_TOKEN; // not used in this script (stdio mode)
const neonApiKey = process.env.NEON_API_KEY; // for stdio server spawn
const neonConnStr = process.env.NEON_CONNECTION_STRING || process.env.NEON_SPP_DATABASE_URL || process.env.DATABASE_URL;
const neonProjectId = process.env.NEON_PROJECT_ID;
const neonBranchId = process.env.NEON_BRANCH_ID;
const neonEndpointId = process.env.NEON_ENDPOINT_ID;
const neonDatabase = process.env.NEON_DATABASE;

const args = new Set(process.argv.slice(2));
const doApply = args.has('--apply') || !args.has('--verify');
const doVerify = args.has('--verify') || !args.has('--apply');

const PHASE_A_MIGRATIONS = [
  'database/migrations/005_fix_analytics_sequences.sql',
  'database/migrations/006_add_supplier_contact_person.sql',
  'database/migrations/neon/005_update_public_suppliers_view_add_contact_person.sql'
];

const VERIFICATION_QUERIES = [
  // Verify analytics sequences
  `SELECT pg_get_serial_sequence('core.analytics_anomalies', 'anomaly_id') IS NOT NULL AS anomalies_seq_ok;`,
  `SELECT pg_get_serial_sequence('core.analytics_predictions', 'prediction_id') IS NOT NULL AS predictions_seq_ok;`,
  // Verify supplier contact_person column
  `SELECT 1 AS contact_person_ok FROM information_schema.columns WHERE table_schema='core' AND table_name='supplier' AND column_name='contact_person';`,
  // Verify public view exposes contact_person
  `SELECT 1 AS view_has_contact_person FROM information_schema.columns WHERE table_schema='public' AND table_name='suppliers' AND column_name='contact_person';`
];

async function main() {
  const client = new Client({ name: 'mantis-mcp-client', version: '1.0.0' });
  let transport: any;
  if (neonApiKey) {
    // Spawn Neon MCP server via stdio
    transport = new StdioClientTransport({
      command: 'npx',
      args: ['-y', '@neondatabase/mcp-server-neon', 'start', neonApiKey],
      env: process.env as any
    });
    await client.connect(transport);
  } else {
    throw new Error('Provide NEON_API_KEY to connect to Neon MCP server via stdio');
  }

  // Discover tools
  const tools = (await client.listTools({})).tools as ToolInfo[];
  if (!tools || tools.length === 0) throw new Error('No tools available on MCP server');

  const findTool = (...patterns: string[]): ToolInfo | undefined => {
    const lower = (s: string) => s.toLowerCase();
    for (const p of patterns) {
      const t = tools.find(tl => lower(tl.name).includes(p));
      if (t) return t;
    }
    return undefined;
  };

  const sqlTool = findTool('sql') || findTool('query') || findTool('execute');
  if (!sqlTool) {
    throw new Error(
      `Could not find a suitable SQL tool on MCP server. Tools: ${tools
        .map(t => t.name)
        .join(', ')}`
    );
  }

  async function execSQL(sql: string, label: string) {
    const baseArgs = [{ sql }, { query: sql }, { text: sql }, { statements: sql }, { input: sql }];
    const connArgs: Record<string, string | undefined>[] = [];
    if (neonConnStr) {
      connArgs.push(
        { connection_string: neonConnStr },
        { connectionString: neonConnStr },
        { database_url: neonConnStr },
        { databaseUrl: neonConnStr },
        { url: neonConnStr },
        { dsn: neonConnStr }
      );
    }
    // Also try project identifiers if provided
    const projArgs: Record<string, string | undefined>[] = [];
    if (neonProjectId) projArgs.push({ projectId: neonProjectId });
    if (neonBranchId) projArgs.push({ branchId: neonBranchId });
    if (neonEndpointId) projArgs.push({ endpointId: neonEndpointId });
    if (neonDatabase) projArgs.push({ database: neonDatabase });

    let lastErr: unknown = undefined;
    const combos: Record<string, any>[] = [];
    for (const a of baseArgs) {
      if (connArgs.length === 0 && projArgs.length === 0) {
        combos.push(a);
      } else if (connArgs.length === 0) {
        for (const p of projArgs) combos.push({ ...a, ...p });
      } else {
        for (const c of connArgs) {
          if (projArgs.length === 0) combos.push({ ...a, ...c });
          else for (const p of projArgs) combos.push({ ...a, ...c, ...p });
        }
      }
    }
    for (const args of combos) {
      try {
        const res = await client.callTool(sqlTool.name, args);
        const msg = res.structuredContent
          ? JSON.stringify(res.structuredContent)
          : (res.content as any[])?.map((c: any) => (typeof c === 'string' ? c : JSON.stringify(c))).join('\n');
        console.log(`[OK] ${label} via ${sqlTool.name} with keys [${Object.keys(args).join(', ')}] -> ${msg ?? 'done'}`);
        return;
      } catch (e) {
        lastErr = e;
      }
    }
    console.error(`[FAIL] ${label} failed via ${sqlTool.name}`);
    throw lastErr ?? new Error('Unknown MCP execution error');
  }

  if (doApply) {
    for (const rel of PHASE_A_MIGRATIONS) {
      const abs = resolve(process.cwd(), rel);
      const sql = readFileSync(abs, 'utf8');
      await execSQL(sql, `Apply ${rel}`);
    }
  }

  if (doVerify) {
    for (const q of VERIFICATION_QUERIES) {
      await execSQL(q, `Verify: ${q.split('\n')[0].slice(0, 64)}...`);
    }
  }

  // Optional: ping finish
  try {
    if (transport && typeof transport.terminateSession === 'function') {
      await transport.terminateSession();
    } else if (transport && typeof transport.close === 'function') {
      await transport.close();
    }
  } catch {}
}

main().catch(err => {
  console.error('Neon MCP apply failed:', err?.message || err);
  process.exit(1);
});
