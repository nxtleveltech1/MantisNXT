#!/usr/bin/env tsx
/**
 * Execute permission-grant SQL via the Neon MCP server.
 *
 * This script spawns the Neon MCP server (stdio transport) and calls its SQL tool
 * to run the GRANT statements needed for the application role.
 *
 * Usage:
 *   tsx scripts/neon-mcp-grant-permissions.ts [sql-file-or-inline-sql]
 *
 * Defaults to running scripts/fix-neon-permissions.sql when no argument is provided.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

type ToolInfo = { name: string; description?: string };

function loadSql(input?: string): { label: string; sql: string } {
  if (!input) {
    const rel = 'scripts/fix-neon-permissions.sql';
    const abs = resolve(process.cwd(), rel);
    return { label: rel, sql: readFileSync(abs, 'utf8') };
  }

  const maybePath = resolve(process.cwd(), input);
  try {
    const sql = readFileSync(maybePath, 'utf8');
    return { label: input, sql };
  } catch {
    return { label: '[inline SQL]', sql: input };
  }
}

function loadNeonApiKey(): string {
  if (process.env.NEON_API_KEY) return process.env.NEON_API_KEY;
  try {
    const cfgRaw = readFileSync(resolve(process.cwd(), '.mcp.json'), 'utf8');
    const cfg = JSON.parse(cfgRaw);
    const key = cfg?.mcpServers?.neon?.env?.NEON_API_KEY;
    if (typeof key === 'string' && key.length > 0) return key;
  } catch {}
  throw new Error('NEON_API_KEY not provided (set env var or define in .mcp.json).');
}

function loadConnectionString(): string | undefined {
  if (process.env.NEON_CONNECTION_STRING) return process.env.NEON_CONNECTION_STRING;
  if (process.env.NEON_SPP_DATABASE_URL) return process.env.NEON_SPP_DATABASE_URL;
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  // Fallback to the development connection string used in neon-connection.ts
  return 'postgresql://neondb_owner:npg_84ELeCFbOcGA@ep-steep-waterfall-a96wibpm-pooler.gwc.azure.neon.tech/mantis_issoh?sslmode=require';
}

function determineDefaultProject(_tools: ToolInfo[]): string | undefined {
  // No automatic detection implemented yet; rely on NEON_PROJECT_ID or manual fallback.
  return undefined;
}

function extractDatabaseFromConnectionString(connStr?: string): string | undefined {
  if (!connStr) return undefined;
  try {
    const url = new URL(connStr);
    const db = url.pathname.replace(/^\//, '');
    return db || undefined;
  } catch {
    return undefined;
  }
}

function stripComments(sql: string): string {
  return sql
    .split(/\r?\n/)
    .filter(line => !line.trim().startsWith('--'))
    .join('\n');
}

function splitSqlStatements(sql: string): string[] {
  const cleaned = stripComments(sql);
  return cleaned
    .split(/;\s*(?:\r?\n|$)/)
    .map(stmt => stmt.trim())
    .filter(Boolean);
}

async function main() {
  const { label, sql } = loadSql(process.argv[2]);
  if (!sql || sql.trim().length === 0) throw new Error('No SQL provided to execute.');

  const neonApiKey = loadNeonApiKey();
  const neonConnStr = loadConnectionString();

  const client = new Client(
    { name: 'mantis-neon-mcp', version: '1.0.0' },
    { capabilities: { tools: {} } }
  );
  const spawnCommand = process.platform === 'win32' ? 'pwsh.exe' : 'npx';
  const spawnArgs =
    process.platform === 'win32'
      ? [
          '-NoLogo',
          '-NoProfile',
          '-Command',
          `npx -y @neondatabase/mcp-server-neon start ${neonApiKey}`,
        ]
      : ['-y', '@neondatabase/mcp-server-neon', 'start', neonApiKey];
  const transport = new StdioClientTransport({
    command: spawnCommand,
    args: spawnArgs,
    env: process.env as any,
  });
  await client.connect(transport);

  try {
    const toolList = (await client.listTools({})).tools as ToolInfo[] | undefined;
    if (!toolList || toolList.length === 0) throw new Error('Neon MCP server returned no tools.');

    const transactionTool = toolList.find(t => t.name === 'run_sql_transaction');
    const sqlTool =
      toolList.find(t => t.name === 'run_sql') ||
      toolList.find(t => t.name === 'run_query') ||
      toolList.find(t => t.name === 'execute_sql');

    if (!sqlTool && !transactionTool) {
      throw new Error(
        `Unable to locate SQL-capable tool. Available tools: ${toolList
          .map(t => t.name)
          .join(', ')}`
      );
    }

    const projectId =
      process.env.NEON_PROJECT_ID || determineDefaultProject(toolList) || 'proud-mud-50346856';
    if (!projectId) {
      throw new Error(
        'Unable to determine Neon project. Set NEON_PROJECT_ID or update determineDefaultProject().'
      );
    }

    const branchId = process.env.NEON_BRANCH_ID || 'br-spring-field-a9v3cjvz';
    const databaseName =
      process.env.NEON_DATABASE || extractDatabaseFromConnectionString(neonConnStr) || undefined;

    const statements = splitSqlStatements(sql);
    if (statements.length === 0) {
      throw new Error('No executable SQL statements found in the provided SQL content.');
    }
    const useTransaction = statements.length > 1 && transactionTool;

    const params = {
      projectId,
    } as Record<string, unknown>;
    if (branchId) params.branchId = branchId;
    if (databaseName) params.databaseName = databaseName;

    if (useTransaction) {
      params.sqlStatements = statements;
    } else if (sqlTool) {
      params.sql = statements[0] ?? stripComments(sql).trim();
    } else {
      throw new Error('No suitable SQL tool available for single statement execution.');
    }

    const toolName = useTransaction && transactionTool ? transactionTool.name : sqlTool!.name;
    const res = await client.callTool({
      name: toolName,
      arguments: { params },
    });
    const msg = res.structuredContent
      ? JSON.stringify(res.structuredContent)
      : res.content?.map(c => (typeof c === 'string' ? c : JSON.stringify(c))).join('\n');
    console.log(
      `[OK] Executed ${label} via ${toolName} (project: ${projectId}${
        branchId ? `, branch: ${branchId}` : ''
      }${databaseName ? `, database: ${databaseName}` : ''}) -> ${msg ?? 'done'}`
    );
    console.log('? Neon MCP permission grant completed.');
  } finally {
    try {
      if (typeof transport.terminateSession === 'function') {
        await transport.terminateSession();
      } else if (typeof transport.close === 'function') {
        await transport.close();
      }
    } catch {}
  }
}

main().catch(err => {
  console.error('Neon MCP permission grant failed:', err);
  process.exit(1);
});
