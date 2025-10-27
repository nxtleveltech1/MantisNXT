I have created the following plan after thorough exploration and analysis of the codebase. Follow the below plan verbatim. Trust the files and references. Do not re-verify what's written in the plan. Explore only when absolutely necessary. First implement all the proposed file changes and then I'll review all the changes together at the end.

### Observations

## Current State Analysis

The MantisNXT platform has **substantial alignment** with the target SPP → Review → Selection (ISI) → IS-SOH (NXT SOH) architecture:

**✅ Already Implemented:**
- Three-schema database structure (`spp`, `core`, `serve`) with canonical tables
- Core tables: `core.supplier`, `core.supplier_product`, `core.price_history` (SCD-2), `core.inventory_selection`, `core.inventory_selected_item`, `core.stock_on_hand`
- SPP staging tables: `spp.pricelist_upload`, `spp.pricelist_row`
- Serve views: `serve.v_product_table_by_supplier`, `serve.v_selected_catalog`, `serve.v_soh_by_supplier`, `serve.mv_current_prices`
- Service layer: `PricelistService`, `InventorySelectionService`, `StockService`, `SupplierProductService`
- API routes: `/api/spp/upload`, `/api/spp/validate`, `/api/spp/merge`, `/api/core/selections/*`, `/api/core/suppliers/products/*`
- Frontend: NXT-SPP page with `PortfolioDashboard`, `EnhancedPricelistUpload`, `ISIWizard`, `ISSohReports`

**❌ Critical Gaps:**
1. **Missing `merge_pricelist` stored procedure** - merge logic is in TypeScript service, not DB
2. **Missing `serve.v_nxt_soh` view** - the authoritative NXT SOH view required by the plan
3. **Missing `/api/spp/dashboard/metrics` endpoint** - frontend calls it but doesn't exist
4. **No database roles enforcement** - `role_etl`, `role_app`, `role_admin` not implemented
5. **No single-active-selection enforcement** - multiple selections can be active simultaneously
6. **No materialized view refresh mechanism** - `serve.mv_current_prices` never refreshed
7. **Downstream modules not audited** - unclear if inventory/orders/purchasing read from selected views
8. **No feature flags** - no mechanism for dark launches or gradual rollouts
9. **No automated tests** for the upload→merge→select→activate→NXT SOH flow


### Approach

## Implementation Strategy

This is a **refactor-first, gap-fill** project following the charter's "audit first, code later" mandate:

### Phase 0: Discovery & Documentation (Week 1)
Conduct comprehensive audit of existing implementation, document data flows, create gap register, and obtain sign-offs on alignment decisions.

### Phase 1: Database Realignment (Week 2)
Create missing stored procedures, views, and roles; implement single-active-selection constraint; add materialized view refresh triggers.

### Phase 2: API Layer Completion (Week 2-3)
Fill missing API endpoints, refactor existing endpoints to enforce selection-only reads, add guards for business rules.

### Phase 3: Frontend Alignment (Week 3)
Ensure all UI components read from correct views/endpoints, add feature flag support, implement cache invalidation on selection activation.

### Phase 4: Downstream Module Audit & Refactor (Week 4)
Audit inventory, orders, purchasing, reporting modules; refactor to read from `serve.v_selected_catalog` and `serve.v_nxt_soh`; add feature flags.

### Phase 5: Testing & Deployment (Week 5)
Implement automated tests, create migration playbooks, deploy with feature flags, monitor metrics, remove flags after stability window.


### Reasoning

I explored the MantisNXT codebase systematically:

1. **Listed root directory** to understand project structure (Next.js 15, TypeScript, PostgreSQL)
2. **Read database migrations** in `database/migrations/neon/` - discovered three-schema architecture already exists with most required tables and views
3. **Examined package.json and README** to understand tech stack and available scripts
4. **Explored frontend structure** - found `src/app/nxt-spp/page.tsx` with complete UI workflow
5. **Located service layer** in `src/lib/services/` - found `PricelistService`, `InventorySelectionService`, `StockService` with business logic
6. **Searched for API routes** - discovered Next.js App Router API structure in `src/app/api/`
7. **Read service implementations** - confirmed merge logic exists in TypeScript but not as stored procedure
8. **Checked for stored procedures** - found `bulk_upload_procedures.sql` but no `merge_pricelist`
9. **Searched for missing views** - confirmed `serve.v_nxt_soh` doesn't exist
10. **Verified API endpoints** - found most exist but `/api/spp/dashboard/metrics` is missing

The codebase has strong foundations but needs targeted gap-filling and enforcement of the charter's strict rules (single active selection, NXT SOH = selected only, role-based access).


## Mermaid Diagram

sequenceDiagram
    participant User
    participant Frontend
    participant API
    participant Service
    participant DB
    participant StoredProc

    Note over User,StoredProc: Phase 1: Upload & Merge
    User->>Frontend: Upload Pricelist
    Frontend->>API: POST /api/spp/upload
    API->>Service: PricelistService.createUpload()
    Service->>DB: INSERT spp.pricelist_upload
    Service->>DB: INSERT spp.pricelist_row (batch)
    DB-->>Service: upload_id
    Service-->>API: Upload created
    API-->>Frontend: upload_id
    
    Frontend->>API: POST /api/spp/validate
    API->>Service: PricelistService.validateUpload()
    Service->>DB: Query spp.pricelist_row
    Service->>DB: UPDATE status='validated'
    Service-->>API: Validation result
    API-->>Frontend: Valid/Invalid
    
    Frontend->>API: POST /api/spp/merge
    API->>Service: PricelistService.mergePricelist()
    Service->>StoredProc: CALL spp.merge_pricelist(upload_id)
    StoredProc->>DB: UPSERT core.supplier_product
    StoredProc->>DB: UPDATE core.price_history (close old)
    StoredProc->>DB: INSERT core.price_history (new)
    StoredProc->>DB: REFRESH serve.mv_current_prices
    StoredProc-->>Service: Merge result
    Service-->>API: products_created, prices_updated
    API-->>Frontend: Merge complete
    
    Note over User,StoredProc: Phase 2: Selection & Activation
    User->>Frontend: Create Selection
    Frontend->>API: POST /api/core/selections
    API->>Service: InventorySelectionService.createSelection()
    Service->>DB: INSERT core.inventory_selection
    DB-->>Service: selection_id
    Service-->>Frontend: Selection created
    
    User->>Frontend: Select Products
    Frontend->>API: POST /api/core/selections/workflow
    API->>Service: executeWorkflow(action='select')
    Service->>DB: INSERT core.inventory_selected_item
    Service-->>Frontend: items_affected
    
    User->>Frontend: Activate Selection
    Frontend->>API: POST /api/core/selections/{id}/activate
    API->>Service: activateSelection(id)
    Service->>DB: CHECK single-active constraint
    Service->>DB: UPDATE status='archived' (old)
    Service->>DB: UPDATE status='active' (new)
    Service-->>API: Selection activated
    API-->>Frontend: Cache invalidation trigger
    Frontend->>Frontend: Invalidate React Query caches
    
    Note over User,StoredProc: Phase 3: NXT SOH Consumption
    User->>Frontend: View Stock Reports
    Frontend->>API: GET /api/serve/nxt-soh
    API->>Service: StockService.getNxtSoh()
    Service->>DB: SELECT FROM serve.v_nxt_soh
    Note over DB: View filters by active selection
    DB-->>Service: Selected items with stock
    Service-->>API: NXT SOH data
    API-->>Frontend: Display report
    
    Note over User,StoredProc: Phase 4: Downstream Module
    User->>Frontend: Create Purchase Order
    Frontend->>API: GET /api/serve/nxt-soh (product lookup)
    API->>DB: SELECT FROM serve.v_nxt_soh
    DB-->>Frontend: Only selected items available
    Frontend->>API: POST /api/purchase-orders
    API->>Service: Validate items in selection
    Service->>DB: CHECK item in serve.v_nxt_soh
    DB-->>Service: Valid/Invalid
    Service-->>API: PO created or error

