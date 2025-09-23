@echo off
echo Verifying MCP Server Installations...
echo.

cd /d "K:\00Project\MantisNXT\.claude"

echo Testing Filesystem Server...
if exist "node_modules\@modelcontextprotocol\server-filesystem\dist\index.js" (
    echo ✅ Filesystem Server - INSTALLED
) else (
    echo ❌ Filesystem Server - MISSING
)

echo Testing Sequential Thinking Server...
if exist "node_modules\@modelcontextprotocol\server-sequential-thinking\dist\index.js" (
    echo ✅ Sequential Thinking Server - INSTALLED
) else (
    echo ❌ Sequential Thinking Server - MISSING
)

echo Testing Memory Server...
if exist "node_modules\@modelcontextprotocol\server-memory\dist\index.js" (
    echo ✅ Memory Server - INSTALLED
) else (
    echo ❌ Memory Server - MISSING
)

echo Testing Context7 Server...
if exist "node_modules\@upstash\context7-mcp" (
    echo ✅ Context7 Server - INSTALLED
) else (
    echo ❌ Context7 Server - MISSING
)

echo Testing Puppeteer Server...
if exist "node_modules\puppeteer-mcp-server" (
    echo ✅ Puppeteer Server - INSTALLED
) else (
    echo ❌ Puppeteer Server - MISSING
)

echo Testing Magic Server...
if exist "node_modules\@21st-dev\magic" (
    echo ✅ Magic Server - INSTALLED
) else (
    echo ❌ Magic Server - MISSING
)

echo Testing Playwright Server...
if exist "node_modules\@playwright\mcp" (
    echo ✅ Playwright Server - INSTALLED
) else (
    echo ❌ Playwright Server - MISSING
)

echo Testing Magic Client...
if exist "node_modules\magic-mcp-client" (
    echo ✅ Magic Client - INSTALLED
) else (
    echo ❌ Magic Client - MISSING
)

echo Testing Shadcn UI (Jpisnice)...
if exist "node_modules\@jpisnice\shadcn-ui-mcp-server" (
    echo ✅ Shadcn UI (Jpisnice) - INSTALLED
) else (
    echo ❌ Shadcn UI (Jpisnice) - MISSING
)

echo Testing Shadcn UI (Heilgar)...
if exist "node_modules\@heilgar\shadcn-ui-mcp-server" (
    echo ✅ Shadcn UI (Heilgar) - INSTALLED
) else (
    echo ❌ Shadcn UI (Heilgar) - MISSING
)

echo Testing Shadcn UI (Basic)...
if exist "node_modules\shadcn-ui-mcp-server" (
    echo ✅ Shadcn UI (Basic) - INSTALLED
) else (
    echo ❌ Shadcn UI (Basic) - MISSING
)

echo Testing Shadcn Studio...
if exist "node_modules\shadcn-studio-cli" (
    echo ✅ Shadcn Studio - INSTALLED
) else (
    echo ❌ Shadcn Studio - MISSING
)

echo Testing Starwind UI...
if exist "node_modules\@starwind-ui\mcp" (
    echo ✅ Starwind UI - INSTALLED
) else (
    echo ❌ Starwind UI - MISSING
)

echo.
echo Verification complete!
echo.
pause