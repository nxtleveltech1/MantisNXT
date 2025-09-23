@echo off
echo Starting MCP Servers for MantisNXT...

cd /d "K:\00Project\MantisNXT\.claude"

echo Starting Filesystem Server...
start "MCP-Filesystem" cmd /k "node node_modules\@modelcontextprotocol\server-filesystem\dist\index.js K:\00Project\MantisNXT"

echo Starting Sequential Thinking Server...
start "MCP-Sequential" cmd /k "node node_modules\@modelcontextprotocol\server-sequential-thinking\dist\index.js"

echo Starting Memory Server...
start "MCP-Memory" cmd /k "node node_modules\@modelcontextprotocol\server-memory\dist\index.js"

echo Starting Context7 Server...
start "MCP-Context7" cmd /k "npx @upstash/context7-mcp --api-key ctx7sk-63485f97-a194-4380-a721-55b3c5afee7b"

echo Starting Puppeteer Server...
start "MCP-Puppeteer" cmd /k "npx puppeteer-mcp-server"

echo Starting Magic Server...
start "MCP-Magic" cmd /k "npx @21st-dev/magic"

echo Starting Playwright Server...
start "MCP-Playwright" cmd /k "npx @playwright/mcp"

echo Starting Magic Client...
start "MCP-MagicClient" cmd /k "npx magic-mcp-client"

echo Starting Shadcn UI (Jpisnice)...
start "MCP-ShadcnUI-JP" cmd /k "npx @jpisnice/shadcn-ui-mcp-server"

echo Starting Shadcn UI (Heilgar)...
start "MCP-ShadcnUI-HG" cmd /k "npx @heilgar/shadcn-ui-mcp-server"

echo Starting Shadcn UI (Basic)...
start "MCP-ShadcnUI-Basic" cmd /k "npx shadcn-ui-mcp-server"

echo Starting Shadcn Studio...
start "MCP-ShadcnStudio" cmd /k "npx shadcn-studio-cli"

echo Starting Starwind UI...
start "MCP-StarwindUI" cmd /k "npx @starwind-ui/mcp"

echo.
echo All MCP servers started successfully!
echo Note: Context7 API key is configured and ready to use.
echo.
pause