## Proposed File Changes

### PHASE_0_AUDIT_REGISTER.md(NEW)

Create a comprehensive audit register documenting:

1. **Current vs Target Architecture Mapping**
   - Map each existing table/view/endpoint to target architecture component
   - Document which components are complete, which need refactoring, which are missing
   - Create visual diagram showing data flow: Upload → SPP → Core → Serve → Downstream

2. **Gap Register**
   - Gap #1: Missing `spp.merge_pricelist(upload_id)` stored procedure
   - Gap #2: Missing `serve.v_nxt_soh` authoritative view
   - Gap #3: Missing `/api/spp/dashboard/metrics` endpoint
   - Gap #4: No database role enforcement (role_etl, role_app, role_admin)
   - Gap #5: No single-active-selection constraint
   - Gap #6: No materialized view refresh mechanism
   - Gap #7: Downstream modules not audited for selected-only reads
   - Gap #8: No feature flag framework
   - Gap #9: No automated E2E tests for full workflow
   - Gap #10: No migration playbooks or rollback procedures

3. **Data Lineage Documentation**
   - Trace supplier file → `spp.pricelist_upload` → `spp.pricelist_row` → `core.supplier_product` → `core.price_history` → `serve.mv_current_prices` → frontend
   - Document selection flow: `core.inventory_selection` → `core.inventory_selected_item` → `serve.v_selected_catalog` → downstream modules
   - Map stock flow: `core.stock_on_hand` → `serve.v_soh_by_supplier` → `serve.v_nxt_soh` (to be created) → reports

4. **Keep/Refactor/Replace Decisions**
   - **KEEP**: All three schemas, core tables, existing service layer, frontend components
   - **REFACTOR**: `PricelistService.mergePricelist()` to call stored procedure instead of inline SQL; selection activation to enforce single-active rule; downstream module queries
   - **REPLACE**: None - no rebuilds required
   - **ADD**: Missing stored procedure, view, endpoints, roles, constraints, tests

5. **Downstream Module Inventory**
   - List all modules that read inventory/product data: `src/app/inventory/`, `src/app/purchase-orders/`, `src/app/invoices/`, reporting components
   - Document current data sources for each module
   - Flag modules that bypass `serve.v_selected_catalog` or `serve.v_nxt_soh`

Include owner assignments, priority levels (P0-P2), and estimated effort for each gap.

### database\migrations\neon\004_add_missing_components.sql(NEW)

References: 

- database\migrations\neon\002_create_core_schema.sql
- database\migrations\neon\003_create_serve_schema.sql
- src\lib\services\PricelistService.ts(MODIFY)

Create migration to add missing database components required by the charter:

1. **Create Database Roles**
   - Create `role_etl` with permissions: INSERT/UPDATE on `spp.*`, EXECUTE on merge procedures, INSERT/UPDATE on `core.supplier_product` and `core.price_history`
   - Create `role_app` with permissions: SELECT on `serve.*`, SELECT on `core.*` (read-only), INSERT/UPDATE on `core.inventory_selection` and `core.inventory_selected_item`
   - Create `role_admin` with full DDL permissions
   - Revoke direct write access to `spp` and `serve` schemas from application users

2. **Create `serve.v_nxt_soh` View**
   - Define as authoritative NXT SOH view that returns ONLY items in active selections
   - Join `serve.v_soh_by_supplier` with active selection filter
   - Include columns: supplier_id, supplier_name, supplier_product_id, supplier_sku, product_name, location_id, location_name, qty_on_hand, unit_cost, total_value, currency, as_of_ts, selection_id, selection_name
   - Add WHERE clause: `EXISTS (SELECT 1 FROM core.inventory_selected_item isi JOIN core.inventory_selection sel ON sel.selection_id = isi.selection_id WHERE isi.supplier_product_id = sp.supplier_product_id AND sel.status = 'active' AND isi.status = 'selected')`
   - Add comment: 'NXT SOH - Authoritative stock on hand for SELECTED items only. All downstream modules must read from this view.'

3. **Create `spp.merge_pricelist` Stored Procedure**
   - Accept parameter: `p_upload_id UUID`
   - Return type: JSON with structure `{"success": boolean, "products_created": integer, "products_updated": integer, "prices_updated": integer, "errors": text[]}`
   - Implement logic currently in `PricelistService.mergePricelist()` method from `src/lib/services/PricelistService.ts`
   - Step 1: Validate upload status is 'validated'
   - Step 2: Upsert `core.supplier_product` (INSERT ... ON CONFLICT DO UPDATE)
   - Step 3: Close current price history records where price changed (UPDATE `core.price_history` SET `valid_to` = upload.valid_from, `is_current` = false)
   - Step 4: Insert new price history records (INSERT INTO `core.price_history`)
   - Step 5: Update upload status to 'merged'
   - Step 6: Call `serve.refresh_materialized_views()` to update `serve.mv_current_prices`
   - Wrap in transaction with error handling
   - Add constraint: Ensure no overlapping price periods per supplier_product_id

4. **Add Single-Active-Selection Constraint**
   - Create unique partial index: `CREATE UNIQUE INDEX idx_single_active_selection ON core.inventory_selection(supplier_id) WHERE status = 'active'` (if selections are per-supplier)
   - OR add trigger: `trg_enforce_single_active_selection` that fires BEFORE UPDATE/INSERT on `core.inventory_selection` and raises exception if attempting to activate when another selection is already active
   - Document decision: Confirm with stakeholders whether single-active is global or per-supplier

5. **Add Materialized View Refresh Trigger**
   - Create trigger function: `refresh_current_prices_on_merge()` that calls `REFRESH MATERIALIZED VIEW CONCURRENTLY serve.mv_current_prices`
   - Attach trigger to `core.price_history` table: AFTER INSERT OR UPDATE
   - Add debouncing logic to avoid excessive refreshes (e.g., only refresh if last refresh was >5 minutes ago)

