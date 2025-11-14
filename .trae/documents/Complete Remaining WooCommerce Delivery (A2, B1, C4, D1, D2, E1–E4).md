## Current State Snapshot

* Framework: `next@15` with App Router; dev script uses `next dev` (`k:\00Project\MantisNXT\package.json:10`).

* Runtime: Node 20 for build/run (Dockerfile uses `node:20` images) (`k:\00Project\MantisNXT\Dockerfile:1,12,20`).

* Package manager: npm (`package-lock.json` present). No `bun.lockb`.

* Tests: `jest` + `@playwright/test` (`k:\00Project\MantisNXT\package.json:25-33,28-31`).

* TS scripts executed via `tsx` (`k:\00Project\MantisNXT\package.json:23-24,49-51,60-61,71-72,80-86,91-101,105-110`).

* CI: GitLab pipeline runs `npm ci`, `npm run build/test` (`k:\00Project\MantisNXT\.gitlab-ci.yml:49-170`).

* Dev server helper referenced but missing: `scripts/dev-server-manager.js` (package script points to it; file not found).

## Migration Goals

* Use Bun for local development: package management and dev server.

* Keep production stable: Node for builds/runtime initially.

* Minimize friction for tests and tooling; shift where compatible.

* Provide clear runtime selection per script (`bun --bun` vs Node).

## Compatibility Assessment

* Next.js dev server under Bun: Supported; Bun docs recommend `bun --bun run dev` for Bun runtime, `bun run dev` for Node runtime \[5].

* Node API coverage in Bun: Most core modules are green; partial for `inspector`, `worker_threads`, `perf_hooks`, `crypto` (some methods), `child_process` (minor gaps) \[3].

* Repo usage:

  * `child_process.spawn` in `bootstrap-neon-two-dbs.ts` (`k:\00Project\MantisNXT\scripts\bootstrap-neon-two-dbs.ts:56-58`). Works on Bun; missing `gid/uid` features are not used \[3].

  * Bash calls in scripts (`bash scripts/run-validation.sh`) will still require Bash on Windows regardless of Bun (`k:\00Project\MantisNXT\package.json:61`).

  * Jest relies on Node internals; safest to continue running tests on Node initially.

  * Playwright is Node-centric; keep Node runtime for it initially.

## Impact Analysis

* Developer workflow: Faster installs (`bun install`) and quicker script startup; introduce `bun.lockb`.

* CI/CD: Optionally adopt Bun for dependency install to speed pipelines; requires Bun in runner image. Safer to keep Node in CI until dev migration is validated.

* Docker: Current images are Node-based; switching to Bun for dev containers is optional. For production, keep Node initially.

* Scripts: Many `tsx` calls can be run directly by Bun (native TS), but incremental migration recommended.

* Risk: Edge cases around Node-internal APIs used by third-party deps; isolate by keeping Node for tests/build until verified.

## Recommended Strategy (Phased)

* Phase 0: Audit & validate Bun dev locally; document runtime selections per script.

* Phase 1: Package manager migration to Bun for local dev; retain npm compatibility.

* Phase 2: Dev server on Bun; standardize commands.

* Phase 3: Script runtime migration (tsx → Bun where safe).

* Phase 4: Testing under Bun (optional pilot); otherwise continue Node for Jest/Playwright.

* Phase 5: CI/Docker adjustments (optional performance track).

* Phase 6: Documentation & onboarding updates.

## Implementation Plan

### Phase 0 — Audit & Validation

* Verify `bun --bun run dev` runs Next 15 without regressions (routing, API routes, HMR, Tailwind 4).

* Enumerate scripts by runtime needs: mark Node-required (Jest, Playwright, Bash wrappers) vs Bun-ready.

* Spot-check critical third-party deps with Bun (e.g., `puppeteer`, `redis`, `pg`).

### Phase 1 — Package Manager Migration

* Add `"packageManager": "bun@latest"` to `package.json`.

