# Execution Plan — ODOO Integration (Sequential & Linear)

Version: 0.1 (Draft)
Governance: Project Rules · MCP Server Required for all operations

## Roadmap Phases
- Phase 0: Enable ODOO connector backbone
- Phase 1: Foundational full pull (zero‑loss snapshots)
- Phase 2: Staging/Explorer UI for ODOO data
- Phase 3: Promotion into core (normalized tables)
- Phase 4: Security, Ops, QA, Performance

## EPIC O1 — Harden ODOO Integration Backbone
- O1.1 Odoo config normalization
  - Implement `OdooConfig` (url, db, username, password/token)
  - Constructor normalization; encrypted storage; no secrets to frontend
  - Acceptance: Single canonical config used; legacy keys supported
- O1.2 RPC Client & Paging
  - Add `search_read` helper with domain, fields, limit/offset, order
  - Implement `fetchAllPages` with `options.maxPages` and chunk size
  - Acceptance: Previews capped; full sync uses deltas (`write_date`)
- O1.3 Provider enums & sync tables
  - Extend provider enum with `odoo`
  - Use `entity_type = product|partner|sale_order|category|tax|coupon|payment|shipment|invoice`
  - Acceptance: Rows land with full `sync_data` and hashed snapshots
- O1.4 Activity log contract
  - Unified `{ data, rowCount }` response; typed front/back
  - Acceptance: No runtime errors; observable sync runs
- O1.5 Empty‑state UX & dev seeds
  - Clear initial import messaging; seed small dev datasets
  - Acceptance: UX clarity; local testing feasible

## EPIC O2 — Capture All Valuable ODOO Data (Foundational Full Pull)
- O2.1 Partners (Customers)
  - Domain: `[("customer_rank", ">", 0)]`
  - Store full partner dicts in `sync_data`; map core `customer`
  - Acceptance: Every customer mirrored; derived metrics if applicable
- O2.2 Products & Variants
  - Read `product.template` and `product.product`; map attributes
  - Upsert core `products` (template fields) and variant SKUs; stock from `stock.quant`
  - Acceptance: Templates/variants synchronized; stock mirror where meaningful
- O2.3 Categories
  - Sync `product.category` tree; metadata retains external IDs
  - Acceptance: Category structure matches ODOO
- O2.4 Orders
  - Sync `sale.order` + `sale.order.line`; store taxes/pricelist refs
  - Acceptance: Full payload in `sync_data`; idempotent mappings
- O2.5 Taxes & Fiscal Positions
  - Sync `account.tax`, `account.fiscal.position`
  - Acceptance: Tax entities available for pricing/analytics
- O2.6 Logistics & Payments (Phase 2)
  - `delivery.carrier`, `stock.picking`, `stock.move`; `payment.provider`, `account.move` invoices/credit notes
  - Acceptance: Reference data captured with `sync_data`

## EPIC O3 — ODOO Data Staging/Explorer UI
- O3.1 Tabs under Integrations → ODOO
  - Tabs: Sync & Ops, Odoo Data (Products, Orders, Customers), Config, Settings, Sync History
  - Acceptance: Operator can browse Odoo Data sub‑tabs
- O3.2 Backend table endpoints
  - `GET /api/v1/integrations/odoo/table?entity=products|customers|orders`
  - Join `sync_preview_cache` + `odoo_sync` (or extended sync table)
  - Response: `{ data[{ external_id, status, display, raw }], rowCount, page, pageSize }`
  - Acceptance: Paginated tables render with statuses and key fields
- O3.3 Hook into Preview/Delta
  - `POST /api/v1/integrations/sync/preview?action=fetch&sync_type=odoo&entity_type=...`
  - Acceptance: Refresh updates status flags; preview and tables aligned
- O3.4 Row actions & selection
  - Include/Ignore; bulk selection; persist to `sync_selective_config`
  - Acceptance: Selections drive actual sync behavior

## EPIC O4 — Promotion to Core NXT Data
- O4.1 Customers → core
  - Transform partner fields; maintain mappings; metadata preservation
  - Acceptance: Selected customers appear in core with correct links
