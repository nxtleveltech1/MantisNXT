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
  throw new Error('NEON_API_KEY not set.');
}

const toolName = process.argv[2];
if (!toolName) {
  console.error('Usage: tsx scripts/neon-mcp-tool-schema.ts <tool-name>');
  process.exit(1);
}

async function main() {
  const apiKey = loadApiKey();
  const client = new Client(
    { name: 'mantis-neon-mcp-tool-schema', version: '1.0.0' },
    { capabilities: { tools: {} } }
  );
  const command = process.platform === 'win32' ? 'pwsh.exe' : 'npx';
  const args =
    process.platform === 'win32'
      ? ['-NoLogo', '-NoProfile', '-Command', `npx -y @neondatabase/mcp-server-neon start ${apiKey}`]
      : ['-y', '@neondatabase/mcp-server-neon', 'start', apiKey];
  const transport = new StdioClientTransport({ command, args, env: process.env as any });
  await client.connect(transport);
  try {
    const tools = (await client.listTools({})).tools ?? [];
    const tool = tools.find(t => t.name === toolName);
    if (!tool) {
      console.error(`Tool ${toolName} not found. Available: ${tools.map(t => t.name).join(', ')}`);
      process.exit(1);
    }
    console.log(JSON.stringify(tool, null, 2));
  } finally {
    await transport.close();
  }
}

main().catch(err => {
  console.error('Failed to read tool schema:', err);
  process.exit(1);
});
