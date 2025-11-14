## Guiding Principles
- MCP-first: use Neon DB tools, explain/analyze, migrations via temporary branches, and verify before commit.
- Zero-loss capture: store complete Woo payloads in `woocommerce_sync.sync_data` for products, orders, customers, categories.
- Staging → Core: expose Woo data via tables and selective sync; normalize incrementally.
- Decision gate: halt on constraint conflicts and request explicit approval.

## Milestones
1. Backbone hardening (A): config canon, safe paging, activity log typing, empty states.
2. Foundational full pull (B): customers, orders, products, categories → synced with full snapshots.
3. Woo Staging UI (C): Products/Orders/Customers tables powered by preview cache + sync_data.
4. Core sync wiring (D): selected Woo → core customer/product/stock; orders normalization as Phase 2.
5. Security & Ops (E): auth scoping, credential handling, rate limits, monitoring.

## EPIC A — Harden Integration Backbone
- Schema compat views: keep plural/singular views; document as temporary; add dev checks.
- Canonical config: unify `WooConfig` shape across service and migrations.
- Safe fetchAllPages: config object with `maxPages`; use delta windows for long runs.
- Activity log: strict `{ data, rowCount }` contract; shared types; optional zod validation.
- Empty states: clear initial-import messaging; dev seeds for delta testing.

## EPIC B — Foundational Full Pull
- Customers: run queue-based full sync; verify rows in `customer` and `woocommerce_sync`.
- Orders: finish inbound sync; map/create/update via `integration_mapping`; store full payloads.
- Products: implement inbound sync; upsert minimal `products`/`inventory_items`; store snapshots.
- Categories: sync taxonomy; upsert table, metadata jsonb; write `woocommerce_sync` entries.

## EPIC C — Woo Data Staging UI
- Tabs: add Woo Data under Integration; subtabs Products/Orders/Customers.
- Endpoints: `GET /api/v1/integrations/woocommerce/table?entity=...` using preview cache + sync_data.
- Refresh flow: POST preview `action=fetch` then GET table; status flags reflect deltas.
- Selection: per-row/bulk select; POST preview `action=select` to persist selective config.

## EPIC D — Sync to Core
- Customers: pipe selections into Customer Sync queues; maintain mappings.
- Products: stable `product_id`; reflect stock in `inventory_items`; resolve SKU conflicts deterministically.
- Orders (Phase 2): design normalized `sales_orders`/`sales_order_items`; transform from snapshots.

## EPIC E — Security & Ops
- Auth scoping: secure, org-isolated endpoints.
- Credentials: store in integration tables; never expose secrets to frontend.
- Rate limiting & timeouts: protect sync APIs; slow-call logging.
- Monitoring: record durations, counts, mapped/updated stats.

## Verification Plan
- DB checks: counts by `entity_type` in `woocommerce_sync`; spot-check payload completeness.
- Endpoint contracts: type-safe responses; frontend renders without fallbacks.
- Re-run safety: idempotent mapping; delta-based fetch.

## Next Actions
1. Implement EPIC A tasks.
2. Execute B1–B4 full pull and verify.
3. Build C endpoints and UI tables.
4. Wire D selective sync; schedule Phase 2 orders normalization.
5. Apply E security/ops hardening.

## Decision Gate
- If any step conflicts with system constraints, stop, document the conflict, and request explicit approval before proceeding.