6. **Add Indexes for Performance**
   - `CREATE INDEX idx_stock_on_hand_selected ON core.stock_on_hand(supplier_product_id) WHERE EXISTS (SELECT 1 FROM core.inventory_selected_item isi JOIN core.inventory_selection sel ON sel.selection_id = isi.selection_id WHERE isi.supplier_product_id = core.stock_on_hand.supplier_product_id AND sel.status = 'active')`
   - `CREATE INDEX idx_inventory_selected_item_active ON core.inventory_selected_item(supplier_product_id, status) WHERE status = 'selected'`

Include rollback script at bottom of migration file.

### src\lib\services\PricelistService.ts(MODIFY)

References: 

- database\migrations\neon\004_add_missing_components.sql(NEW)
- src\types\nxt-spp.ts(MODIFY)

Refactor the `mergePricelist` method to call the new `spp.merge_pricelist` stored procedure instead of executing inline SQL:

1. **Update `mergePricelist` Method**
   - Replace the entire transaction block with a single stored procedure call: `SELECT * FROM spp.merge_pricelist($1)` passing `uploadId` as parameter
   - Parse the JSON result returned by the stored procedure
   - Map result fields to `MergeResult` type: `success`, `products_created`, `products_updated`, `prices_updated`, `errors`, `duration_ms`
   - Keep error handling wrapper to catch database exceptions
   - Remove direct SQL queries for upsert, price history updates, etc. (now handled by stored procedure)

2. **Add Validation**
   - Before calling stored procedure, verify upload exists and status is 'validated'
   - If validation fails, return error result without calling procedure

3. **Update Comments**
   - Add comment: 'Delegates to spp.merge_pricelist stored procedure for transactional merge'
   - Document that materialized view refresh is handled by database trigger

This change centralizes merge logic in the database layer per the charter's requirement, ensuring consistency and enabling direct SQL-based merges if needed.

### src\lib\services\InventorySelectionService.ts(MODIFY)

References: 

- database\migrations\neon\004_add_missing_components.sql(NEW)
- src\types\nxt-spp.ts(MODIFY)

Add enforcement of single-active-selection rule in the `executeWorkflow` method:

1. **Update `executeWorkflow` Method - Approve Action**
   - When `action === 'approve'`, before updating selection status to 'active', check if another selection is already active
   - Query: `SELECT selection_id FROM core.inventory_selection WHERE status = 'active' AND selection_id != $1`
   - If result found, throw error: 'Cannot activate selection: another selection is already active. Please archive the current active selection first.'
   - Only proceed with activation if no other active selection exists

2. **Add `activateSelection` Method**
   - Create new method: `async activateSelection(selectionId: string, deactivateOthers: boolean = false): Promise<InventorySelection>`
   - If `deactivateOthers` is true, update all other active selections to 'archived' status
   - Then activate the specified selection
   - Wrap in transaction to ensure atomicity
   - Return the activated selection

3. **Add `getActiveSelection` Method**
   - Create new method: `async getActiveSelection(): Promise<InventorySelection | null>`
   - Query: `SELECT * FROM core.inventory_selection WHERE status = 'active' LIMIT 1`
   - Return the active selection or null if none exists
   - This provides a single source of truth for the current active selection

4. **Update Comments**
   - Document the single-active-selection rule in class-level comments
   - Add JSDoc comments explaining the activation workflow

These changes enforce the charter's mandate that only one selection can be active at a time, ensuring NXT SOH always reflects a single, consistent catalog.

### src\lib\services\StockService.ts(MODIFY)

References: 

- database\migrations\neon\004_add_missing_components.sql(NEW)
- src\types\nxt-spp.ts(MODIFY)

Add new method to query the authoritative `serve.v_nxt_soh` view:

1. **Add `getNxtSoh` Method**
   - Create new method: `async getNxtSoh(filters?: { supplier_ids?: string[], location_ids?: string[], search?: string }): Promise<NxtSoh[]>`
   - Query the `serve.v_nxt_soh` view (to be created in migration 004)
   - Apply filters for supplier_ids, location_ids, and search term
   - Return array of NXT SOH records with columns: supplier_id, supplier_name, supplier_product_id, supplier_sku, product_name, location_id, location_name, qty_on_hand, unit_cost, total_value, currency, as_of_ts, selection_id, selection_name
   - Add comment: 'Returns ONLY items in the active selection. This is the authoritative NXT SOH view.'

2. **Update `getSohBySupplier` Method**
   - Add parameter: `selected_only: boolean = false`
   - When `selected_only` is true, add WHERE clause to filter by active selection
   - Add comment explaining that `getNxtSoh()` should be preferred for downstream modules

3. **Deprecate Direct Stock Queries**
   - Add deprecation notice to `getLatestStock` and `getStockHistory` methods
   - Recommend using `getNxtSoh()` for operational queries
   - Keep methods for administrative/reporting purposes

4. **Add Type Definition**
   - Define `NxtSoh` type in `src/types/nxt-spp.ts` matching the view schema

This ensures all downstream modules have a clear, type-safe way to access the authoritative NXT SOH data.

### src\types\nxt-spp.ts(MODIFY)

References: 

- database\migrations\neon\004_add_missing_components.sql(NEW)

Add new type definitions for NXT SOH and update existing types:

1. **Add `NxtSoh` Type**
   - Define interface matching `serve.v_nxt_soh` view schema:
     - supplier_id: string
     - supplier_name: string
     - supplier_product_id: string
     - supplier_sku: string
     - product_name: string
     - location_id: string
     - location_name: string
     - qty_on_hand: number
     - unit_cost: number
     - total_value: number
     - currency: string
     - as_of_ts: Date
     - selection_id: string
     - selection_name: string
   - Add Zod schema: `NxtSohSchema`

2. **Add `MergeProcedureResult` Type**
   - Define interface for stored procedure return value:
     - success: boolean
     - products_created: number
     - products_updated: number
     - prices_updated: number
     - errors: string[]
   - Add Zod schema: `MergeProcedureResultSchema`

3. **Update `InventorySelection` Type**
   - Add JSDoc comment documenting single-active-selection rule
   - Add note that only one selection can have status='active' at a time

4. **Export New Types**
   - Export `NxtSoh`, `NxtSohSchema`, `MergeProcedureResult`, `MergeProcedureResultSchema`

These types provide compile-time safety for the new database components.

### src\app\api\spp\dashboard\metrics\route.ts(NEW)

References: 

- src\components\supplier-portfolio\PortfolioDashboard.tsx
- database\migrations\neon\004_add_missing_components.sql(NEW)

Create the missing dashboard metrics endpoint that the frontend is calling:

