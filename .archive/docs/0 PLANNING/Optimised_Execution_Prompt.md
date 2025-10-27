# 📌 Optimised Execution Prompt for Phases 2--4

You are to **fully implement** the attached planning documents
(`phase 2.md`, `Phase3.md`, `Phase4.md`) into the codebase.

⚠️ **Follow these rules exactly**:\
- **Do not re-verify** the analysis.\
- **Trust the plans verbatim.**\
- Implement **all proposed file changes**.\
- Only explore beyond the provided instructions if explicitly required
for implementation.

------------------------------------------------------------------------

## ✅ Execution Steps

### 1. Create/Update Review Documents

-   Create new Markdown review documents exactly as specified:
    -   `INVENTORY_CALCULATIONS_REVIEW.md` (Phase 2)\
    -   `INVENTORY_SUPPLIER_ALLOCATION_REVIEW.md` (Phase 3)\
    -   `INVENTORY_UI_DISPLAY_REVIEW.md` (Phase 4)\
-   Ensure references, file paths, SQL snippets, and TypeScript code are
    preserved exactly.

------------------------------------------------------------------------

### 2. Phase 2 -- Inventory Calculations & Metrics

-   Fix **hardcoded turnover** in `/api/inventory/analytics/route.ts`.\
-   Replace **mock movements** with queries to `stock_movements` table.\
-   Align turnover formula across all endpoints (analytics, trends,
    detailed).\
-   Consolidate **stock status derivation** into a shared utility.\
-   Ensure consistent filters (`status = 'active'`).\
-   Remove duplicate business logic across files.\
-   Update schema references for `stock_movements`.

**Output File(s):**\
- `INVENTORY_CALCULATIONS_REVIEW.md`\
- Updated API route files (`analytics`, `trends`, `inventory`,
`detailed`)\
- Shared utility for turnover + stock status

------------------------------------------------------------------------

### 3. Phase 3 -- Supplier Allocation & Association

-   Introduce `inventory_allocations` table schema.\
-   Implement new **allocation operations** in
    `/api/suppliers/[id]/inventory/route.ts`:
    -   `allocate_to_supplier`\
    -   `deallocate_from_supplier`\
    -   `transfer_allocation`\
    -   `consignment_in` / `consignment_out`\
-   Enforce validation (no negative stock, audit trail, allocation
    expirations).\
-   Add **stock movement records** for adjustments.\
-   Extend **SupplierInventoryView.tsx** with allocation UI:
    -   Allocate/deallocate buttons\
    -   Audit trail views\
    -   Reservation expiration indicators\
-   Extend store logic (`inventory-store.ts`) to support supplier
    allocations.

**Output File(s):**\
- `INVENTORY_SUPPLIER_ALLOCATION_REVIEW.md`\
- Updated supplier API routes\
- Updated store logic\
- Updated SupplierInventoryView with allocation UI

------------------------------------------------------------------------

### 4. Phase 4 -- Dashboard & Management UI Audit

-   Fix **data shape mismatches** by introducing transformation layer
    (`inventory-transformers.ts`).\
-   Update `/api/inventory/analytics` to provide missing fields:
    -   `forecastAccuracy`, `fillRate`, `criticalItems`,
        `excessStockValue`, `deadStockValue`, etc.\
-   Add missing UI wiring (`onSelectItem` for detail view).\
-   Replace full-page spinners with **skeleton loaders**.\
-   Standardise error/loading UX across dashboard + management.\
-   Optimise responsive layout (mobile card views, tab restructuring).\
-   Implement **Movements tab** using `stock_movements` data.

**Output File(s):**\
- `INVENTORY_UI_DISPLAY_REVIEW.md`\
- Updated `EnhancedInventoryDashboard.tsx`, `InventoryManagement.tsx`,
`page.tsx`\
- Updated API analytics route\
- New transformation utilities (`inventory-transformers.ts`)

------------------------------------------------------------------------

### 5. Integration & Alignment

-   Ensure Phase 2 fixes (correct turnover & metrics) flow into Phase 4
    UI.\
-   Ensure Phase 3 allocation logic surfaces in Phase 4 Supplier view +
    dashboard.\
-   Confirm consistent data models across store, API, and UI layers.\
-   Validate schema alignment with migrations (`setup-database.sql`, new
    migration files).

------------------------------------------------------------------------

## 🎯 Deliverables

-   All updated code files as per the proposed changes.\
-   The three new review documents (Phase 2--4).\
-   A fully functional, consistent inventory system with:
    -   Correct turnover metrics\
    -   Supplier-specific allocations\
    -   Stable, responsive dashboard & management UI

------------------------------------------------------------------------

👉 Use this as your **execution directive**. Implement **all three
phases in sequence**, without deviation from the provided plans.
