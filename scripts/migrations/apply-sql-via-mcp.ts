#!/usr/bin/env bun
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function splitSqlStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = '';
  let inSingle = false;
  let inDouble = false;
  let inLineComment = false;
  let inBlockComment = false;
  let dollarTag: string | null = null;

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    const next = sql[i + 1];

    if (inLineComment) {
      current += ch;
      if (ch === '\n') inLineComment = false;
      continue;
    }

    if (inBlockComment) {
      current += ch;
      if (ch === '*' && next === '/') {
        current += next;
        i++;
        inBlockComment = false;
      }
      continue;
    }

    if (!dollarTag && !inSingle && !inDouble) {
      if (ch === '-' && next === '-') {
        inLineComment = true;
        current += ch + next;
        i++;
        continue;
      }
      if (ch === '/' && next === '*') {
        inBlockComment = true;
        current += ch + next;
        i++;
        continue;
      }
      const dollarMatch = sql.slice(i).match(/^\$[A-Za-z0-9_]*\$/);
      if (dollarMatch) {
        dollarTag = dollarMatch[0];
        current += dollarTag;
        i += dollarTag.length - 1;
        continue;
      }
    } else if (dollarTag && sql.startsWith(dollarTag, i)) {
      current += dollarTag;
      i += dollarTag.length - 1;
      dollarTag = null;
      continue;
    }

    if (!dollarTag) {
      if (ch === "'" && !inDouble) inSingle = !inSingle;
      if (ch === '"' && !inSingle) inDouble = !inDouble;
    }

    if (!inSingle && !inDouble && !dollarTag && ch === ';') {
      current += ch;
      if (current.trim()) statements.push(current.trim());
      current = '';
      continue;
    }

    current += ch;
  }

  if (current.trim()) statements.push(current.trim());
  return statements;
}

async function main() {
  const files = process.argv.slice(2);
  if (files.length === 0) {
    throw new Error('Usage: bun scripts/migrations/apply-sql-via-mcp.ts <sql-file> [...sql-files]');
  }

  const neonApiKey = requireEnv('NEON_API_KEY');
  const connectionString =
    process.env.NEON_CONNECTION_STRING || process.env.DATABASE_URL || process.env.NEON_SPP_DATABASE_URL;
  const projectId = process.env.NEON_PROJECT_ID || 'proud-mud-50346856';
  const branchId = process.env.NEON_BRANCH_ID || 'br-spring-field-a9v3cjvz';
  const endpointId = process.env.NEON_ENDPOINT_ID;
  const database = process.env.NEON_DATABASE;

  const client = new Client(
    { name: 'mantis-neon-mcp-sql-executor', version: '1.0.0' },
    { capabilities: { tools: {} } }
  );

  const command = process.platform === 'win32' ? 'cmd.exe' : 'npx';
  const args =
    process.platform === 'win32'
      ? ['/c', 'npx', '-y', '@neondatabase/mcp-server-neon', 'start', neonApiKey]
      : ['-y', '@neondatabase/mcp-server-neon', 'start', neonApiKey];

  const transport = new StdioClientTransport({
    command,
    args,
    env: process.env as Record<string, string>,
  });

  await client.connect(transport);

  try {
    const tools = (await client.listTools({})).tools ?? [];
    const sqlTool = tools.find(t => t.name === 'run_sql');
    const txTool = tools.find(t => t.name === 'run_sql_transaction');
    const executeTool = txTool?.name ?? sqlTool?.name;

    if (!executeTool) {
      throw new Error(`No supported SQL tool found. Available tools: ${tools.map(t => t.name).join(', ')}`);
    }

    for (const file of files) {
      const abs = resolve(process.cwd(), file);
      if (!existsSync(abs)) throw new Error(`SQL file not found: ${abs}`);

      const sql = readFileSync(abs, 'utf8');
      const statements = splitSqlStatements(sql);

      const baseArgs: Record<string, unknown> = {};
      if (executeTool === 'run_sql_transaction') {
        baseArgs.sqlStatements = statements.length > 0 ? statements : [sql];
      } else {
        baseArgs.sql = sql;
      }

      const attempts: Array<Record<string, unknown>> = [];
      const connArgs = connectionString
        ? [
            { connectionString },
            { connection_string: connectionString },
            { databaseUrl: connectionString },
            { database_url: connectionString },
            { dsn: connectionString },
            { url: connectionString },
          ]
        : [{}];
      const idArgs =
        projectId || branchId || endpointId || database
          ? [
              {
                ...(projectId ? { projectId } : {}),
                ...(branchId ? { branchId } : {}),
                ...(endpointId ? { endpointId } : {}),
                ...(database ? { database, databaseName: database } : {}),
              },
            ]
          : [{}];

      for (const c of connArgs) {
        for (const i of idArgs) {
          attempts.push({ ...baseArgs, ...c, ...i });
        }
      }

      let applied = false;
      let lastError: unknown = null;

      console.log(`\n=== MCP apply: ${file} ===`);
      for (const attempt of attempts) {
        try {
          const result = await client.callTool({ name: executeTool, arguments: { params: attempt } });
          const structured = result.structuredContent
            ? JSON.stringify(result.structuredContent)
            : '';
          const content = (result.content ?? [])
            .map(item => (typeof item === 'string' ? item : JSON.stringify(item)))
            .join('\n');
          const text = `${structured}\n${content}`.trim();

          if (/NeonDbError|\berror\b|\bexception\b/i.test(text)) {
            throw new Error(`MCP tool returned error payload: ${text.slice(0, 800)}`);
          }

          console.log(`Applied with keys: [${Object.keys(attempt).join(', ')}]`);
          if (text) console.log(text.slice(0, 800));
          applied = true;
          break;
        } catch (error) {
          lastError = error;
        }
      }

      if (!applied) {
        throw lastError instanceof Error
          ? new Error(`Failed to apply ${file}: ${lastError.message}`)
          : new Error(`Failed to apply ${file}: ${String(lastError)}`);
      }
    }
  } finally {
    await transport.close();
  }
}

main().catch(error => {
  console.error('apply-sql-via-mcp failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