* Run `bun install` to generate `bun.lockb`; keep `package-lock.json` for rollback.

* Update `.gitignore`/tooling to recognize `bun.lockb`.

* Adjust dev docs to prefer `bun` commands; keep npm documented as fallback.

### Phase 2 — Dev Server on Bun

* Standardize local dev:

  * Bun runtime: `bun --bun run dev`.

  * Node runtime (fallback): `bun run dev`.

* Remove/replace the missing `scripts/dev-server-manager.js` reference: point `dev` to `next dev` directly or implement a Bun-compatible manager later.

* Confirm ports and env parity; update any helpers referencing `npm run dev:raw` (`k:\00Project\MantisNXT\scripts\test-woocommerce-sync-fix.js:131-133`).

### Phase 3 — Scripts Runtime Migration

* Replace `tsx` usages with Bun-native execution where practical:

  * Example: `bun run scripts/session-cleanup.ts` (Bun handles TS without `tsx`).

* Keep Node for scripts that spawn external CLIs (`psql`, `bash`) or rely on Node-only internals.

* Validate `child_process` use under Bun for the bootstrap script; adjust if issues.

### Phase 4 — Testing Strategy

* Continue running Jest via Node: `bun run test` (without `--bun`) to retain Node runtime.

* Keep Playwright on Node for now.

* Pilot `bun test` on a small subset (utility functions) to evaluate feasibility; consider gradual migration to `vitest` if desired.

### Phase 5 — CI/Docker Adjustments

* CI (optional): Add a `bun` job variant to compare pipeline time; otherwise keep Node.

* Docker dev (optional): Replace dev compose with `oven/bun` base; production remains Node until fully verified.

* If adopting Bun in CI: install Bun in runner or use `oven/bun` image for dependency stage; ensure Next build uses Node runtime as required.

### Phase 6 — Docs & Onboarding

* Update README/dev quickstarts to prefer Bun.

* Document runtime selection: `bun --bun` (Bun runtime) vs `bun run` (Node runtime for Next per Bun guide \[5]).

* Note Windows caveats for Bash scripts; recommend WSL or platform-independent alternatives.

## Dart Task Structure (to create after approval)

* Epic: "Adopt Bun for local development"

  * Task: Audit Bun compatibility across app and scripts

    * Subtasks: Validate Next dev on Bun; list Node-only scripts; dependency spot-checks

  * Task: Migrate package manager to Bun locally

    * Subtasks: Add `packageManager`; run `bun install`; add `bun.lockb`

  * Task: Standardize dev server commands

    * Subtasks: Update `dev` script; developer docs; fix references to `dev:raw`

  * Task: Migrate TS scripts where safe

    * Subtasks: Convert `tsx` calls; verify `child_process` usage

  * Task: Define testing runtime policy

    * Subtasks: Keep Jest/Playwright on Node; pilot `bun test`

  * Task: Optional CI/Docker performance track

    * Subtasks: Add bun install job; evaluate oven/bun dev image

  * Task: Documentation updates

    * Subtasks: README, onboarding, Windows notes

## Rollback Plan

* Retain `package-lock.json` and npm scripts; switch back via `npm ci` and `npm run dev`.

* Gate CI changes behind a feature branch; revert quickly if failures.

## Acceptance Criteria

* Bun dev server runs cleanly; HMR, API routes, Tailwind work.

* `bun install` reproducible; `bun.lockb` checked in.

* Clear guidance for when to use Bun vs Node per script.

* Tests and builds unchanged in reliability and speed (or improved).

## Commands Reference

* Start dev (Bun runtime): `bun --bun run dev`

* Start dev (Node runtime via Bun): `bun run dev`

* Install deps: `bun install`

## Sources

* Bun Next.js guide: <https://bun.com/docs/guides/ecosystem/nextjs>

* Bun Node compatibility matrix: <https://bun.com/docs/runtime/nodejs-compat>

* Community discussion re: Next & Bun: <https://github.com/vercel/next.js/discussions/55272>

