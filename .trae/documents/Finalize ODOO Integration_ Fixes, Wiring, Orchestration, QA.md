## Goals
- Resolve Console SyntaxError (Unexpected token '<').
- Complete Odoo staging UI wiring and backend integration.
- Enable end-to-end staging → selection → orchestration → promotion.
- Deliver validation, QA, and performance checks.

## Diagnosing the Console Error
- Verify the dev server port (`3005`) and routes exist under `src/app/api/v1/integrations/odoo/*`.
- Use browser DevTools:
  - Network tab for `GET /api/v1/integrations/odoo/table?entity=products` and `POST /api/v1/integrations/odoo/queue/products`.
  - Confirm status codes, response content-type (`application/json`), and body.
- Check server console for route stack traces. If HTML error page is returned:
  - Ensure route paths match the app router structure (`/api/v1/integrations/odoo/...`).
  - Add robust error handling in endpoints so they always return `NextResponse.json(...)`.
- Validate UI fetch calls (path correctness, headers like `x-org-id`, pagination params) in `src/app/integrations/odoo/page.tsx`.

## Backend Wiring Completion
- Table endpoint (`GET /api/v1/integrations/odoo/table`) consumes Neon functions:
  - `public.odoo_queue_table(entity, page, page_size)`
  - `public.odoo_queue_count(entity)`
- Queue staging endpoint (`POST /api/v1/integrations/odoo/queue/[entityType]`):
  - Build `OdooService` from active connector
  - Fetch records via `searchRead`
  - Bulk insert with `public.odoo_queue_create_and_fill(entity, org_id, queue_name, records::jsonb)`
- Selection endpoint (`POST /api/v1/integrations/odoo/select`):
  - Calls `public.odoo_queue_select(entity, ids[], selected, user)`
- Orchestration endpoints:
  - Start (`POST /api/v1/integrations/odoo/orchestrate/start`) → `public.sync_start_orchestration(...)`
  - Queue status (`GET /api/v1/integrations/odoo/queue/status`) → `public.sync_queue_status(org_id)`

## UI Wiring & Flow
- Data tab (Odoo Integration):
  - Buttons: Stage (queues records), Load (fetch Neon), Select All/Clear (update selections), Queue Status (monitor), Start Orchestration.
  - Tables: `external_id`, `status`, trimmed `raw` payload.
- Add guards:
  - Display errors from JSON responses (status and message).
  - Prevent `.json()` on HTML by checking `res.headers.get('content-type')` contains `application/json`.

## Orchestration & Promotion (O4)
- After selections:
  - Start orchestration for `customers` and `products`.
  - Monitor status (counts for processed/failed/skipped).
  - Confirm idempotent updates using `IntegrationMappingService` and `OdooService`.
- Acceptance:
  - Selected rows marked `completed` in Neon.
  - Mapping rows created/updated.
  - Sync activity log entries present.

## Capture (O2) Expansion
- Products/templates: stage `product.template` (and variants if needed).
- Customers: stage `res.partner` with `customer_rank > 0`.
- Orders: stage `sale.order` minimal payload for staging; promotion deferred to Phase 2.
- Categories, Taxes, Logistics (Phase 2): add staging endpoints similarly; store in Neon via bulk insert.

## QA & Perf (O5)
- QA:
  - Unit tests for endpoints (return JSON on error).
  - Integration tests: stage → load → select → start orchestration → verify Neon state.
- Performance:
  - Targets: 10k partners < 5m preview; 50k products < 15m staging; table render p95 < 300ms.
  - Measure endpoint latencies and Neon function call times.

## Validation Checklist
- Neon tables and functions present.
- Endpoints return JSON with correct status codes.
- UI actions:
  - Stage inserts rows (check `rowCount` increments).
  - Load shows paginated data.
  - Selections update Neon (`selected=true/false`).
  - Orchestration starts and status returns counts.
- Mapping and sync logs created/updated.

## Execution Plan
1. Diagnose the Console error via DevTools and logs; add content-type guards and JSON error handling as needed.
2. Verify endpoints live under `/api/v1/integrations/odoo/*` respond with JSON.
3. Stage products/customers/orders; Load and review tables.
4. Update selections; Start orchestration; Monitor queue status.
5. Validate mapping/sync states; mark O4 tasks complete.
6. Expand O2 to categories/taxes/logistics; add QA tests; measure performance.

## Rollback & Safety
- All Neon changes are additive; rollbacks by dropping functions if required.
- API endpoints only read/write through vetted Neon functions; no direct destructive operations.
- UI guards prevent invalid requests.

Confirm to proceed; then I will execute fixes and remaining deliverables end-to-end without stopping.