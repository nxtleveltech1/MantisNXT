# Test layout

- **`tests/`** — Main unit and integration tests (Jest/Vitest). Run with `bun test` or the project test script.
- **`scripts/tests/`** — Script-level integration tests (e.g. supplier rules engine, rental API, WooCommerce sync). Run individually; not part of the main test suite.
- **`testsprite_tests/`** — Python E2E tests (TestSprite). Run with the TestSprite runner.
- **`src/lib/utils/__tests__/`** — Co-located unit tests for `src/lib/utils`.

Use `tests/` for standard component, API, and service tests; use `scripts/tests/` for scripts that need a DB or external service.