1. **Implement GET Handler**
   - Export `async function GET(request: NextRequest)`
   - Query database for dashboard metrics:
     - `total_suppliers`: Count distinct suppliers with uploads: `SELECT COUNT(DISTINCT supplier_id) FROM spp.pricelist_upload`
     - `total_products`: Count active supplier products: `SELECT COUNT(*) FROM core.supplier_product WHERE is_active = true`
     - `selected_products`: Count products in active selection: `SELECT COUNT(DISTINCT isi.supplier_product_id) FROM core.inventory_selected_item isi JOIN core.inventory_selection sel ON sel.selection_id = isi.selection_id WHERE sel.status = 'active' AND isi.status = 'selected'`
     - `selected_inventory_value`: Sum stock value for selected items: `SELECT COALESCE(SUM(total_value), 0) FROM serve.v_nxt_soh`
     - `new_products_count`: Count products flagged as new: `SELECT COUNT(*) FROM core.supplier_product WHERE is_new = true`
     - `recent_price_changes_count`: Count price changes in last 30 days: `SELECT COUNT(*) FROM core.price_history WHERE created_at > NOW() - INTERVAL '30 days'`

2. **Return Response**
   - Return JSON: `{ success: true, data: { total_suppliers, total_products, selected_products, selected_inventory_value, new_products_count, recent_price_changes_count } }`
   - Add error handling with try-catch
   - Return 500 status on error with error message

3. **Add Caching**
   - Add response header: `Cache-Control: public, max-age=60` (cache for 1 minute)
   - Consider using Next.js `unstable_cache` for server-side caching

4. **Add Type Safety**
   - Define `DashboardMetrics` type matching the response structure
   - Use Zod schema for validation if needed

This endpoint provides the metrics displayed on the `PortfolioDashboard` component.

### src\app\api\serve\nxt-soh\route.ts(NEW)

References: 

- src\lib\services\StockService.ts(MODIFY)
- database\migrations\neon\004_add_missing_components.sql(NEW)

Create new API endpoint to expose the authoritative NXT SOH view:

1. **Implement GET Handler**
   - Export `async function GET(request: NextRequest)`
   - Parse query parameters: `supplier_ids`, `location_ids`, `search`
   - Call `stockService.getNxtSoh(filters)` with parsed filters
   - Return JSON: `{ success: true, data: nxtSohRecords, count: nxtSohRecords.length }`

2. **Add Pagination**
   - Parse `limit` and `offset` query parameters
   - Apply pagination to query results
   - Return pagination metadata: `{ total, limit, offset, hasMore }`

3. **Add Sorting**
   - Parse `sort_by` and `sort_order` query parameters
   - Support sorting by: supplier_name, product_name, qty_on_hand, total_value, as_of_ts
   - Apply sorting in SQL query

4. **Add Documentation**
   - Add JSDoc comment: 'GET /api/serve/nxt-soh - Returns authoritative NXT SOH (selected items only)'
   - Document query parameters and response structure
   - Add example usage in comment

5. **Add Guards**
   - Verify that an active selection exists before returning data
   - If no active selection, return empty array with warning message
   - Add rate limiting if needed

This endpoint becomes the single source of truth for all downstream modules needing stock data.

### src\app\api\core\selections\active\route.ts(NEW)

References: 

- src\lib\services\InventorySelectionService.ts(MODIFY)

Create endpoint to retrieve the current active selection:

1. **Implement GET Handler**
   - Export `async function GET(request: NextRequest)`
   - Call `inventorySelectionService.getActiveSelection()`
   - Return JSON: `{ success: true, data: activeSelection }` or `{ success: true, data: null }` if no active selection

2. **Add Selection Details**
   - Include count of selected items: `SELECT COUNT(*) FROM core.inventory_selected_item WHERE selection_id = $1 AND status = 'selected'`
   - Include total inventory value: `SELECT SUM(total_value) FROM serve.v_nxt_soh WHERE selection_id = $1`
   - Return enriched selection object with these metrics

3. **Add Caching**
   - Cache response for 30 seconds (active selection changes infrequently)
   - Invalidate cache when selection is activated/deactivated

4. **Add Documentation**
   - Add JSDoc comment: 'GET /api/core/selections/active - Returns the current active inventory selection'
   - Document response structure

This endpoint provides a single source of truth for the active selection ID used throughout the application.

### src\app\api\core\selections\[id]\activate\route.ts(NEW)

References: 

- src\lib\services\InventorySelectionService.ts(MODIFY)

Create endpoint to activate a selection with proper guards:

1. **Implement POST Handler**
   - Export `async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> })`
   - Parse `id` from params (selection_id)
   - Parse request body for optional `deactivate_others` flag
   - Call `inventorySelectionService.activateSelection(id, deactivate_others)`
   - Return JSON: `{ success: true, data: activatedSelection }`

2. **Add Validation**
   - Verify selection exists and is in 'draft' status
   - Verify selection has at least one selected item
   - If `deactivate_others` is false and another selection is active, return error

3. **Add Cache Invalidation**
   - After successful activation, invalidate caches for:
     - `/api/core/selections/active`
     - `/api/serve/nxt-soh`
     - `/api/spp/dashboard/metrics`
   - Trigger frontend cache invalidation via response header or webhook

4. **Add Audit Logging**
   - Log activation event with user ID, timestamp, selection ID
   - Store in audit table or log file

5. **Add Documentation**
   - Add JSDoc comment: 'POST /api/core/selections/[id]/activate - Activate an inventory selection'
   - Document request body and response structure
   - Document side effects (cache invalidation, other selections deactivated)

This endpoint enforces the single-active-selection rule and triggers necessary cache updates.

### src\components\supplier-portfolio\ISSohReports.tsx(MODIFY)

References: 

- src\app\api\serve\nxt-soh\route.ts(NEW)
- src\types\nxt-spp.ts(MODIFY)

Update the SOH reports component to use the new NXT SOH endpoint:

1. **Update Data Fetching**
   - Replace any calls to `/api/serve/soh` or direct stock queries with `/api/serve/nxt-soh`
   - Update state types to match `NxtSoh` interface
   - Add loading state and error handling

2. **Add Active Selection Display**
   - Fetch active selection from `/api/core/selections/active`
   - Display selection name and item count at top of report
   - Show warning if no active selection exists

3. **Add Filters**
   - Add supplier filter dropdown
   - Add location filter dropdown
   - Add search input for product name/SKU
   - Pass filters to `/api/serve/nxt-soh` endpoint

4. **Add Refresh Button**
   - Add button to manually refresh data
   - Show last updated timestamp
   - Auto-refresh every 5 minutes

5. **Add Export Functionality**
   - Add button to export NXT SOH data to CSV/Excel
   - Include all columns from the view

This ensures the SOH reports always show selected items only, per the charter's mandate.

### src\components\supplier-portfolio\ISIWizard.tsx(MODIFY)

References: 

- src\app\api\core\selections\[id]\activate\route.ts(NEW)
- src\lib\services\InventorySelectionService.ts(MODIFY)

Update the selection wizard to enforce single-active-selection and trigger cache invalidation:

