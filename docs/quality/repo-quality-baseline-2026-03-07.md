# Repo Quality Baseline (March 7, 2026)

## Goal
Make default CI/dev quality commands stable while preserving a strict full mode for debt burn-down.

## Changes
- Default `lint` now runs with baseline ignores loaded from `eslint-baseline-ignore.txt`.
- Default `type-check` now runs with `tsconfig.typecheck-baseline.json`.
- Added strict commands:
  - `lint:full`
  - `type-check:full`

## Notes
- Baseline mode is intended for operational continuity while historical debt is reduced incrementally.
- Full mode remains available to track and burn down legacy lint/type issues.
- Do not add new files to baseline lists unless approved.
