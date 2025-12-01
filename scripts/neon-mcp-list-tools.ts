#!/usr/bin/env tsx
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

function loadApiKey(): string {
  if (process.env.NEON_API_KEY) return process.env.NEON_API_KEY;
  try {
    const raw = readFileSync(resolve(process.cwd(), '.mcp.json'), 'utf8');
    const cfg = JSON.parse(raw);
    const key = cfg?.mcpServers?.neon?.env?.NEON_API_KEY;
    if (typeof key === 'string' && key.length > 0) return key;
  } catch {}
  throw new Error('NEON_API_KEY not set; add to env or .mcp.json');
}

async function main() {
  const apiKey = loadApiKey();
  const client = new Client(
    { name: 'mantis-neon-mcp-tools', version: '1.0.0' },
    { capabilities: { tools: {} } }
  );
  const command = process.platform === 'win32' ? 'pwsh.exe' : 'npx';
  const args =
    process.platform === 'win32'
      ? [
          '-NoLogo',
          '-NoProfile',
          '-Command',
          `npx -y @neondatabase/mcp-server-neon start ${apiKey}`,
        ]
      : ['-y', '@neondatabase/mcp-server-neon', 'start', apiKey];

  const transport = new StdioClientTransport({
    command,
    args,
    env: process.env as any,
  });

  await client.connect(transport);
  try {
    const tools = (await client.listTools({})).tools ?? [];
    for (const tool of tools) {
      console.log(`${tool.name}`);
    }
  } finally {
    await transport.close();
  }
}

main().catch(err => {
  console.error('Failed to list tools:', err);
  process.exit(1);
});