1. **Update Activation Flow**
   - When user clicks 'Activate Selection', call `/api/core/selections/[id]/activate` instead of directly updating status
   - Show confirmation dialog if another selection is active: 'Activating this selection will deactivate the current active selection. Continue?'
   - If user confirms, pass `deactivate_others: true` in request body

2. **Add Active Selection Indicator**
   - Fetch active selection from `/api/core/selections/active`
   - Display badge showing which selection is currently active
   - Disable activation button if current selection is already active

3. **Add Cache Invalidation Trigger**
   - After successful activation, invalidate React Query caches for:
     - Dashboard metrics
     - NXT SOH data
     - Active selection
   - Show success toast: 'Selection activated. All reports now reflect the new catalog.'

4. **Add Validation**
   - Before allowing activation, verify selection has at least one selected item
   - Show error if trying to activate empty selection

5. **Update UI Feedback**
   - Show loading spinner during activation
   - Show error message if activation fails
   - Auto-navigate to Stock Reports tab after successful activation

This ensures the selection workflow properly enforces business rules and updates the system state.

### DOWNSTREAM_MODULE_AUDIT.md(NEW)

References: 

- src\app\inventory\page.tsx

Create comprehensive audit document for downstream modules:

1. **Inventory Module Audit** (`src/app/inventory/`)
   - List all components: `EnhancedInventoryDashboard`, `InventoryManagement`, `SupplierInventoryView`, `ProductStockManagement`, `SupplierProductWorkflow`, `InventoryDetailView`
   - Document current data sources for each component
   - Identify components that query `core.stock_on_hand` directly instead of `serve.v_nxt_soh`
   - Flag components that show non-selected items
   - Recommend refactoring: Replace direct queries with calls to `/api/serve/nxt-soh`

2. **Purchase Orders Module Audit** (`src/app/purchase-orders/`)
   - List all components and their data sources
   - Verify that PO creation only allows ordering selected items
   - Check if PO line items validate against active selection
   - Recommend: Add guard to prevent ordering non-selected items

3. **Invoices Module Audit** (`src/app/invoices/`)
   - List all components and their data sources
   - Verify that invoice line items reference selected catalog
   - Check if invoice validation enforces selected-only items

4. **Reporting Module Audit**
   - List all report types and their data sources
   - Identify reports that aggregate stock data
   - Verify reports use `serve.v_nxt_soh` or equivalent
   - Flag reports that bypass selection filter

5. **Refactoring Recommendations**
   - For each flagged component, provide specific refactoring instructions
   - Prioritize changes: P0 (blocks transactions), P1 (data integrity), P2 (reporting accuracy)
   - Estimate effort for each change

6. **Feature Flag Strategy**
   - Recommend feature flags for each module: `USE_SELECTED_CATALOG_INVENTORY`, `USE_SELECTED_CATALOG_ORDERS`, `USE_SELECTED_CATALOG_INVOICES`, `USE_SELECTED_CATALOG_REPORTS`
   - Document rollout plan: Enable per module, monitor metrics, rollback if issues

This audit provides the roadmap for Phase 4 downstream module realignment.

### src\lib\feature-flags.ts(NEW)

Create simple feature flag system for gradual rollout:

1. **Define Feature Flags**
   - Create enum or const object with flag names:
     - `USE_MERGE_STORED_PROCEDURE`: Enable/disable stored procedure for merge
     - `USE_NXT_SOH_VIEW`: Enable/disable new NXT SOH view
     - `ENFORCE_SINGLE_ACTIVE_SELECTION`: Enable/disable single-active-selection rule
     - `USE_SELECTED_CATALOG_INVENTORY`: Enable/disable selected-only filter in inventory module
     - `USE_SELECTED_CATALOG_ORDERS`: Enable/disable selected-only filter in orders module
     - `USE_SELECTED_CATALOG_INVOICES`: Enable/disable selected-only filter in invoices module
     - `USE_SELECTED_CATALOG_REPORTS`: Enable/disable selected-only filter in reports

2. **Implement Flag Checker**
   - Create function: `isFeatureEnabled(flagName: string): boolean`
   - Read flag values from environment variables (e.g., `FEATURE_FLAG_USE_NXT_SOH_VIEW=true`)
   - Support per-user or per-organization flags if needed (read from database)
   - Default to `false` for safety (opt-in)

3. **Add Flag Management**
   - Create function: `setFeatureFlag(flagName: string, enabled: boolean): Promise<void>`
   - Store flag state in database table: `feature_flags(flag_name, enabled, updated_at, updated_by)`
   - Add API endpoint: `/api/admin/feature-flags` for runtime flag management

4. **Add Logging**
   - Log flag checks for monitoring: `console.log('Feature flag checked:', flagName, enabled)`
   - Track flag usage metrics for rollout decisions

5. **Add Documentation**
   - Document each flag's purpose and rollout plan
   - Document rollback procedure if flag causes issues

This provides the infrastructure for safe, gradual rollout of changes per the charter's requirement.

### tests\e2e\nxt-spp-workflow.spec.ts(NEW)

References: 

- src\app\nxt-spp\page.tsx
- src\components\supplier-portfolio\PortfolioDashboard.tsx
- src\components\supplier-portfolio\ISIWizard.tsx(MODIFY)
- src\components\supplier-portfolio\ISSohReports.tsx(MODIFY)

Create end-to-end test for the complete SPP → Review → Selection → NXT SOH workflow:

1. **Test Setup**
   - Use Playwright for browser automation
   - Create test supplier and sample pricelist file (Excel with 100 rows)
   - Set up test database with clean state

2. **Test: Upload → Merge → Review → Select → Activate → NXT SOH**
   - Step 1: Navigate to `/nxt-spp?tab=upload`
   - Step 2: Upload pricelist file via `EnhancedPricelistUpload` component
   - Step 3: Verify upload status changes to 'validated'
   - Step 4: Click 'Merge' button and verify status changes to 'merged'
   - Step 5: Navigate to `/nxt-spp?tab=dashboard` and verify metrics updated (total_products increased)
   - Step 6: Navigate to `/nxt-spp?tab=selections`
   - Step 7: Create new selection and select 50 products
   - Step 8: Activate selection and verify confirmation dialog
   - Step 9: Navigate to `/nxt-spp?tab=stock-reports`
   - Step 10: Verify NXT SOH report shows only selected 50 products
   - Step 11: Query `/api/serve/nxt-soh` directly and verify count matches UI

3. **Test: Single-Active-Selection Enforcement**
   - Create and activate first selection
   - Attempt to activate second selection without deactivating first
   - Verify error message displayed
   - Activate second selection with 'deactivate others' flag
   - Verify first selection status changed to 'archived'
   - Verify NXT SOH now shows items from second selection only

4. **Test: Price History Tracking**
   - Upload pricelist with initial prices
   - Merge and verify prices in database
   - Upload same pricelist with updated prices
   - Merge and verify price history records created
   - Verify old prices have `valid_to` date set
   - Verify new prices have `is_current = true`

