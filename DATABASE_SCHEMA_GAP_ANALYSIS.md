# Database Schema Gap Analysis

**Purpose:** Identify the mismatch between current database state and migration 0024 requirements
**Generated:** 2025-11-06
**Severity:** CRITICAL

---

## Current Database State

### Dual-Database Topology (required)
- **IS-SOH (Inventory Selected / Stock-on-Hand)**  
  - Connection: `DATABASE_URL` / `ENTERPRISE_DATABASE_URL`  
  - Schemas: `core`, `serve`, and a compatibility `public` schema composed of views over `core.*` (see `database/migrations/neon/001_fix_public_views.sql`).  
  - Role: canonical supplier, product, price, and stock data. All write operations must target `core.*`.
- **SPP (Supplier Processing Platform)**  
  - Connection: `NEON_SPP_DATABASE_URL`  
  - Schema: `spp` (see `database/scripts/spp_init_min.sql`) storing upload metadata, AI audits, and staging rows prior to being merged into `core`.
- **Bridging**  
  - `scripts/setup-two-tier.ts` configures FDW links so SPP can query `core/serve` (`setup_fdw_spp_to_issoh.sql`) and IS-SOH can inspect SPP tables (`setup_fdw_issoh_to_spp.sql`). These links are read-only conveniences; they do **not** change the fact that writes belong in each DB’s native schema.
- **Key Rule**  
  - `public.suppliers`, `public.inventory_items`, and related objects inside IS-SOH are compatibility views. They do not support inserts/updates and will continue to throw errors until code paths are refactored to hit `core.*`/`spp.*` directly.

### Existing Schemas
- public (55 tables)
- core (no data)
- serve (no data)
- spp (no data)

### Existing Tables (Public Schema)

**AI & Analytics:**
- ai_alert, ai_conversation, ai_data_anomalies, ai_insights, ai_prediction, ai_predictions
- ai_query_history, ai_service_config
- analytics_anomalies, analytics_dashboard, analytics_dashboard_config
- analytics_metric_cache, analytics_predictions, analytics_widget

**Business Data:**
- customer, customer_loyalty, demand_forecast
- products, pricelist_items, pricing_* (5 tables)
- suppliers, supplier_addresses, supplier_contacts, supplier_performance, supplier_pricelists
- inventory_items, inventory_items_legacy, stock_movements, canon_inventory, canon_suppliers
- competitor_pricing

**Integration & Operations:**
- integration_connector, integration_mapping
- odoo_sync, woocommerce_sync
- loyalty_* (4 tables), reward_* (3 tables)
- purchase_orders, purchase_order_items
- support_ticket, ticket_comment
- users

**Views:**
- v_active_ai_alerts, v_dashboard_widgets, v_forecast_performance

---

## Migration 0024 Requirements

### Required Tables (MISSING)

| Table | Schema | Purpose | Status |
|-------|--------|---------|--------|
| organization | public | Multi-tenant isolation | ❌ MISSING |
| users_extended | auth | User-org mapping | ❌ MISSING |

### Required Schemas (MISSING)

| Schema | Purpose | Status |
|--------|---------|--------|
| auth | Authentication context | ❌ MISSING |

### Tables to Create (0024)

| Table | Purpose | Columns | Indexes | Status |
|-------|---------|---------|---------|--------|
| sync_preview_cache | Delta snapshot cache | 8 | 4 | BLOCKED |
| sync_progress | Progress tracking | 16 | 5 | BLOCKED |
| sync_activity_log | Audit trail (partitioned) | 10 | 6 | BLOCKED |

---

## Dependency Chain Analysis

### Current Problem

```
Migration 0024
    │
    ├── Requires: organization table
    │   └── Status: MISSING ❌
    │
    ├── Requires: auth schema
    │   └── Status: MISSING ❌
    │
    └── Requires: auth.users_extended table
        └── Status: MISSING ❌
```

### Why This Matters

```
Application Code
    │
    ├── Calls: INSERT INTO sync_progress
    │   └── Column: org_id (REQUIRED)
    │       └── FK: REFERENCES organization(id)
    │           └── Table: organization (MISSING) ❌
    │
    ├── Creates: RLS Policies
    │   └── Schema: auth (MISSING) ❌
    │
    └── Checks: User Org Access
        └── Table: auth.users_extended (MISSING) ❌
```

### Failure Path

```
Application calls: sync_progress.insert(org_id='xxx')
                    │
                    ├── PostgreSQL validates FK
                    │   └── Looks for organization table
                    │       └── FAILS: relation "organization" does not exist
                    │
                    └── Request errors
                        └── 500 Internal Server Error
```

---

## Migration 0024 Table Structure

### sync_preview_cache (8 columns)

