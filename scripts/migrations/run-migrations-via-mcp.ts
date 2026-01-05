// Execute one or more SQL files against Neon via MCP run_sql/run_sql_transaction tools.
// Usage: tsx scripts/run-migrations-via-mcp.ts migrations/0002_supply_chain.sql [...]
// Requires NEON_API_KEY and NEON_CONNECTION_STRING in the environment.

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

if (process.argv.length <= 2) {
  console.error('Usage: tsx scripts/run-migrations-via-mcp.ts <sql-file> [...sql-files]');
  process.exit(1);
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function stripComments(sql: string): string {
  return sql
    .split(/\r?\n/)
    .filter(line => !line.trim().startsWith('--'))
    .join('\n');
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
      if (ch === '\n') {
        inLineComment = false;
      }
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
        current += ch;
        current += next;
        i++;
        continue;
      }
      if (ch === '/' && next === '*') {
        inBlockComment = true;
        current += ch;
        current += next;
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
      if (ch === "'" && !inDouble) {
        inSingle = !inSingle;
      } else if (ch === '"' && !inSingle) {
        inDouble = !inDouble;
      }
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

const neonApiKey = requireEnv('NEON_API_KEY');
const projectId = process.env.NEON_PROJECT_ID || 'proud-mud-50346856';
const branchId = process.env.NEON_BRANCH_ID || 'br-spring-field-a9v3cjvz';
const databaseName = process.env.NEON_DATABASE;

async function connectClient(): Promise<{ client: Client; transport: StdioClientTransport }> {
  const client = new Client(
    { name: 'mantis-mcp-client', version: '1.0.0' },
    { capabilities: { tools: {} } }
  );
  const isWindows = process.platform === 'win32';
  const command = isWindows ? 'pwsh.exe' : 'npx';
  const args = isWindows
    ? [
        '-NoLogo',
        '-NoProfile',
        '-Command',
        `npx -y @neondatabase/mcp-server-neon start ${neonApiKey}`,
      ]
    : ['-y', '@neondatabase/mcp-server-neon', 'start', neonApiKey];
  const transport = new StdioClientTransport({
    command,
    args,
    env: process.env as Record<string, string>,
  });
  await client.connect(transport);
  return { client, transport };
}

type SqlTools = { primary: string; transaction?: string };

async function pickSqlTools(client: Client): Promise<SqlTools> {
  const tools = (await client.listTools({})).tools ?? [];
  const primary =
    tools.find(t => t.name === 'run_sql')?.name ??
    tools.find(t => t.name === 'execute_sql')?.name ??
    tools.find(t => t.name === 'run_sql_transaction')?.name;
  if (!primary) {
    throw new Error(
      `No supported SQL tool found. Available tools: ${tools.map(t => t.name).join(', ')}`
    );
  }
  const transaction = tools.find(t => t.name === 'run_sql_transaction')?.name;
  return { primary, transaction };
}

async function execSql(
  client: Client,
  toolName: string,
  sql: string,
  statements: string[],
  label: string
) {
  const params: Record<string, unknown> = {
    projectId,
    branchId,
  };
  if (databaseName) params.databaseName = databaseName;

  if (toolName === 'run_sql_transaction') {
    params.sqlStatements = statements.length > 0 ? statements : [sql];
  } else {
    params.sql = sql;
  }

  const result = await client.callTool({
    name: toolName,
    arguments: { params },
  });
  const content = result.structuredContent
    ? JSON.stringify(result.structuredContent)
    : result.content
        ?.map(item => (typeof item === 'string' ? item : JSON.stringify(item)))
        .join('\n');
  console.log(`[OK] ${label} via ${toolName} -> ${content ?? 'done'}`);
}

async function main() {
  const files = process.argv.slice(2);
  const { client, transport } = await connectClient();
  try {
    const { primary, transaction } = await pickSqlTools(client);
    for (const file of files) {
      const abs = resolve(process.cwd(), file);
      console.log(`\n=== Executing ${abs} ===`);
      const rawSql = readFileSync(abs, 'utf8');
      const upSql = rawSql.split(/\n--\s*down/i)[0] ?? rawSql;
      const statements = splitSqlStatements(upSql);
      const useTransaction = Boolean(transaction);
      const toolName = useTransaction ? transaction! : primary;
      await execSql(client, toolName, upSql, statements, file);
    }
  } finally {
    try {
      await transport.close?.();
    } catch {
      await transport.close?.();
    }
  }
}

main().catch(err => {
  console.error('Migration execution failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
