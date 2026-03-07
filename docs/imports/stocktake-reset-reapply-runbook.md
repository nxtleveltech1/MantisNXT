# Stock-Take Reset + Reapply Runbook (MCP-Only Writes)

## Purpose
Reset the prior `STOCK_TAKE_2026-02-26` inventory import effects and reapply from the corrected XLSX with deterministic SQL executed through Neon MCP.

## Inputs
- Spreadsheet: `c:\Users\garet\Downloads\STOCK TAKE - COUNTED UPDATES - 26-02 - 15_45.xlsx`
- Reference document: `STOCK_TAKE_2026-02-26`
- Environment: `.env.local` must include `DATABASE_URL` and `NEON_API_KEY`

## Execution Sequence
1. Generate transactional SQL + metadata (no DB writes):
```powershell
bun scripts/imports/generate-stocktake-reload-sql.ts "c:\Users\garet\Downloads\STOCK TAKE - COUNTED UPDATES - 26-02 - 15_45.xlsx" --reference-doc STOCK_TAKE_2026-02-26 --out scripts/imports/reports/generated/stocktake-reload.sql --meta-out scripts/imports/reports/generated/stocktake-reload.meta.json
```
2. Preview generated artefacts:
```powershell
Get-Content scripts/imports/reports/generated/stocktake-reload.meta.json
Get-Content scripts/imports/reports/generated/stocktake-reload.sql -TotalCount 120
```
3. Apply generated SQL via Neon MCP (write path):
```powershell
$env:NEON_DATABASE='mantis_issoh'; bun --env-file=.env.local scripts/migrations/apply-sql-via-mcp.ts scripts/imports/reports/generated/stocktake-reload.sql
```
4. Post-apply integrity verification (read-only):
```powershell
bun --env-file=.env.local scripts/imports/verify-stocktake-reload.ts "c:\Users\garet\Downloads\STOCK TAKE - COUNTED UPDATES - 26-02 - 15_45.xlsx" --reference-doc STOCK_TAKE_2026-02-26
$env:NEON_DATABASE='mantis_issoh'; bun --env-file=.env.local scripts/migrations/apply-sql-via-mcp.ts database/scripts/check_inventory_name_description_quality.sql
```
5. App-level quality gates:
```powershell
bun run lint
bun run type-check
```

## Expected Outcomes
- `core.stock_movement` rows for `STOCK_TAKE_2026-02-26` equals deduped spreadsheet rows.
- `core.stock_on_hand` quantity parity exact for all deduped rows.
- `UNMATCHED` stock-take products recycled and rebuilt from current input set only.
- `public.inventory_items.name` blank count = 0.
- Stock-take impacted `public.inventory_items.description` blank count = 0.

## Safety Guards Built Into Generated SQL
- Fails if stock-take locations are missing/unresolvable.
- Fails if UNMATCHED stock-take products are referenced by `purchase_order_items`.
- Fails if UNMATCHED stock-take products have non-stocktake movement dependencies.
- Fails on post-apply movement/quality count mismatches.

## Rollback Strategy
- Re-run generator with the previous accepted spreadsheet and apply through MCP.
- Because stock-take import is reference-doc scoped and deterministic, replay restores prior stock-take state.
