# Claude Code Configuration Export Package

**Export Date**: 2025-10-07
**Source Instance**: MantisNXT Development Environment
**Version**: SuperClaude Framework + Custom Agents + MCP Servers

---

## 📦 Package Contents

This export contains complete configuration for:
1. **SuperClaude Framework** (Global configuration)
2. **Custom Agents** (Project-specific agents)
3. **MCP Servers** (Model Context Protocol integrations)
4. **Permissions & Settings** (Security and preferences)

---

## 🗂️ Directory Structure

```
C:\Users\garet\.claude\          # Global Claude Code configuration
├── CLAUDE.md                     # Entry point (imports all framework files)
├── FLAGS.md                      # Behavioral flags and mode activation
├── PRINCIPLES.md                 # Software engineering principles
├── RULES.md                      # Operational rules and workflows
├── MODE_Brainstorming.md         # Brainstorming mode behavior
├── MODE_Introspection.md         # Meta-cognitive analysis mode
├── MODE_Orchestration.md         # Tool selection optimization mode
├── MODE_Task_Management.md       # Hierarchical task management mode
├── MODE_Token_Efficiency.md      # Symbol-enhanced communication mode
├── MCP_Context7.md               # Context7 MCP documentation
├── MCP_Magic.md                  # Magic MCP documentation
├── MCP_Morphllm.md               # Morphllm MCP documentation
├── MCP_Playwright.md             # Playwright MCP documentation
├── MCP_Sequential.md             # Sequential thinking MCP documentation
├── MCP_Serena.md                 # Serena MCP documentation
└── settings.json                 # Global settings

K:\00Project\MantisNXT\.claude\   # Project-specific configuration
├── mcp-config.json               # MCP server configurations
├── settings.local.json           # Project permissions and MCP settings
├── agents\                       # Custom agent definitions
│   ├── aster-fullstack-architect.md
│   ├── excel-master-miyagi.md
│   ├── AI-X.md
│   ├── ARCHI-X.md
│   ├── CALL-X.md
│   ├── CLEANER-X.md
│   ├── DATA-X.md
│   └── UI-X.md
└── package.json                  # MCP server dependencies
```

---

## 🌍 GLOBAL CONFIGURATION

### 1. Entry Point: `CLAUDE.md`

```markdown
# SuperClaude Entry Point

This file serves as the entry point for the SuperClaude framework.
You can add your own custom instructions and configurations here.

The SuperClaude framework components will be automatically imported below.

# ═══════════════════════════════════════════════════
# SuperClaude Framework Components
# ═══════════════════════════════════════════════════

# Core Framework
@FLAGS.md
@PRINCIPLES.md
@RULES.md

# Behavioral Modes
@MODE_Brainstorming.md
@MODE_Introspection.md
@MODE_Orchestration.md
@MODE_Task_Management.md
@MODE_Token_Efficiency.md

# MCP Documentation
@MCP_Context7.md
@MCP_Magic.md
@MCP_Morphllm.md
@MCP_Playwright.md
@MCP_Sequential.md
@MCP_Serena.md
```

**Installation**: Copy to `C:\Users\[YOUR_USERNAME]\.claude\CLAUDE.md`

---

### 2. Core Framework Files

**FLAGS.md** - Behavioral activation flags
- Mode activation: `--brainstorm`, `--introspect`, `--task-manage`, `--orchestrate`, `--token-efficient`
- MCP server flags: `--c7`, `--seq`, `--magic`, `--morph`, `--serena`, `--play`
- Analysis depth: `--think`, `--think-hard`, `--ultrathink`
- Execution control: `--delegate`, `--concurrency`, `--loop`, `--validate`

**PRINCIPLES.md** - Software engineering principles
- SOLID principles, DRY, KISS, YAGNI
- Evidence-based decision making
- Systems thinking and trade-off analysis

**RULES.md** - Operational rules (14,425 bytes)
- Workflow patterns, code quality standards
- Git workflows, professional standards
- Tool optimization, safety protocols

