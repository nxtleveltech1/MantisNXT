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

const projectId = process.argv[2] ?? process.env.NEON_PROJECT_ID ?? 'proud-mud-50346856';

async function main() {
  const apiKey = loadApiKey();
  const client = new Client(
    { name: 'mantis-neon-mcp-describe-project', version: '1.0.0' },
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
    const result = await client.callTool({
      name: 'describe_project',
      arguments: { params: { projectId } },
    });
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await transport.close();
  }
}

main().catch(err => {
  console.error('Failed to describe project:', err);
  process.exit(1);
});
