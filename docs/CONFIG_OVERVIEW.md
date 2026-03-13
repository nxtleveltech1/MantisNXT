# Config overview

Reference for root-level config files and their roles.

## TypeScript

| Config | Purpose |
|--------|---------|
| `tsconfig.json` | Base TypeScript config; `paths` and compiler options for the app |
| `tsconfig.build.json` | Build-time config (when used by build tooling) |
| `tsconfig.typecheck-baseline.json` | Typecheck (e.g. `bun run type-check`); excludes known issues / baseline |
| `tsconfig.inventory-integrity.json` | Inventory integrity checks (specialized checks) |

## ESLint

| Config | Purpose |
|--------|---------|
| `eslint.config.js` | Main ESLint config |
| `eslint.config.security.js` | Security-focused rules |
| `eslint-baseline-ignore.txt` | Baseline ignore list for lint |

## Docker

| Config | Purpose |
|--------|---------|
| `docker-compose.yml` | Production-style image and run |
| `docker-compose.dev.yml` | Development container with live reload and repo mount |

## Other

- **`components.json`** — shadcn/ui component config
- **`next.config.js`** — Next.js app config
- **`tailwind.config.js`** — Tailwind CSS
- **`vercel.json`** — Vercel deployment
- **`env.example`** / **`.env.production.example`** — Env templates

## Database layer split

Application database access uses both:

- **`lib/database/`** (repo root) — Core connection and pool implementation (`enterprise-connection-manager`, `unified-connection`, `spp-connection-manager`). Used by `src/lib/database.ts` and `src/lib/database/index.ts` via relative imports.
- **`src/lib/database/`** — Re-exports and app-specific helpers; `@/lib/database` in code resolves here and delegates to root `lib/database/` where needed.

Do not move or rename root `lib/database/` without updating those imports and the re-exports in `src/lib/database/`.
