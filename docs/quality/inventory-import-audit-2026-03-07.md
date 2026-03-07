# Inventory Import Integrity Audit (March 7, 2026)

## Scope
- Stock-take import flow and outcomes from March 6, 2026.
- Rolling Thunder pricelist import flow and outcomes from February 6, 2026.
- Inventory API/view data path feeding `/api/inventory` and UI rendering.

## Evidence Summary
- `schema_migrations` shows `0218_fix_inventory_items_view_columns` executed at **2026-03-06T16:37:57Z**.
- Applied 0218 view logic sets `public.inventory_items.description` to `NULL::text`.
- Stock-take import report file: `scripts/imports/reports/stocktake-2026-02-26-report.json`.
- Stock-take movement rows in DB for `reference_doc = 'STOCK_TAKE_2026-02-26'`: **2,294**.
- Distinct impacted products for same reference: **2,194**.
- Duplicate movement side effect: **100** extra duplicate movement rows.
- Rolling Thunder upload (`upload_id = b7e2a1c3-4d5f-6789-abcd-ef1234560001`, `2026-02-06`) has rows where `spp.pricelist_row.name = ''` for SKUs shown as Unknown Product.

## Reconciled Findings
1. `0218_fix_inventory_items_view_columns` solved missing columns for `/api/inventory` compatibility but introduced persistent blank descriptions because view description was hardcoded `NULL`.
2. Stock-take import pipeline correctly upserted stock and movements, but did not consistently refresh text fields on matched products (fill-blanks behavior was absent).
3. Rolling Thunder import accepted blank product names from source and propagated blanks to `core.supplier_product.name_from_supplier`, causing UI fallback to "Unknown Product".
4. Claimed stock-take completion metrics are directionally correct for quantities and stock records, but movement count has duplicate side effects from reruns/partial retries.

## Decision Log Applied in This Increment
- Keep API shape unchanged; improve semantics for `name` and `description` values.
- Add migration-based view correction and targeted backfills.
- Harden import paths to prevent blank-name regressions.
- Add SQL quality gate for CI/staging.

## Post-Remediation Acceptance Targets
- `public.inventory_items.name` blank rows: **0**.
- Stock-take impacted products with blank inventory description: **0**.
- Screenshot sample SKUs render non-empty product names.
- `/api/inventory` response shape unchanged.