- O4.2 Products/Variants → core product & stock
  - Stable internal `product_id` per template; variants as inventory items or distinct SKUs
  - Acceptance: First‑class items in core UIs; SKU conflicts resolved by policy
- O4.3 Orders → core order history (Phase 2)
  - Normalize into `sales_orders`/`sales_order_items`; link taxes/pricelist; optional deliveries/invoices
  - Acceptance: Reports run on normalized tables without raw JSON

## EPIC O5 — Security, Ops, QA, Performance
- O5.1 Auth & scoping
  - Org→company mapping; secure routes; strict RLS
  - Acceptance: No cross‑org/company leakage
- O5.2 Credential handling
  - Encrypted storage; secrets never leave backend
  - Acceptance: Compliance checks pass; logs clean
- O5.3 Rate limiting & monitoring
  - Per‑integration quotas; metrics on duration/counts/errors
  - Acceptance: Observable and throttled sync operations
- O5.4 Quality Assurance Procedures
  - Unit tests: RPC helpers, domain builders, transformers
  - Integration tests: end‑to‑end preview→stage→promote
  - UAT scripts: operator workflows in Explorer UI
  - Acceptance: Green tests; UAT sign‑offs recorded
- O5.5 Performance Benchmarks
  - Targets: 10k partners < 5m preview; 50k products < 15m full pull; table render p95 < 300ms with pagination
  - Acceptance: Measurements logged; regressions alerted

## Task Breakdown with Dependencies (Linear)
- T1: Implement Odoo RPC client (dep: none)
- T2: Extend provider enums and sync schemas (dep: T1)
- T3: Partners full pull + mapping (dep: T2)
- T4: Products/templates/variants full pull (dep: T2)
- T5: Categories full pull (dep: T2)
- T6: Preview/delta for partners/products/orders (dep: T3/T4)
- T7: Explorer UI tabs and table endpoints (dep: T6)
- T8: Promotion transforms (customers/products) (dep: T7)
- T9: Orders normalization (Phase 2) (dep: T7)
- T10: Security/RLS & monitoring (parallel; dep: T2)
- T11: QA test suite & UAT scripts (parallel; dep: T7)

## Resource Allocation Plan
- Backend Engineer (RPC, transforms, endpoints): T1–T9
- Data/DB Engineer (schemas, indexes, performance): T2, T8–T9, O5.5
- Frontend Engineer (Explorer UI): T7
- QA Engineer (tests, UAT): O5.4, validations
- Odoo Functional/Technical Consultant (domains, mappings, workflows): O2–O4

## Validation Procedures
- Cross‑Platform Compatibility Checks
  - Timezones, currencies, UoM, multi‑company isolation
- End‑to‑End Scenario Testing
  - Product sync (template+variant), customer import, order import, stock mirrors, promotions
- Integration Point Verification
  - Partners, products, orders, taxes, categories, logistics, payments
- Documentation of Validation Results
  - Populate validation matrices with pass/fail + evidence
- Stakeholder Sign‑Off
  - MCP workflow gates for selection commit and promotion; sign‑off recorded

## MCP Server Utilization & Governance
- All operations initiated via MCP actions; approvals enforced
- Decision gates when constraints conflict; log owner, timestamp, choices, risks, recommendation
- Versioning: Increment docs version on changes; record changelog entries

## Milestone Acceptance Criteria
- M0: Backbone operational; preview deltas return data
- M1: Full pull completed; sync tables contain raw snapshots; counts verified
- M2: Explorer UI usable; selections persisted
- M3: Customers/products promoted to core; reports functional
- M4: Security/QA/Performance targets met; sign‑offs obtained

## Change Management & Decision Log
- Every schema/config change documented with rationale, impact, risk, and approval
- Use MCP to store decision artifacts tied to runs and deployments

## Next Actions
- Implement T1–T3 immediately; schedule T4–T7; prepare QA and performance monitoring hooks