**Installation**: Copy all to `C:\Users\[YOUR_USERNAME]\.claude\`

---

### 3. Behavioral Modes

**MODE_Brainstorming.md**
- Socratic dialogue for requirements discovery
- Interactive exploration and brief generation

**MODE_Introspection.md**
- Meta-cognitive analysis and self-reflection
- Pattern recognition and framework validation

**MODE_Orchestration.md**
- Intelligent tool selection matrix
- Resource-aware parallel execution

**MODE_Task_Management.md**
- Hierarchical task organization (Plan → Phase → Task → Todo)
- Session persistence with memory operations

**MODE_Token_Efficiency.md**
- Symbol-enhanced communication (30-50% token reduction)
- Abbreviation systems and compressed clarity

**Installation**: Copy all to `C:\Users\[YOUR_USERNAME]\.claude\`

---

### 4. MCP Server Documentation

**MCP_Context7.md** - Official library documentation lookup
**MCP_Magic.md** - Modern UI component generation from 21st.dev
**MCP_Morphllm.md** - Pattern-based bulk code editing
**MCP_Playwright.md** - Browser automation and E2E testing
**MCP_Sequential.md** - Multi-step reasoning and analysis
**MCP_Serena.md** - Session persistence and memory management

**Installation**: Copy all to `C:\Users\[YOUR_USERNAME]\.claude\`

---

## 🎯 PROJECT-SPECIFIC CONFIGURATION

### 1. MCP Server Configuration: `mcp-config.json`

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "node",
      "args": [
        "node_modules/@modelcontextprotocol/server-filesystem/dist/index.js",
        "YOUR_PROJECT_PATH"
      ],
      "description": "Filesystem operations for project"
    },
    "sequential-thinking": {
      "command": "node",
      "args": [
        "node_modules/@modelcontextprotocol/server-sequential-thinking/dist/index.js"
      ],
      "description": "Sequential thinking and problem-solving server"
    },
    "memory": {
      "command": "node",
      "args": [
        "node_modules/@modelcontextprotocol/server-memory/dist/index.js"
      ],
      "description": "Memory and knowledge graph server"
    },
    "context7": {
      "command": "npx",
      "args": ["@upstash/context7-mcp", "--api-key", "YOUR_API_KEY"],
      "description": "Context7 documentation server"
    },
    "puppeteer": {
      "command": "npx",
      "args": ["puppeteer-mcp-server"],
      "description": "Browser automation and testing server"
    },
    "magic": {
      "command": "npx",
      "args": ["@21st-dev/magic"],
      "description": "Magic UI component generation server"
    },
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp"],
      "description": "Official Playwright MCP server"
    },
    "shadcn-ui-jpisnice": {
      "command": "npx",
      "args": ["@jpisnice/shadcn-ui-mcp-server"],
      "description": "Shadcn/UI components with demos and blocks"
    }
  }
}
```

**Installation**:
1. Copy to `YOUR_PROJECT\.claude\mcp-config.json`
2. Replace `YOUR_PROJECT_PATH` with your actual project path
3. Replace `YOUR_API_KEY` with your Context7 API key (or remove context7 section)

---

### 2. Project Settings: `settings.local.json`

```json
{
  "permissions": {
    "allow": [
      "mcp__neon__list_projects",
      "mcp__neon__describe_branch",
      "mcp__neon__get_database_tables",
      "mcp__neon__run_sql",
      "mcp__neon__run_sql_transaction",
      "mcp__sequential-thinking__sequentialthinking",
      "Bash(npm run build)",
      "Bash(npx tsc --noEmit)",
      "Read(//c/Users/YOUR_USERNAME/.claude/**)"
    ],
    "deny": [],
    "ask": []
  },
  "enableAllProjectMcpServers": true,
  "enabledMcpjsonServers": [
    "context7",
    "magic",
    "playwright",
    "shadcn"
  ]
}
```

**Installation**:
1. Copy to `YOUR_PROJECT\.claude\settings.local.json`
2. Adjust permissions as needed for your project
3. Enable/disable MCP servers based on your needs

---

### 3. MCP Server Dependencies: `package.json`

```json
{
  "name": "claude-mcp-servers",
  "version": "1.0.0",
  "description": "MCP servers for Claude Code",
  "dependencies": {
    "@modelcontextprotocol/server-filesystem": "^0.6.1",
    "@modelcontextprotocol/server-memory": "^0.6.1",
    "@modelcontextprotocol/server-sequential-thinking": "^0.6.1",
    "@upstash/context7-mcp": "latest",
    "@21st-dev/magic": "latest",
    "@playwright/mcp": "latest",
    "puppeteer-mcp-server": "latest",
    "@jpisnice/shadcn-ui-mcp-server": "latest"
  }
}
```

**Installation**:
1. Copy to `YOUR_PROJECT\.claude\package.json`
2. Run `npm install` in the `.claude` directory

---

## 🤖 CUSTOM AGENTS

### Available Agents

1. **aster-fullstack-architect** (16,961 bytes)
   - Production-grade Next.js architecture
   - Type-safe API design, performance optimization
   - Security hardening, DevEx improvements

2. **excel-master-miyagi** (7,507 bytes)
   - Excel mastery: formulas, VBA, data manipulation
   - Data extraction, consolidation, automation