```sql
CREATE TABLE sync_preview_cache (
    id UUID PRIMARY KEY,
    org_id UUID NOT NULL REFERENCES organization(id),  -- ← BLOCKED: org table missing
    sync_type sync_type NOT NULL,                      -- ← BLOCKED: enum not created
    sync_id VARCHAR(255),
    delta_json JSONB NOT NULL DEFAULT '{}',
    computed_at TIMESTAMP WITH TIME ZONE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    computed_by UUID,                                  -- ← Would FK to auth.users_extended
    cache_key VARCHAR(255) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL
)
```

**Blocking Issues:**
1. `REFERENCES organization(id)` - table doesn't exist
2. `sync_type` enum not created (blocked by table creation failure)
3. `computed_by` FK to auth.users_extended - user table doesn't exist

---

### sync_progress (16 columns)

```sql
CREATE TABLE sync_progress (
    id UUID PRIMARY KEY,
    org_id UUID NOT NULL REFERENCES organization(id),  -- ← BLOCKED: org table missing
    sync_id VARCHAR(255) NOT NULL,
    job_id VARCHAR(255),
    entity_type sync_entity_type NOT NULL,            -- ← BLOCKED: enum not created
    current_item INTEGER NOT NULL DEFAULT 0,
    total_items INTEGER NOT NULL DEFAULT 0,
    processed_count INTEGER NOT NULL DEFAULT 0,
    failed_count INTEGER NOT NULL DEFAULT 0,
    speed_items_per_min NUMERIC(10, 2),
    eta_seconds INTEGER,
    elapsed_seconds INTEGER NOT NULL DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    source_system VARCHAR(50),
    batch_number INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    initiated_by UUID,                                 -- ← Would FK to auth.users_extended
    UNIQUE (org_id, sync_id)
)
```

**Blocking Issues:**
1. `REFERENCES organization(id)` - table doesn't exist
2. `entity_type` enum not created (blocked by table creation failure)
3. `initiated_by` FK to auth.users_extended - user table doesn't exist
4. Trigger functions need this table (cannot create)

---

### sync_activity_log (10 columns + partitions)

```sql
CREATE TABLE sync_activity_log (
    id UUID NOT NULL,
    org_id UUID NOT NULL REFERENCES organization(id),  -- ← BLOCKED: org table missing
    sync_id VARCHAR(255),
    entity_type sync_entity_type,                      -- ← BLOCKED: enum not created
    action sync_action NOT NULL,                       -- ← BLOCKED: enum not created
    status sync_status_type NOT NULL,                  -- ← BLOCKED: enum not created
    record_count INTEGER DEFAULT 0,
    duration_seconds NUMERIC(10, 2),
    error_message TEXT,
    user_id UUID,                                      -- ← Would FK to auth.users_extended
    created_at TIMESTAMP WITH TIME ZONE NOT NULL
) PARTITION BY RANGE (created_at);
```

**Blocking Issues:**
1. `REFERENCES organization(id)` - table doesn't exist
2. Multiple enums not created (blocked by table creation failure)
3. `user_id` FK to auth.users_extended - user table doesn't exist
4. Partitions cannot be created (parent table fails first)

---

## RLS Policy Dependencies

### All 12 RLS Policies Reference auth.users_extended

```sql
CREATE POLICY preview_cache_select ON sync_preview_cache
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM auth.users_extended u
            WHERE u.id = auth.uid() AND u.org_id = sync_preview_cache.org_id
        )
    );
```

**Blocking Issues:**
- Schema `auth` doesn't exist
- Table `auth.users_extended` doesn't exist
- Function `auth.uid()` may not exist without Supabase setup
- All 12 policies blocked

---

## Enum Type Dependencies

### 4 Enum Types Required by Migration 0024

| Enum | Values | Created At | Status |
|------|--------|-----------|--------|
| sync_type | 4 values | Part 1 of migration | BLOCKED by table creation |
| sync_action | 8 values | Part 1 of migration | BLOCKED by table creation |
| sync_entity_type | 8 values | Part 1 of migration | BLOCKED by table creation |
| sync_status_type | 8 values | Part 1 of migration | BLOCKED by table creation |

**Issue:** Enums are created BEFORE tables in the migration, but since table creation fails, enum creation doesn't matter.

---

## Foreign Key Constraint Map

### sync_preview_cache

```
sync_preview_cache.org_id
    ├── REFERENCES organization(id)
    │   └── Status: MISSING ❌
    │
    └── ON DELETE CASCADE
        └── When org deleted, cascade delete sync cache entries
```

### sync_progress

```
sync_progress.org_id
    ├── REFERENCES organization(id)
    │   └── Status: MISSING ❌
    │
    └── ON DELETE CASCADE
        └── When org deleted, cascade delete progress records

sync_progress.initiated_by
    ├── REFERENCES auth.users_extended(id)
    │   └── Status: MISSING ❌
    │
    └── ON DELETE SET NULL
        └── When user deleted, set to NULL
```

### sync_activity_log

```
sync_activity_log.org_id
    ├── REFERENCES organization(id)
    │   └── Status: MISSING ❌
    │
    └── ON DELETE CASCADE
        └── When org deleted, cascade delete audit logs

sync_activity_log.user_id
    ├── REFERENCES auth.users_extended(id)
    │   └── Status: MISSING ❌
    │
    └── ON DELETE SET NULL
        └── When user deleted, set to NULL
```

