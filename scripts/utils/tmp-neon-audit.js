#!/usr/bin/env node
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
const fs = require('fs');
const path = require('path');

async function main() {
  const cfgPath = path.resolve(process.cwd(), '.mcp.json');
  const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
  const apiKey = cfg?.mcpServers?.neon?.args?.[3];
  if (!apiKey) {
    throw new Error('API key missing from .mcp.json');
  }

  const client = new Client(
    { name: 'migration-audit', version: '1.0.0' },
    { capabilities: { tools: {} } }
  );

  const transport = new StdioClientTransport({
    command: process.platform === 'win32' ? 'cmd' : 'npx',
    args:
      process.platform === 'win32'
        ? ['/c', 'npx', '-y', '@neondatabase/mcp-server-neon', 'start', apiKey]
        : ['-y', '@neondatabase/mcp-server-neon', 'start', apiKey],
  });

  await client.connect(transport);
  try {
    const connectionString =
      process.env.NEON_CONNECTION_STRING ||
      process.env.NEON_SPP_DATABASE_URL ||
      process.env.DATABASE_URL ||
      'postgresql://neondb_owner:npg_84ELeCFbOcGA@ep-steep-waterfall-a96wibpm-pooler.gwc.azure.neon.tech/neondb?sslmode=require&channel_binding=require';

    const sql =
      'SELECT migration_name FROM schema_migrations ORDER BY migration_name;';

    const argsList = [
      { sql, connection_string: connectionString },
      { sql, connectionString: connectionString },
      { sql, database_url: connectionString },
      { sql, databaseUrl: connectionString },
      { sql, url: connectionString },
      { sql, dsn: connectionString },
    ];

    let res;
    let lastErr;
    for (const args of argsList) {
      try {
        res = await client.callTool('run_sql', args);
        break;
      } catch (err) {
        lastErr = err;
      }
    }
    if (!res) {
      throw lastErr || new Error('Failed to execute run_sql via MCP');
    }

    fs.writeFileSync(
      'temp-neon-migration-list.json',
      JSON.stringify(res, null, 2),
      'utf8'
    );
  } finally {
    await transport.close();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