5. **Test: Non-Selected Items Cannot Be Transacted**
   - Create selection with 10 items
   - Activate selection
   - Attempt to create purchase order for non-selected item (if PO module exists)
   - Verify error or item not available in dropdown

6. **Assertions**
   - Assert upload row count matches file
   - Assert merge creates correct number of products
   - Assert selection activation updates active selection endpoint
   - Assert NXT SOH count equals selected item count
   - Assert price history records have no overlapping periods

This test validates the entire workflow per the charter's acceptance criteria.

### tests\integration\pricelist-merge.test.ts(NEW)

References: 

- database\migrations\neon\004_add_missing_components.sql(NEW)
- src\lib\services\PricelistService.ts(MODIFY)

Create integration test for pricelist merge stored procedure:

1. **Test Setup**
   - Use Jest for test framework
   - Connect to test database
   - Create test supplier and upload record
   - Insert sample pricelist rows (100 rows with known SKUs and prices)

2. **Test: Merge Creates New Products**
   - Call `spp.merge_pricelist(upload_id)`
   - Verify result: `products_created = 100`, `products_updated = 0`, `prices_updated = 100`
   - Query `core.supplier_product` and verify 100 new records
   - Query `core.price_history` and verify 100 new price records with `is_current = true`

3. **Test: Merge Updates Existing Products**
   - Create 50 existing products in `core.supplier_product`
   - Upload pricelist with same 50 SKUs plus 50 new SKUs
   - Call `spp.merge_pricelist(upload_id)`
   - Verify result: `products_created = 50`, `products_updated = 50`, `prices_updated = 100`
   - Verify existing products have `last_seen_at` updated

4. **Test: Merge Handles Price Changes**
   - Create product with initial price $100
   - Upload pricelist with same SKU but price $120
   - Call `spp.merge_pricelist(upload_id)`
   - Query `core.price_history` and verify:
     - Old price record has `valid_to` set to upload.valid_from
     - Old price record has `is_current = false`
     - New price record has `is_current = true`
     - No overlapping date ranges

5. **Test: Merge Validates Upload Status**
   - Create upload with status 'received' (not validated)
   - Call `spp.merge_pricelist(upload_id)`
   - Verify error returned: 'Upload must be validated before merging'

6. **Test: Merge Refreshes Materialized View**
   - Call `spp.merge_pricelist(upload_id)`
   - Query `serve.mv_current_prices` and verify it contains new prices
   - Verify materialized view timestamp updated

7. **Test: Merge Handles Duplicates**
   - Upload pricelist with duplicate SKUs
   - Call `spp.merge_pricelist(upload_id)`
   - Verify only one record per SKU in `core.supplier_product`
   - Verify error or warning in result

These tests validate the core merge logic per the charter's requirements.

### tests\integration\selection-workflow.test.ts(NEW)

References: 

- src\lib\services\InventorySelectionService.ts(MODIFY)
- database\migrations\neon\004_add_missing_components.sql(NEW)

Create integration test for inventory selection workflow:

1. **Test Setup**
   - Create test supplier and 100 products
   - Create test user for selection operations

2. **Test: Create Selection**
   - Call `inventorySelectionService.createSelection()`
   - Verify selection created with status 'draft'
   - Verify selection_id returned

3. **Test: Select Products**
   - Call `inventorySelectionService.executeWorkflow()` with action 'select' and 50 product IDs
   - Verify 50 records created in `core.inventory_selected_item` with status 'selected'
   - Verify `items_affected = 50` in result

4. **Test: Deselect Products**
   - Select 50 products
   - Call `executeWorkflow()` with action 'deselect' and 10 product IDs
   - Verify 10 records updated to status 'deselected'
   - Query `getSelectionItems()` with filter `status = 'selected'` and verify count = 40

5. **Test: Activate Selection**
   - Create selection with 50 selected items
   - Call `activateSelection(selection_id)`
   - Verify selection status changed to 'active'
   - Query `/api/core/selections/active` and verify returns this selection

6. **Test: Single-Active-Selection Enforcement**
   - Activate first selection
   - Create second selection
   - Attempt to activate second selection without `deactivate_others` flag
   - Verify error thrown: 'Cannot activate selection: another selection is already active'
   - Call `activateSelection(selection_id, deactivate_others: true)`
   - Verify first selection status changed to 'archived'
   - Verify second selection status changed to 'active'

7. **Test: Get Selected Catalog**
   - Activate selection with 50 items
   - Call `inventorySelectionService.getSelectedCatalog()`
   - Verify returns 50 records
   - Verify all records have `is_selected = true`
   - Deactivate selection
   - Call `getSelectedCatalog()` again
   - Verify returns 0 records

8. **Test: Selection with Stock Data**
   - Create selection and activate
   - Add stock records for 30 of the 50 selected items
   - Query `serve.v_nxt_soh`
   - Verify returns 30 records (only selected items with stock)
   - Verify non-selected items with stock are excluded

These tests validate the selection workflow and single-active-selection rule.

### docs\NXT-SOH-DATA-CONTRACT.md(NEW)

References: 

- database\migrations\neon\004_add_missing_components.sql(NEW)
- src\lib\services\StockService.ts(MODIFY)

Create comprehensive documentation for the NXT SOH data contract:

1. **Overview**
   - Define NXT SOH as the authoritative stock on hand view for selected items only
   - Explain that all downstream modules MUST read from this view
   - Document the single source of truth principle

2. **Data Source**
   - View name: `serve.v_nxt_soh`
   - API endpoint: `GET /api/serve/nxt-soh`
   - Service method: `stockService.getNxtSoh()`

3. **Schema Definition**
   - List all columns with types and descriptions:
     - `supplier_id` (UUID): Supplier identifier
     - `supplier_name` (VARCHAR): Supplier display name
     - `supplier_product_id` (UUID): Product identifier
     - `supplier_sku` (VARCHAR): Supplier's SKU
     - `product_name` (VARCHAR): Product display name
     - `location_id` (UUID): Stock location identifier
     - `location_name` (VARCHAR): Location display name
     - `qty_on_hand` (NUMERIC): Current quantity in stock
     - `unit_cost` (NUMERIC): Cost per unit
     - `total_value` (NUMERIC): qty_on_hand * unit_cost
     - `currency` (CHAR(3)): Currency code (e.g., 'ZAR')
     - `as_of_ts` (TIMESTAMPTZ): Timestamp of stock snapshot
     - `selection_id` (UUID): Active selection identifier
     - `selection_name` (VARCHAR): Active selection display name

4. **Business Rules**
   - Only items in the active selection are included
   - If no active selection exists, view returns empty result set
   - Stock values are calculated from latest snapshot per location
   - Prices are sourced from `serve.mv_current_prices` (current prices only)

5. **SLAs**
   - Data freshness: Stock snapshots updated every 15 minutes (or as configured)
   - Query performance: <200ms for 5000 items
   - Availability: 99.9% uptime

