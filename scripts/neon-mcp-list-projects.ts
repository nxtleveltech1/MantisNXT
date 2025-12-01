#!/usr/bin/env tsx
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

function loadNeonApiKey(): string {
  if (process.env.NEON_API_KEY) return process.env.NEON_API_KEY;
  try {
    const cfgRaw = readFileSync(resolve(process.cwd(), '.mcp.json'), 'utf8');
    const cfg = JSON.parse(cfgRaw);
    const key = cfg?.mcpServers?.neon?.env?.NEON_API_KEY;
    if (typeof key === 'string' && key.length > 0) return key;
  } catch {}
  throw new Error('NEON_API_KEY not provided.');
}

async function main() {
  const neonApiKey = loadNeonApiKey();
  const client = new Client(
    { name: 'mantis-neon-mcp-list', version: '1.0.0' },
    { capabilities: { tools: {} } }
  );
  const command = process.platform === 'win32' ? 'pwsh.exe' : 'npx';
  const args =
    process.platform === 'win32'
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
    env: process.env as any,
  });

  await client.connect(transport);
  try {
    const res = await client.callTool({
      name: 'list_projects',
      arguments: { params: {} },
    });
    console.log(JSON.stringify(res, null, 2));
  } finally {
    await transport.close();
  }
}

main().catch(err => {
  console.error('Failed to list projects via Neon MCP:', err);
  process.exit(1);
});
