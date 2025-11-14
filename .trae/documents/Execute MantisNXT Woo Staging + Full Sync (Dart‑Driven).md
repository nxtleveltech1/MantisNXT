## Execution Governance (Dart‑Driven)
- Source of truth: Dart EPICs A–E and subtasks (all To‑do). Work runs strictly from these items.
- Status policy: Move each task To‑do → Doing → Done with brief notes and links to code changes.
- Cadence: Complete tasks sequentially (A → B → C → D → E) unless blockers force reordering.

## Phase A — Harden Backbone
- A1: Schema compat views & dev checks; ensure plural/singular views and divergence checks.
- A2: Canonical Woo config; unify shape and normalize snake/camel usage in service.
- A3: Safe paging & deltas; enforce maxPages for previews; prefer modified_after for long runs.
- A4: Activity log typing; strict `{ data, rowCount }` and shared types.
- A5: Empty‑state UX & dev seeds; initial import messaging; deterministic seed data for tests.
- Verification: Unit/API tests green; endpoints load without fallbacks.

## Phase B — Foundational Full Pull
- B1: Customer full sync; verify `customer` rows + `woocommerce_sync` snapshots.
- B2: Orders inbound; idempotent mapping by external_id; store full payloads.
- B3: Products inbound; upsert minimal product/inventory; store full JSON.
- B4: Categories inbound; upsert taxonomy; store full JSON.
- Verification: Count checks by `entity_type`; spot‑check payload fields (line_items, meta_data).

## Phase C — Woo Data Staging UI
- C1: Add Woo Data tab with Products/Orders/Customers.
- C2: Backend table endpoints returning `{ data, rowCount, page, pageSize }` from `woocommerce_sync` + preview cache.
- C3: Refresh flow; POST preview fetch then GET table.
- C4: Row selection; persist to `sync_selective_config` via preview select.
- Verification: UI renders tables; status flags mirror preview; selection persists.

## Phase D — Sync to Core
- D1: Customers → core; selections feed Customer Sync queues; mappings preserved.
- D2: Products → core & stock; stable `product_id`, inventory mirroring; SKU conflict rule.
- D3: Orders normalization (Phase 2); migrations for `sales_orders`, `sales_order_items`; transformer populates normalized tables.
- Verification: Core tables populated; idempotent replay; serve views reflect new data.

## Phase E — Security & Ops
- E1: Auth & scoping; secure org‑scoped routes.
- E2: Credential handling; secrets only server‑side; never sent to frontend.
- E3: Rate limiting & timeouts; protect sync endpoints; error logging.
- E4: Monitoring & metrics; durations, counts, mapped/updated; activity logs.

## Dart Updates
- For each subtask: set Doing at start, add progress notes, set Done with deliverable summary and links (file_path:line_number where relevant).
- EPIC roll‑ups: Mark completed when all subtasks Done; add summary and verification results.

## Verification & Handover
- DB verification: counts per `entity_type` and payload completeness.
- API verification: smoke tests for sync and table endpoints; preview refresh.
- E2E verification: run staging → selection → core sync path for a sample set; confirm UI and data.

## Start Conditions
- You confirm this plan; then execution proceeds immediately with Dart‑tracked updates until 100% delivery, no fallbacks or mock data.