---

## Trigger Function Dependencies

### 5 Trigger Functions Required

| Function | Depends On | Status |
|----------|-----------|--------|
| auto_cleanup_preview_cache() | sync_preview_cache table | BLOCKED |
| update_sync_progress_elapsed() | sync_progress table | BLOCKED |
| validate_sync_progress_totals() | sync_progress table | BLOCKED |
| update_sync_progress_timestamp() | sync_progress table | BLOCKED |
| auto_log_sync_activity_on_progress_change() | Both sync_progress & sync_activity_log | BLOCKED |

**All 5 blocked because sync_progress table cannot be created.**

---

## Application Dependencies

### Code Expecting These Tables

**From sync service code:**
```typescript
// Will fail - table doesn't exist
const progress = await db
  .from('sync_progress')
  .insert({ org_id, sync_id, entity_type, ... });
```

**From RLS policies:**
```typescript
// RLS check will fail - auth schema doesn't exist
// SELECT sync_progress WHERE org_id IN (SELECT org_id FROM auth.users_extended ...)
```

**From API endpoints:**
```typescript
// All sync endpoints will error
GET /api/v1/sync/progress/:jobId
POST /api/v1/sync/preview/delta
GET /api/v1/sync/activity-log
```

---

## Schema Gap Summary

### What's Missing (3 pieces)

1. **organization table**
   - Foundational multi-tenant isolation
   - FK target for 3 tables
   - Not created by any existing migration

2. **auth schema**
   - Authentication context
   - Does not exist in current database
   - Not created by any existing migration

3. **auth.users_extended table**
   - User-org mapping
   - FK target for 3 tables
   - RLS policy dependency for all 12 policies
   - Not created by any existing migration

### Impact (Complete Blockage)

- ❌ Cannot create sync_preview_cache (FK constraint fails)
- ❌ Cannot create sync_progress (FK constraint fails)
- ❌ Cannot create sync_activity_log (FK constraint fails)
- ❌ Cannot create any RLS policies (auth schema missing)
- ❌ Cannot create trigger functions (tables don't exist)
- ❌ Cannot create 4 enum types (or they won't be used)
- ❌ Cannot create 15+ indexes (tables don't exist)

### Result

**Migration 0024 will fail immediately at line 123 with error:**

```
ERROR:  relation "organization" does not exist
```

---

## How to Fix (Order Matters)

### Step 1: Create organization Table

```sql
CREATE TABLE organization (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

**Must be done FIRST** - other tables depend on it.

---

### Step 2: Create auth Schema and auth.users_extended

```sql
CREATE SCHEMA auth;

CREATE TABLE auth.users_extended (
    id UUID PRIMARY KEY,
    org_id UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

**Must be done SECOND** - RLS policies depend on it.

---

### Step 3: Apply Migration 0024

```bash
supabase db push
# OR
psql -f database/migrations/0024_sync_preview_progress_logs.sql
```

**Can only be done AFTER steps 1 & 2** - has FK constraints on both tables.

---

## Verification After Fix

### Verify organization table exists

```sql
SELECT COUNT(*) FROM organization;
-- Expected: 0 (empty)
```

### Verify auth schema exists

```sql
SELECT schema_name FROM information_schema.schemata
WHERE schema_name = 'auth';
-- Expected: 1 row
```

### Verify auth.users_extended exists

```sql
SELECT COUNT(*) FROM auth.users_extended;
-- Expected: 0 (empty)
```

### Verify migration 0024 tables exist

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema='public' AND table_name LIKE 'sync%';
-- Expected: 3 rows (sync_activity_log, sync_preview_cache, sync_progress)
```

### Verify RLS policies exist

```sql
SELECT COUNT(*) FROM pg_policies
WHERE tablename IN ('sync_activity_log', 'sync_preview_cache', 'sync_progress');
-- Expected: 12 rows
```

---

## Files Provided

| File | Purpose | Location |
|------|---------|----------|
| MIGRATION_0024_EXECUTIVE_SUMMARY.md | High-level overview | K:/00Project/MantisNXT/ |
| MIGRATION_0024_VERIFICATION_REPORT.md | Detailed 8-section report | K:/00Project/MantisNXT/ |
| MIGRATION_0024_REMEDIATION_STEPS.md | Step-by-step SQL fix | K:/00Project/MantisNXT/ |
| DATABASE_SCHEMA_GAP_ANALYSIS.md | This document | K:/00Project/MantisNXT/ |

---

## Status

**Verification:** Complete
**Blocking Issues:** 3 (all CRITICAL)
**Application Deployment:** BLOCKED until issues resolved
**Estimated Fix Time:** 35-55 minutes
**Next Step:** Execute Phase 1 from remediation guide (create organization table)

---

**Generated:** 2025-11-06
**Severity:** CRITICAL
**Action Required:** YES
**Timeline:** Immediate