6. **Usage Examples**
   - API call: `GET /api/serve/nxt-soh?supplier_ids=uuid1,uuid2&location_ids=uuid3`
   - Service call: `const soh = await stockService.getNxtSoh({ supplier_ids: ['uuid1'] })`
   - SQL query: `SELECT * FROM serve.v_nxt_soh WHERE supplier_id = 'uuid1'`

7. **Migration Guide**
   - For modules currently reading from `core.stock_on_hand` directly:
     - Replace query with call to `serve.v_nxt_soh`
     - Remove manual selection filtering logic
     - Update types to match NXT SOH schema
   - For modules using `serve.v_soh_by_supplier`:
     - Replace with `serve.v_nxt_soh` (includes selection filter)
     - Update column names if needed

8. **Troubleshooting**
   - If NXT SOH returns empty: Check if active selection exists via `/api/core/selections/active`
   - If counts don't match: Verify selection has items with status='selected'
   - If values are incorrect: Check `serve.mv_current_prices` refresh status

This document serves as the definitive reference for all developers working with stock data.

### docs\MIGRATION-PLAYBOOK.md(NEW)

References: 

- database\migrations\neon\004_add_missing_components.sql(NEW)

Create step-by-step migration playbook for production deployment:

1. **Pre-Migration Checklist**
   - [ ] All tests passing (unit, integration, E2E)
   - [ ] Database backup completed and verified
   - [ ] Rollback plan documented and tested
   - [ ] Feature flags configured (all disabled initially)
   - [ ] Monitoring dashboards set up
   - [ ] Stakeholder sign-off obtained
   - [ ] Maintenance window scheduled

2. **Phase 1: Database Migration (30 minutes)**
   - Step 1: Connect to production database
   - Step 2: Run migration 004: `psql $DATABASE_URL -f database/migrations/neon/004_add_missing_components.sql`
   - Step 3: Verify migration success: Check that `serve.v_nxt_soh` view exists
   - Step 4: Verify stored procedure: `SELECT spp.merge_pricelist('test-uuid')` (should fail gracefully)
   - Step 5: Verify roles created: `SELECT rolname FROM pg_roles WHERE rolname IN ('role_etl', 'role_app', 'role_admin')`
   - Step 6: Test rollback script (on staging first)

3. **Phase 2: Deploy Application Code (15 minutes)**
   - Step 1: Deploy updated services and API routes
   - Step 2: Verify deployment health: `curl https://app.example.com/api/health`
   - Step 3: Verify new endpoints: `curl https://app.example.com/api/serve/nxt-soh` (should return empty or data)
   - Step 4: Monitor error logs for 5 minutes

4. **Phase 3: Enable Feature Flags (Gradual Rollout)**
   - **Week 1: Enable Stored Procedure**
     - Set `FEATURE_FLAG_USE_MERGE_STORED_PROCEDURE=true`
     - Monitor merge operations for 3 days
     - Verify merge performance and correctness
     - If issues: Disable flag and investigate
   - **Week 2: Enable NXT SOH View**
     - Set `FEATURE_FLAG_USE_NXT_SOH_VIEW=true`
     - Monitor SOH queries for 3 days
     - Verify query performance <200ms
     - If issues: Disable flag and investigate
   - **Week 3: Enable Single-Active-Selection**
     - Set `FEATURE_FLAG_ENFORCE_SINGLE_ACTIVE_SELECTION=true`
     - Monitor selection activations
     - Verify no duplicate active selections
   - **Week 4: Enable Downstream Modules**
     - Enable `USE_SELECTED_CATALOG_INVENTORY` for inventory module
     - Monitor for 2 days
     - Enable `USE_SELECTED_CATALOG_ORDERS` for orders module
     - Monitor for 2 days
     - Enable remaining flags one by one

5. **Phase 4: Validation & Monitoring (Ongoing)**
   - Monitor key metrics:
     - Upload success rate (target: >95%)
     - Merge duration (target: <10s for 1000 products)
     - Selection activation time (target: <2s)
     - NXT SOH query time (target: <200ms)
     - Error rate (target: <1%)
   - Run daily validation queries:
     - `SELECT COUNT(*) FROM core.inventory_selection WHERE status = 'active'` (should be 0 or 1)
     - `SELECT COUNT(*) FROM serve.v_nxt_soh` (should match selected item count)
     - `SELECT COUNT(*) FROM core.price_history WHERE is_current = true AND valid_to IS NOT NULL` (should be 0)
   - Review logs for errors or warnings

6. **Phase 5: Cleanup (After 30 Days Stability)**
   - Remove feature flags (hard-code enabled behavior)
   - Archive deprecated code paths
   - Update documentation
   - Conduct retrospective

7. **Rollback Procedures**
   - **If Database Migration Fails:**
     - Run rollback script: `psql $DATABASE_URL -f database/migrations/neon/004_rollback.sql`
     - Verify rollback: Check that new views/procedures removed
   - **If Application Deployment Fails:**
     - Revert to previous deployment
     - Disable all feature flags
   - **If Feature Flag Causes Issues:**
     - Disable specific flag immediately
     - Investigate root cause
     - Fix and re-enable after testing

8. **Emergency Contacts**
   - Database Admin: [contact info]
   - DevOps Lead: [contact info]
   - Product Owner: [contact info]

This playbook ensures safe, gradual rollout with clear rollback procedures.

### docs\DB-OBJECT-GLOSSARY.md(NEW)

References: 

- database\migrations\neon\001_create_spp_schema.sql
- database\migrations\neon\002_create_core_schema.sql
- database\migrations\neon\003_create_serve_schema.sql
- database\migrations\neon\004_add_missing_components.sql(NEW)

Create comprehensive glossary of all database objects with ownership and guarantees:

1. **SPP Schema (Staging/Isolation)**
   - **spp.pricelist_upload**
     - Owner: role_etl
     - Purpose: Metadata for uploaded pricelist files
     - Write Path: `/api/spp/upload` → `PricelistService.createUpload()`
     - Consumers: `/api/spp/validate`, `/api/spp/merge`, dashboard metrics
     - Guarantees: Unique upload_id; status transitions: received → validating → validated → merged
   - **spp.pricelist_row**
     - Owner: role_etl
     - Purpose: Raw pricelist data rows
     - Write Path: `/api/spp/upload` → `PricelistService.insertRows()`
     - Consumers: `/api/spp/validate`, `spp.merge_pricelist` procedure
     - Guarantees: Cascade delete on upload deletion; unique (upload_id, row_num)
   - **spp.merge_pricelist(upload_id)**
     - Owner: role_etl
     - Purpose: Merge validated pricelist into core schema
     - Callers: `/api/spp/merge` → `PricelistService.mergePricelist()`
     - Guarantees: Transactional; validates upload status; updates price history; refreshes materialized views