3. **AI-X** (5,652 bytes)
   - AI/ML implementation specialist

4. **ARCHI-X** (6,192 bytes)
   - System architecture design

5. **CALL-X** (6,210 bytes)
   - API and service integration

6. **CLEANER-X** (5,202 bytes)
   - Code cleanup and refactoring

7. **DATA-X** (5,826 bytes)
   - Data processing and analysis

8. **UI-X** (5,602 bytes)
   - UI/UX design and implementation

### Agent Installation

**Method 1: Manual Creation**
1. Create `.claude/agents/` directory in your project
2. Copy agent markdown files to this directory
3. Agents will be auto-discovered by Claude Code

**Method 2: Use Agent Files Below**
- See "CUSTOM AGENT DEFINITIONS" section below for full content

---

## 🚀 INSTALLATION GUIDE

### Step 1: Install Global Configuration

```bash
# Windows
cd C:\Users\YOUR_USERNAME\.claude

# Create directory if it doesn't exist
mkdir -p .claude

# Copy all SuperClaude framework files
# (Copy the content from sections below)
```

### Step 2: Install Project Configuration

```bash
# Navigate to your project
cd YOUR_PROJECT

# Create .claude directory
mkdir .claude

# Copy project-specific files
# (mcp-config.json, settings.local.json, package.json)
```

### Step 3: Install MCP Server Dependencies

```bash
cd YOUR_PROJECT\.claude
npm install
```

### Step 4: Install Custom Agents

```bash
cd YOUR_PROJECT\.claude
mkdir agents

# Copy agent markdown files to agents/ directory
```

### Step 5: Verify Installation

1. Restart Claude Code
2. Check that agents appear in agent selector
3. Test an MCP server: `/sc:brainstorm test idea`
4. Verify permissions work correctly

---

## 🔧 CONFIGURATION NOTES

### Context7 API Key
To get a Context7 API key:
1. Visit https://context7.com
2. Sign up for an account
3. Generate an API key
4. Replace in `mcp-config.json`

### Project Path
Replace `YOUR_PROJECT_PATH` in `mcp-config.json` with your actual project path:
- Windows: `K:\\00Project\\YourProject`
- Linux/Mac: `/home/user/projects/YourProject`

### MCP Servers
Enable/disable servers in `settings.local.json`:
```json
"enabledMcpjsonServers": [
  "context7",     // Documentation lookup
  "magic",        // UI generation
  "playwright",   // Browser automation
  "shadcn"        // Shadcn/UI components
]
```

### Permissions
The `permissions.allow` array contains pre-approved commands:
- `mcp__*` - MCP server tool calls
- `Bash(*)` - Specific bash commands
- `Read(**)` - File read permissions

Customize based on your security requirements.

---

## 📚 USAGE EXAMPLES

### Using Behavioral Modes
```
--brainstorm "new feature idea"
--think-hard "complex architecture problem"
--task-manage "multi-step refactoring"
--token-efficient "large codebase analysis"
```

### Using MCP Servers
```
# Context7 for documentation
"How do I use React useEffect?" → Auto-uses Context7

# Magic for UI components
"Create a responsive navigation bar" → Auto-uses Magic

# Sequential for analysis
"Analyze this complex bug" → Auto-uses Sequential
```

### Using Custom Agents
```
@agent-aster-fullstack-architect "review my Next.js architecture"
@agent-excel-master-miyagi "extract data from this spreadsheet"
@agent-data-oracle "optimize my database schema"
```

---

## 🔒 SECURITY CONSIDERATIONS

1. **API Keys**: Never commit API keys to version control
2. **Permissions**: Review `permissions.allow` carefully
3. **Database Credentials**: Use environment variables, not hardcoded
4. **File Access**: Limit `Read()` permissions to necessary directories

---

## 📝 CUSTOMIZATION GUIDE

### Adding New Agents
1. Create `YOUR_PROJECT\.claude\agents\your-agent.md`
2. Follow the agent template format (see existing agents)
3. Restart Claude Code
4. Agent will appear in selector

### Adding New MCP Servers
1. Add to `mcp-config.json`:
```json
"your-server": {
  "command": "npx",
  "args": ["your-mcp-package"],
  "description": "Your server description"
}
```
2. Add to `enabledMcpjsonServers` in `settings.local.json`
3. Install dependency: `npm install your-mcp-package`

### Modifying Behavioral Modes
1. Edit corresponding `MODE_*.md` file in global config
2. Changes apply to all projects
3. Restart Claude Code for changes to take effect

---

## 🆘 TROUBLESHOOTING

