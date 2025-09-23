# MCP Servers Setup for MantisNXT

## Installed MCP Servers

### ✅ Successfully Installed

1. **Filesystem Server** (`@modelcontextprotocol/server-filesystem`)
   - Provides file system operations
   - Status: Ready to use

2. **Sequential Thinking Server** (`@modelcontextprotocol/server-sequential-thinking`)
   - Multi-step reasoning and problem solving
   - Status: Ready to use

3. **Memory Server** (`@modelcontextprotocol/server-memory`)
   - Knowledge graph and persistent memory
   - Status: Ready to use

4. **Context7 Server** (`@upstash/context7-mcp`)
   - Documentation lookup and pattern guidance
   - Status: ✅ Ready to use (API key configured)

5. **Puppeteer Server** (`puppeteer-mcp-server`)
   - Browser automation and testing
   - Status: Ready to use

6. **Magic Server** (`@21st-dev/magic`)
   - UI component generation by 21st.dev
   - Status: Ready to use

7. **Playwright Server** (`@playwright/mcp`)
   - Official Playwright MCP server for browser automation
   - Status: Ready to use

8. **Magic Client** (`magic-mcp-client`)
   - AI-powered UI component generation client
   - Status: Ready to use

## Shadcn UI & Component Servers

9. **Shadcn UI (Jpisnice)** (`@jpisnice/shadcn-ui-mcp-server`)
   - Advanced Shadcn/UI server with demos, blocks, and metadata
   - Status: Ready to use

10. **Shadcn UI (Heilgar)** (`@heilgar/shadcn-ui-mcp-server`)
    - Shadcn/UI component references server
    - Status: Ready to use

11. **Shadcn UI (Basic)** (`shadcn-ui-mcp-server`)
    - Basic Shadcn/UI component references
    - Status: Ready to use

12. **Shadcn Studio** (`shadcn-studio-cli`)
    - Shadcn Studio CLI for component installation and management
    - Status: Ready to use

13. **Starwind UI** (`@starwind-ui/mcp`)
    - Starwind UI components for Astro and other frameworks
    - Status: Ready to use

### ⚠️ Not Available (Not published on npm)

The following servers mentioned in your configuration are not yet publicly available:
- Morphllm MCP (Pattern-based code editing)
- Serena MCP (Semantic code understanding)
- Marmelab Shadcn Admin Kit (No specific MCP server found)

## Usage

### Start All Servers

**Windows:**
```batch
start-mcp-servers.bat
```

**Linux/Mac:**
```bash
chmod +x start-mcp-servers.sh
./start-mcp-servers.sh
```

### Configuration

The MCP configuration is stored in `mcp-config.json`.

### API Keys Status

✅ **Context7 API Key**: Configured and ready to use
- API Key: `ctx7sk-63485f97-a194-4380-a721-55b3c5afee7b`
- Status: Active in all configurations

## Agent Naming

The following agents have been renamed:
- ui-perfection-doer → **UI-X**
- ml-architecture-expert → **ARCHI-X**
- infra-config-reviewer → **AI-X**
- data-oracle → **DATA-X**
- thecaller-parallel-orchestrator → **CALL-X**
- production-incident-responder → **CLEANER-X**

## Installation Commands

If you need to reinstall:
```bash
cd K:\00Project\MantisNXT\.claude
npm install
```

## Troubleshooting

1. **Port conflicts**: Ensure no other services are using the MCP server ports
2. **Permission issues**: Run as administrator if needed
3. **Node version**: Requires Node.js v18+ (you have v22.12.0)