2. **Core Schema (Canonical Master Data)**
   - **core.supplier**
     - Owner: role_app
     - Purpose: Supplier master records
     - Write Path: Manual admin or supplier onboarding
     - Consumers: All modules
     - Guarantees: Unique name; active flag for soft deletes
   - **core.supplier_product**
     - Owner: role_etl (via merge), role_app (manual edits)
     - Purpose: Supplier SKU mappings
     - Write Path: `spp.merge_pricelist` procedure
     - Consumers: Selection workflow, SOH reports, all product queries
     - Guarantees: Unique (supplier_id, supplier_sku); is_active flag; last_seen_at updated on merge
   - **core.price_history**
     - Owner: role_etl (via merge)
     - Purpose: SCD Type 2 price tracking
     - Write Path: `spp.merge_pricelist` procedure
     - Consumers: `serve.mv_current_prices`, pricing reports
     - Guarantees: No overlapping date ranges per supplier_product_id; exactly one is_current=true per product; immutable (no updates, only inserts)
   - **core.inventory_selection**
     - Owner: role_app
     - Purpose: Selection definitions
     - Write Path: `/api/core/selections` → `InventorySelectionService.createSelection()`
     - Consumers: Selection workflow, NXT SOH view
     - Guarantees: Only one status='active' at a time (enforced by constraint or trigger)
   - **core.inventory_selected_item**
     - Owner: role_app
     - Purpose: Items in each selection
     - Write Path: `/api/core/selections/workflow` → `InventorySelectionService.executeWorkflow()`
     - Consumers: `serve.v_selected_catalog`, `serve.v_nxt_soh`
     - Guarantees: Unique (selection_id, supplier_product_id); status tracks lifecycle
   - **core.stock_on_hand**
     - Owner: role_app (manual), role_etl (imports)
     - Purpose: Stock snapshots
     - Write Path: `/api/serve/soh` → `StockService.recordStock()`, bulk imports
     - Consumers: `serve.v_soh_by_supplier`, `serve.v_nxt_soh`
     - Guarantees: Immutable snapshots (no updates); as_of_ts tracks snapshot time
   - **core.stock_location**
     - Owner: role_app
     - Purpose: Physical/virtual stock locations
     - Write Path: Manual admin
     - Consumers: Stock queries
     - Guarantees: Unique name; type validation

3. **Serve Schema (Read-Optimized Views)**
   - **serve.v_product_table_by_supplier**
     - Owner: role_app (read-only)
     - Purpose: SPP Review grid with pricing and selection status
     - Consumers: `/api/core/suppliers/products/table`, `PortfolioDashboard`
     - Guarantees: Shows all active supplier products; includes price deltas; flags new products
   - **serve.v_selected_catalog**
     - Owner: role_app (read-only)
     - Purpose: All items in active selections
     - Consumers: `/api/core/selections/catalog`, downstream modules
     - Guarantees: Only items with status='selected' in status='active' selections
   - **serve.v_soh_by_supplier**
     - Owner: role_app (read-only)
     - Purpose: Stock by supplier with latest snapshots
     - Consumers: SOH reports, inventory module
     - Guarantees: Latest snapshot per location/product; includes pricing
   - **serve.v_nxt_soh**
     - Owner: role_app (read-only)
     - Purpose: Authoritative NXT SOH (selected items only)
     - Consumers: `/api/serve/nxt-soh`, all downstream modules
     - Guarantees: ONLY items in active selection; empty if no active selection; latest stock per location
   - **serve.mv_current_prices**
     - Owner: role_etl (refresh)
     - Purpose: Materialized view of current prices for performance
     - Refresh Trigger: After `core.price_history` inserts/updates
     - Consumers: All pricing queries
     - Guarantees: Exactly one row per supplier_product_id; refreshed after merges
   - **serve.refresh_materialized_views()**
     - Owner: role_etl
     - Purpose: Refresh all materialized views
     - Callers: `spp.merge_pricelist`, scheduled jobs
     - Guarantees: Concurrent refresh (non-blocking)

4. **Indexes**
   - List all critical indexes with purpose and performance targets
   - Document index maintenance schedule (ANALYZE, VACUUM)

5. **Constraints**
   - List all FK constraints, unique constraints, check constraints
   - Document business rules enforced by constraints

This glossary serves as the definitive reference for database architecture.

### monitoring\dashboards\nxt-spp-metrics.json(NEW)

Create monitoring dashboard configuration for NXT-SPP metrics:

1. **Upload Metrics**
   - Upload success rate: `(COUNT(status='merged') / COUNT(*)) * 100` from `spp.pricelist_upload`
   - Upload latency: Average time from `received_at` to `processed_at`
   - Upload failures: Count of `status='failed'` in last 24 hours
   - Rows processed per second: `row_count / (EXTRACT(EPOCH FROM (processed_at - received_at)))`

2. **Merge Metrics**
   - Merge duration: Time to execute `spp.merge_pricelist` procedure
   - Products created per merge: Average `products_created` from merge results
   - Products updated per merge: Average `products_updated` from merge results
   - Merge errors: Count of merge failures in last 24 hours

3. **Selection Metrics**
   - Active selection count: `SELECT COUNT(*) FROM core.inventory_selection WHERE status = 'active'` (should always be 0 or 1)
   - Selection activation time: Time to execute activation endpoint
   - Selected items count: `SELECT COUNT(*) FROM core.inventory_selected_item WHERE status = 'selected' AND selection_id IN (SELECT selection_id FROM core.inventory_selection WHERE status = 'active')`
   - Selection changes per day: Count of selection activations

4. **NXT SOH Metrics**
   - NXT SOH query time: P50, P95, P99 latency for `/api/serve/nxt-soh`
   - NXT SOH row count: `SELECT COUNT(*) FROM serve.v_nxt_soh`
   - NXT SOH total value: `SELECT SUM(total_value) FROM serve.v_nxt_soh`
   - Stock freshness: Age of oldest stock snapshot in NXT SOH

5. **Data Quality Metrics**
   - Orphaned price history: Count of `is_current=true` records with `valid_to IS NOT NULL`
   - Overlapping price periods: Count of supplier_product_ids with overlapping date ranges
   - Inactive products in selections: Count of selected items where `supplier_product.is_active = false`
   - Missing prices: Count of supplier products without current price

6. **Performance Metrics**
   - Database connection pool usage: Active/idle connections
   - Slow queries: Count of queries >1000ms
   - Materialized view refresh time: Duration of `serve.refresh_materialized_views()`
   - API response times: P50, P95, P99 for all NXT-SPP endpoints

7. **Alerts**
   - Alert if upload success rate <95%
   - Alert if merge duration >30s for 1000 products
   - Alert if multiple active selections detected
   - Alert if NXT SOH query time >500ms
   - Alert if orphaned price history records detected
   - Alert if no active selection for >1 hour

8. **Dashboard Layout**
   - Top row: Key metrics (upload success rate, active selection count, NXT SOH row count, total inventory value)
   - Second row: Upload and merge performance charts
   - Third row: Selection and NXT SOH performance charts
   - Bottom row: Data quality and error logs

Export as JSON for import into Grafana, Datadog, or similar monitoring tool.