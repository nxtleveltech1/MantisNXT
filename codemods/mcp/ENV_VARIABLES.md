# Environment Variables

This document lists all environment variables used by the MCP server tools.

## Filesystem Tools
**File:** `src/tools/filesystem.ts`  
**No environment variables required.**

## GitHub Tools
**File:** `src/tools/github.ts`

- `GITHUB_PERSONAL_ACCESS_TOKEN` - Personal access token with repo access.

## Neon Tools
**File:** `src/tools/neon.ts`

The Neon tools support multiple ways to specify the database connection:

**Option 1: Full connection string (preferred)**
- `DATABASE_URL` - Full Postgres connection string
- `ENTERPRISE_DATABASE_URL` - Alternative enterprise database URL
- `NEON_SPP_DATABASE_URL` - Neon SPP database URL
- `NEON_CONNECTION_STRING` - Legacy env var name (still supported)

**Option 2: Individual components (assembled automatically)**
- `DB_HOST` - Database host
- `DB_PORT` - Database port (default: 5432)
- `DB_USER` - Database user
- `DB_PASSWORD` - Database password
- `DB_NAME` - Database name

The tool will use the first available connection string in this order:
1. `DATABASE_URL`
2. `ENTERPRISE_DATABASE_URL`
3. `NEON_CONNECTION_STRING`
4. Assembled from `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`

## TestSprite Tools
**File:** `src/tools/testsprite.ts`

- `TESTSPRITE_API_KEY` - API key for TestSprite service (currently not used, reserved for future API integration)

**Note:** Current implementation is a local generator only and does NOT call the real API yet.

## Dart Helper Tools
**File:** `src/tools/dart.ts`

- `DART_TOKEN` - Bearer token for Dart API authentication

## Memory Tools
**File:** `src/tools/memory.ts`

- `MEMORY_FILE_PATH` - Path to JSON file used as key-value store (default: `memory.json`)

## TaskManager Tools
**File:** `src/tools/taskmanager.ts`

- `TASK_MANAGER_FILE_PATH` - Reserved for future file-based task management (currently not used)

**Note:** Current implementation reads `/proc` directly on Linux/WSL systems.

## Chrome / Puppeteer Tools
**File:** `src/tools/chrome.ts`

- `PUPPETEER_EXECUTABLE_PATH` - Optional explicit path to Chrome/Chromium executable

**Note:** Only needed if Puppeteer can't find Chrome/Chromium automatically.

## Context7 Tools
**File:** `src/tools/context7.ts`  
**No environment variables required.**

Pure in-process relevance ranking helper.

## Sequential-thinking Tools
**File:** `src/tools/sequential.ts`  
**No environment variables required.**

Pure in-process planning helper.

## Windows CLI
**Not used in this Linux/WSL setup.**  
Kept only for compatibility with older configs.

- `WINCLI_ENABLED` - Set to `true` for compatibility (not actively used)