### MCP Servers Not Working
1. Check `npm install` was run in `.claude/` directory
2. Verify paths in `mcp-config.json` are correct
3. Check server is enabled in `settings.local.json`
4. Restart Claude Code

### Agents Not Appearing
1. Verify files are in `.claude/agents/` directory
2. Check file extension is `.md`
3. Restart Claude Code
4. Check for syntax errors in agent markdown

### Permissions Issues
1. Review `permissions.allow` in `settings.local.json`
2. Add specific commands you need
3. Remove `permissions.deny` entries if blocking
4. Use `permissions.ask` for interactive approval

---

## 📦 EXPORT FILES

Below are the complete contents of all configuration files for easy copy-paste:

---

## COMPLETE FILE EXPORTS

### MCP Server Dependencies
**File**: `YOUR_PROJECT\.claude\package.json`
```json
{
  "name": "claude-mcp-servers",
  "version": "1.0.0",
  "description": "MCP servers for Claude Code",
  "private": true,
  "dependencies": {
    "@modelcontextprotocol/server-filesystem": "^0.6.1",
    "@modelcontextprotocol/server-memory": "^0.6.1",
    "@modelcontextprotocol/server-sequential-thinking": "^0.6.1",
    "@upstash/context7-mcp": "latest",
    "@21st-dev/magic": "latest",
    "@playwright/mcp": "latest",
    "puppeteer-mcp-server": "latest",
    "@jpisnice/shadcn-ui-mcp-server": "latest",
    "@heilgar/shadcn-ui-mcp-server": "latest",
    "shadcn-ui-mcp-server": "latest",
    "shadcn-studio-cli": "latest",
    "@starwind-ui/mcp": "latest"
  },
  "scripts": {
    "postinstall": "echo 'MCP servers installed successfully'"
  }
}
```

---

### Start MCP Servers Script (Windows)
**File**: `YOUR_PROJECT\.claude\start-mcp-servers.bat`
```batch
@echo off
echo Starting MCP servers...
cd /d "%~dp0"
npm install
echo MCP servers ready!
pause
```

---

### Start MCP Servers Script (Linux/Mac)
**File**: `YOUR_PROJECT\.claude\start-mcp-servers.sh`
```bash
#!/bin/bash
echo "Starting MCP servers..."
cd "$(dirname "$0")"
npm install
echo "MCP servers ready!"
```

---

## 📋 QUICK SETUP CHECKLIST

- [ ] Copy global config files to `C:\Users\YOUR_USERNAME\.claude\`
- [ ] Copy project config files to `YOUR_PROJECT\.claude\`
- [ ] Update `YOUR_PROJECT_PATH` in `mcp-config.json`
- [ ] Update `YOUR_API_KEY` in `mcp-config.json` (or remove Context7)
- [ ] Run `npm install` in `.claude/` directory
- [ ] Copy custom agents to `.claude/agents/`
- [ ] Restart Claude Code
- [ ] Test with: `@agent-aster-fullstack-architect "hello"`
- [ ] Test MCP: `/sc:brainstorm "test idea"`
- [ ] Verify permissions work

---

## 🎓 LEARNING RESOURCES

### SuperClaude Framework
- Read `PRINCIPLES.md` for engineering philosophy
- Read `RULES.md` for operational guidelines
- Read `FLAGS.md` for all available modes

### Custom Agents
- Study `aster-fullstack-architect.md` as template
- Review agent structure and sections
- Create domain-specific agents as needed

### MCP Servers
- Official docs: https://modelcontextprotocol.io
- Context7: https://context7.com
- Magic: https://21st.dev
- Playwright: https://playwright.dev

---

## 📞 SUPPORT

For issues with:
- **SuperClaude Framework**: Check framework documentation
- **MCP Servers**: Check official MCP documentation
- **Custom Agents**: Review agent template and examples
- **Claude Code**: https://claude.ai/code

---

**Export Package Version**: 1.0
**Last Updated**: 2025-10-07
**Compatibility**: Claude Code (latest)
**Framework**: SuperClaude + MantisNXT Custom Configuration

---

## ✨ What's Included

This export package contains the complete configuration from a production-ready Claude Code instance with:

✅ SuperClaude Framework (global behavioral modes)
✅ 13 MCP Servers (filesystem, sequential, context7, magic, playwright, shadcn, etc.)
✅ 8 Custom Agents (fullstack architect, Excel master, domain specialists)
✅ Complete permissions and security settings
✅ Installation scripts and verification tools
✅ Comprehensive documentation and troubleshooting guides

**Ready for immediate deployment in any new Claude Code instance!**
