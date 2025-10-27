
# Playwright E2E Setup (Phase 5)

1. Install:
   ```bash
   npm i -D @playwright/test
   npx playwright install
   ```

2. Put tests under `tests/e2e/` (already created).
3. Ensure your UI elements have the data-testid attributes used by the spec, or update selectors accordingly.
4. Run:
   ```bash
   npx playwright test tests/e2e/stock_adjustment.spec.ts
   ```
