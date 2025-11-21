# agents.md - Codex / OpenAI Agent Guide

This document tells the **OpenAI Agent (Codex)** how to work in this repository.

You are expected to:

- Use **Bun** as the primary package manager and runtime.
- Respect the **project structure**, **coding standards**, and **security rules** below.
- Use available **MCP servers** for reading/writing files, running tools, and querying external systems, instead of guessing.

---

## 1. Goals & Priorities

When working in this repo, you should:

1. **Keep the project buildable and testable**
   - Code must type-check, lint cleanly, and build.
2. **Prefer clarity over cleverness**
   - Simple, readable implementations are preferred.
3. **Preserve existing architecture and patterns**
   - Follow the folder structure and conventions already in use.
4. **Be safe and non-destructive**
   - Do not delete or rewrite large parts of the codebase unless explicitly asked.
   - Do not introduce secrets into the codebase or logs.

---

## 2. Runtime, Tooling & Commands (Bun-First)

This repo is configured with `packageManager: bun@latest`.  
When you propose or run commands, **prefer Bun**.

### Core Commands

- Install dependencies  
  ```bash
  bun install
  ```

- Start dev server (Next.js @ http://localhost:3000)  
  ```bash
  bun run dev
  ```

- Lint  
  ```bash
  bun run lint
  ```

- Type-check (strict TypeScript)  
  ```bash
  bun run type-check
  ```

- Build (production)  
  ```bash
  bun run build
  ```

- Validate API  
  ```bash
  bun run validate:api
  ```

- Validate browser/UI  
  ```bash
  bun run validate:browser
  ```

### Data / Infra Commands

- Run DB migrations locally  
  ```bash
  bun run db:migrate
  ```

- Full DB validation  
  ```bash
  bun run db:validate:full
  ```

- NXT-SPP workflow  
  ```bash
  bun run integration:full
  bun run integration:verify
  ```

> If Bun is unavailable in a specific environment, you may mention npm equivalents  
> (e.g. `npm install`, `npm run dev`) but **Bun is the default**.

---

## 3. Project Structure & Organization

Assume a Next.js + TypeScript app with this structure:

- `src/app/`  
  Next.js routes, pages, API route handlers.

- `src/components/`  
  Reusable UI components. **No business logic**; keep them presentational or light.

- `src/services/`  
  API/DB helpers and integration logic (fetching, persistence, external services).

- `src/domain/`  
  Domain/business logic and domain models. Prefer to keep core rules here.

- `src/lib/` and `src/utils/`  
  Cross-cutting helpers and utilities (env loading, logging, formatting, etc.).

- `src/stores/`  
  State management (e.g. Zustand/Redux).

- `database/`  
  SQL scripts, schema helpers, and seed data.

- `migrations/`  
  Versioned database migrations.

- `scripts/`  
  Automation, validation, deployment helpers.

- `public/`  
  Static assets.

- `docs/`  
  Architecture docs, operational runbooks, ADRs, etc.

- Tests  
  - `__tests__/` - Jest test suites (`*.test.ts`), organized by domain (`auth`, `services`, `integration`, etc.).
  - `__tests__/fixtures/` - shared fixtures.
  - `tests/` and `test-results/` - additional artifacts, snapshots, and reports.

When adding new code, **mirror this structure**. For new features, prefer:

- Route in `src/app/`
- Business logic in `src/domain/`
- Integration logic in `src/services/`
- UI in `src/components/`
- Shared helpers in `src/lib/` or `src/utils/`
- Tests in `__tests__/` with fixtures in `__tests__/fixtures/`

---

## 4. Coding Style & Conventions

### Formatting

- Use **Prettier** with:
  - 2-space indentation
  - Print width: 100
  - Single quotes
  - Trailing commas: `es5`
  - Tailwind plugin enabled
- When modifying TS/TSX/JSON/Markdown, prefer running:
  ```bash
  bun run format
  ```

### ESLint

- ESLint extends:
  - Next.js recommended configs
  - `eslint-plugin-ssot`
  - `unused-imports`
- Keep imports:
  - Ordered logically (framework → libraries → internal modules).
  - Free of unused imports.

### Naming

- React components: **PascalCase** (`UserProfileCard`).
- Hooks: start with `use` (`useAuth`, `useFeatureFlags`).
- Utility modules: **kebab-case** filenames (`file-loader.ts`, `date-formatter.ts`).
- Shared types/interfaces:
  - Live in a `types/` folder when reused broadly.
  - Use `Type` / `Props` suffixes, e.g. `UserType`, `ButtonProps`.

### Types, Validation & Env

- Prefer strict TypeScript, avoid `any`.
- Use **Zod** in `services/` and `domain/` to validate:
  - External API responses.
  - Complex request payloads.
  - DB results when appropriate.
- Centralize environment variable access in `src/lib` (e.g. `src/lib/env.ts`):
  - Do **not** scatter `process.env.*` reads throughout components/services.
  - When you need new env vars, add them to the central env helper.

---

## 5. Testing Rules

- Place Jest tests in `__tests__/` as `*.test.ts`.
- Mirror the domain structure:
  - `__tests__/auth/...`
  - `__tests__/services/...`
  - `__tests__/integration/...`
- Use fixtures from `__tests__/fixtures/` for complex payloads.

When you change behavior:

1. Update existing tests or add new tests.
2. Prefer small, focused tests near the domain you are modifying.

### Useful Commands

- Focused test run, e.g. auth suite:
  ```bash
  bun test __tests__/auth/authentication.test.ts
  ```
- Before a PR or major change, aim for:
  ```bash
  bun run lint
  bun run type-check
  bun test
  bun run validate:api
  bun run validate:browser
  ```

---

## 6. Security & Configuration

You **must not**:

- Introduce secrets into source code, tests, or fixtures.
- Print secrets or tokens into logs or error messages.

Configuration rules:

- Base local env on:
  - `.env.example`
  - `.env.production.template`
- Sensitive values (e.g. Vercel tokens, Neon DB credentials, OAuth secrets) belong in:
  - Environment variables
  - Platform-specific secret stores  
  **not** in the repo.

When adding new integrations:

1. Add required env validation to `scripts/validate-env-config.ts`.
2. Only add necessary public config to `vercel.json`.
3. Document new variables in `docs/` and/or `.env.example`.

---

## 7. Error Handling, Logging & API Contracts

### Error Handling

- Prefer explicit, typed error handling in `src/domain/` and `src/services/`.
- Use Zod to validate and fail fast on invalid data.
- Avoid throwing generic `Error` with vague messages; prefer domain-specific error shapes.

### API Routes

- Prefer a consistent JSON pattern, e.g.:
  - Success:
    ```json
    { "data": { ... }, "error": null }
    ```
  - Failure:
    ```json
    {
      "data": null,
      "error": { "code": "SOME_CODE", "message": "Human-readable explanation" }
    }
    ```
- Use appropriate HTTP status codes (2xx, 4xx, 5xx).

### Logging

- Use a central logger (e.g. `src/lib/logger.ts`) instead of raw `console.log` in production paths.
- Log **events**, not noise:
  - Auth failures, unexpected external responses, DB issues, etc.
- Do not log secrets, tokens, or raw credentials.
- Prefer structured logs, e.g.:
  ```ts
  logger.error('user_login_failed', { userId, reason });
  ```

---

## 8. MCP Servers - How You Should Use Them

This repository may expose multiple **Model Context Protocol (MCP)** servers for the agent.  
You should prefer using these servers over guessing or making assumptions, especially for reading/writing files and running commands.

> **Important:**  
> - Use the **least-privileged** MCP tool that solves the problem.  
> - Avoid destructive or irreversible operations unless explicitly requested.  
> - Read before you write: inspect relevant files and context before editing.

### 8.1. General Rules for All MCP Servers

When interacting with MCP servers:

1. **Discover capabilities first**  
   - Use the server's introspection/listing tool (e.g. `list_tools`, `get_schema`, or equivalent) to understand what it can do.
2. **Small, incremental changes**  
   - Apply focused edits, not mass rewrites, especially across many files.
3. **Confirm assumptions with actual data**  
   - Read the relevant file or resource via MCP before changing it.
4. **Prefer idempotent and reversible actions**  
   - For anything affecting DBs or infra, ensure it can be rolled back (via migrations/scripts).

> If a specific server is not available, do **not** assume its existence.  
> Work with the servers that are actually exposed in the agent configuration.

---

### 8.2. Filesystem / Repo Servers

Typical names: `filesystem`, `fs`, `repo`, or similar.

Use these servers to:

- **Read files** before editing:
  - Source files under `src/`
  - Test files in `__tests__/`
  - Configuration in `package.json`, `tsconfig.json`, `.eslintrc.*`, `next.config.*`, etc.
- **Write or update files**:
  - When adding new components, hooks, services, domain logic, tests, or docs.
- **List directories**:
  - To understand the existing project layout and patterns.

Guidelines:

- Do **not**:
  - Delete important config files, lockfiles, or large directories.
  - Mass-rename or move many files unless specifically instructed.
- When editing code:
  - Keep changes minimal and localized.
  - Maintain formatting and lint rules.
- When adding new files:
  - Place them in the correct folder according to the project structure.
  - Add or update tests alongside.

---

### 8.3. Shell / Process / Task Servers

Typical names: `shell`, `process`, `task-runner`, etc.

Use these servers to **run safe commands** such as:

- `bun run lint`
- `bun run type-check`
- `bun test`
- `bun run build`
- `bun run validate:api`
- `bun run validate:browser`
- `bun run db:migrate` (when explicitly requested or needed for local DB state)

Guidelines:

- Prefer read-only or validation commands.
- Do **not** run:
  - Arbitrary destructive commands (`rm -rf`, direct DB drops, etc.).
  - System-level package installation commands unless explicitly instructed.
- Use command outputs to:
  - Fix type errors.
  - Resolve lint violations.
  - Adjust tests or implementation to make CI green.

---

### 8.4. Database / SQL Servers

Typical names: `db`, `postgres`, `sql`, etc.

Use these to:

- **Inspect schema**:
  - Tables, columns, indexes, relationships.
- **Run safe, read-focused queries** to understand:
  - Domain entities.
  - Example records (sanitized or non-sensitive).
- **Verify migrations**:
  - Resolve differences between migration files and actual schema.

Guidelines:

- Prefer **SELECT** and schema introspection.
- Avoid direct destructive operations (`DROP`, `TRUNCATE`, mass `DELETE`) via MCP.
- Schema changes should be expressed as:
  - Code-based migrations in `migrations/`.
  - Run via `bun run db:migrate` rather than ad-hoc SQL modifications.

---

### 8.5. HTTP / External API Servers

Typical names: `http`, `fetch`, `rest`, `external-api`, etc.

Use these to:

- Fetch **documentation** or non-sensitive public information from external services when needed.
- Understand existing external API contracts and examples.

Guidelines:

- Do not use external APIs to:
  - Send secrets or internal data outside the system.
  - Make destructive changes to production environments.
- Use them primarily for:
  - Reading docs.
  - Confirming schemas.
  - Fetching public reference information.

---

### 8.6. VCS / Git / GitHub Servers

Typical names: `git`, `github`, `repo-history`, etc.

Use these servers to:

- Inspect **commit history** related to a file or feature.
- Understand why a pattern or abstraction exists.
- View diffs to see recent changes.

Guidelines:

- Use history to preserve intent and avoid regressions.
- When altering something that was recently changed, consider:
  - Why it was introduced.
  - Whether tests or docs need to be updated accordingly.

---

### 8.7. Other MCP Servers

If additional MCP servers are defined (e.g. for logging, messaging, feature flags):

- Determine their purpose via introspection.
- Use them in a **read-first, write-conservative** fashion.
- Avoid mutating external state (e.g. posting messages, toggling production flags) unless explicitly requested and clearly safe.

---

## 9. AI Assistant (Codex) Behavior Summary

When acting in this repo, you should:

1. **Use MCP servers** to inspect and modify files, run checks, and query schema instead of guessing.
2. **Use Bun commands** for install, dev, lint, type-check, build, tests, and validations.
3. **Follow the existing architecture**:
   - Place code in the correct folders.
   - Follow naming and formatting conventions.
4. **Maintain or improve test coverage**:
   - Update tests when changing behavior.
   - Keep fixtures in `__tests__/fixtures`.
5. **Respect security and configuration rules**:
   - No secrets in code, tests, or logs.
   - Use central env helpers and validation scripts.
6. **Make small, safe, reversible changes** unless explicitly instructed otherwise.

If you are unsure how to perform a change, prefer:

- Reading more context via MCP.
- Running non-destructive validation commands.
- Taking the smallest possible safe step and explaining what you did.
