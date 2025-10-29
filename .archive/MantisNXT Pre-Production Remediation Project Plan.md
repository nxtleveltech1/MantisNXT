# MantisNXT Pre-Production Remediation Project Plan

## Phase A — Stabilization Adjustments ✅

### 1. Analytics Migration Decision Documentation
- ✅ Documented analytics table migration strategy
- ✅ Noted migration 005 superseded status
- ✅ Documented BIGINT identity vs UUID usage patterns

**Deliverable:** Documentation updated in `.archive/MantisNXT Pre-Production Comprehensive Assessment and Readiness Report.md`

---

## Phase B — Consolidation & Unification

### 1. Dashboards
**Status:** In Progress

**Actions:**
- ✅ Verified no imports of deleted components (OptimizedDashboard, ViewportOptimizedDashboard, RealTimeDashboard, InventoryDashboard, SupplierDashboard)
- ⏳ Verify remaining pages wrapped with AsyncBoundary
- ⏳ Remove backup pages (e.g., `src/app/suppliers/page_backup.tsx`)

### 2. Supplier Form Consolidation
**Status:** In Progress

**Actions:**
- ✅ Verified barrel export (`src/components/suppliers/index.ts`) already exports `EnhancedSupplierForm` as `SupplierForm`
- ✅ No direct imports of `@/components/suppliers/SupplierForm` found
- ⏳ Delete unused `src/components/suppliers/SupplierForm.tsx`
- ⏳ Update tests/stories if present

### 3. Inventory API Unification
**Status:** In Progress

**Current State:**
- Main route exists: `src/app/api/inventory/route.ts` (uses UnifiedDataService)
- Old routes to deprecate:
  - `src/app/api/inventory/complete/route.ts`
  - `src/app/api/inventory/enhanced/route.ts`
  - `src/app/api/inventory/products/route.ts`
  - `src/app/api/inventory/trends/route.ts`
  - `src/app/api/inventory/products/[id]/route.ts`
  - `src/app/api/v2/inventory/**`

**Actions:**
- ⏳ Update main route to handle all operations (summary, detailed, upload)
- ⏳ Add deprecation responses (410) to old routes
- ⏳ Update client code referencing old endpoints

### 4. Health Endpoint Consolidation
**Status:** In Progress

**Current State:**
- Main route exists: `src/app/api/health/route.ts`
- Old routes to deprecate:
  - `src/app/api/health/database/route.ts`
  - `src/app/api/health/database-connections/route.ts`
  - `src/app/api/health/database-enterprise/route.ts`
  - `src/app/api/health/frontend/route.ts`
  - `src/app/api/health/pipeline/route.ts`
  - `src/app/api/health/query-metrics/route.ts`
  - `src/app/api/health/system/route.ts`

**Actions:**
- ⏳ Verify all consumers use `/api/health`
- ⏳ Add deprecation responses (410) to old routes
- ⏳ Update monitoring/CI scripts if needed

---

## Phase C — Architectural Hardening

### 1. Global Authorization Enforcement
**Status:** ✅ Implemented

**Current State:**
- Middleware implemented: `src/middleware.ts`
- Checks Authorization header for API routes
- Allows health endpoint and OPTIONS
- Supports dev allowlist via `ALLOW_PUBLIC_GET_ENDPOINTS`

**Actions:**
- ⏳ Add tests for middleware (401 responses, allowlisted GETs)
- ⏳ Document required headers in API docs
- ⏳ Consider JWT signature verification (Edge-safe library)

### 2. AI Caching & Async Strategy
**Status:** In Progress

**Actions:**
- ⏳ Extend caching to AI routes (`src/app/api/ai/**`) using `src/lib/cache/responseCache.ts`
- ⏳ Introduce Redis-backed cache if cross-instance needed
- ⏳ Refactor long-running AI calls to queue/worker if necessary

### 3. Database Abstraction Cleanup
**Status:** In Progress

**Actions:**
- ⏳ Search for Neon-specific imports (`rg -n "neon" src lib`)
- ⏳ Ensure all DB access goes through:
  - `lib/database/enterprise-connection-manager.ts`
  - `lib/database/unified-connection.ts`
- ⏳ Rename/remove `lib/database/neon-connection.ts` if obsolete

### 4. RLS Verification
**Status:** In Progress

**Actions:**
- ⏳ Execute `database/scripts/verify-rls-implementation.sql` against Neon DB
- ⏳ Fix/add RLS policies via migrations
- ⏳ Document outcomes

### 5. Supplier Performance Data
**Status:** In Progress

**Actions:**
- ⏳ Verify repository logic aligns with tables:
  - `core.supplier_performance` (migration 013)
  - `public.supplier_performance` (migration 014)
- ⏳ Add seed or background job if needed

### 6. Final Deployment Checklist
**Status:** In Progress

**Actions:**
- ⏳ Update `DEPLOYMENT.md` and `DEPLOYMENT_CHECKLIST.md` with:
  - Dependencies (puppeteer/chrome)
  - Final `.env` example (JWT_SECRET, DATABASE_URL, ENTERPRISE_DATABASE_URL, ALLOW_PUBLIC_GET_ENDPOINTS, CACHE_TTL_SECONDS, REDIS_URL)
  - Validation steps (curl endpoints, UI smoke)

---

## Documentation Updates

### 1. Report & Plan
- ✅ Updated assessment report
- ✅ Updated remediation plan

### 2. README/Developer Docs
**Status:** In Progress

**Actions:**
- ⏳ Add sections on:
  - Authorization requirements
  - Unified inventory/suppliers APIs
  - Cache behavior and invalidation

---

## Verification & Testing

**Status:** Pending

**Actions:**
- ⏳ Run full suite: `npm run lint`, `npm run test:ci`
- ⏳ Manual curls: `/api/health`, `/api/suppliers`, `/api/inventory`
- ⏳ Verify middleware logs for auth denials
- ⏳ Verify cache hits if instrumentation added
- ⏳ Rerun RLS verification script after updates

---

*Last Updated: 2025-10-28*
