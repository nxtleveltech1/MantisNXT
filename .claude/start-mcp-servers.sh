#!/bin/bash

echo "Starting MCP Servers for MantisNXT..."

cd "$(dirname "$0")"

echo "Starting Filesystem Server..."
node node_modules/@modelcontextprotocol/server-filesystem/dist/index.js K:/00Project/MantisNXT &

echo "Starting Sequential Thinking Server..."
node node_modules/@modelcontextprotocol/server-sequential-thinking/dist/index.js &

echo "Starting Memory Server..."
node node_modules/@modelcontextprotocol/server-memory/dist/index.js &

echo "Starting Context7 Server..."
npx @upstash/context7-mcp --api-key ctx7sk-63485f97-a194-4380-a721-55b3c5afee7b &

echo "Starting Puppeteer Server..."
npx puppeteer-mcp-server &

echo "Starting Magic Server..."
npx @21st-dev/magic &

echo "Starting Playwright Server..."
npx @playwright/mcp &

echo "Starting Magic Client..."
npx magic-mcp-client &

echo "Starting Shadcn UI (Jpisnice)..."
npx @jpisnice/shadcn-ui-mcp-server &

echo "Starting Shadcn UI (Heilgar)..."
npx @heilgar/shadcn-ui-mcp-server &

echo "Starting Shadcn UI (Basic)..."
npx shadcn-ui-mcp-server &

echo "Starting Shadcn Studio..."
npx shadcn-studio-cli &

echo "Starting Starwind UI..."
npx @starwind-ui/mcp &

echo ""
echo "All MCP servers started successfully!"
echo "Note: Context7 API key is configured and ready to use."
echo ""
echo "Press Ctrl+C to stop all servers"

# Keep script running
wait