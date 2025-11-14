# Migration 0024 - Remediation & Prerequisites Installation Guide

**Status:** ACTION REQUIRED - Cannot deploy migration 0024 without completing these steps
**Priority:** CRITICAL
**Estimated Time:** 15-30 minutes

---

## Problem Statement

Migration 0024 cannot be deployed because the database is missing foundational multi-tenant infrastructure:

- `organization` table (missing)
- `auth` schema (missing)
- `auth.users_extended` table (missing)

The migration will fail immediately when trying to create foreign key constraints.

---

## Remediation Plan

### Phase 1: Create Organization Table (5 minutes)

**Execute this SQL:**

```sql
-- Create organizations table for multi-tenant isolation
CREATE TABLE IF NOT EXISTS organization (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Organization identity
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,

    -- Settings
    is_active BOOLEAN DEFAULT true,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_organization_slug ON organization(slug);
CREATE INDEX IF NOT EXISTS idx_organization_active ON organization(is_active);
CREATE INDEX IF NOT EXISTS idx_organization_created ON organization(created_at DESC);

-- Add grants
GRANT SELECT, INSERT, UPDATE, DELETE ON organization TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE organization IS 'Multi-tenant organization isolation table. All sync operations require org_id for security.';
COMMENT ON COLUMN organization.id IS 'Organization unique identifier (UUID)';
COMMENT ON COLUMN organization.slug IS 'URL-safe organization identifier (unique constraint)';
COMMENT ON COLUMN organization.is_active IS 'Organizations can be soft-deleted by setting to false';
```

**Verification (run after execution):**

```sql
SELECT COUNT(*) as org_count FROM organization;
-- Expected output: org_count | 0

SELECT * FROM pg_indexes
WHERE tablename = 'organization'
ORDER BY indexname;
-- Expected output: 3 indexes (pkey, slug, active)
```

---

### Phase 2: Create Auth Schema and Users Table (5 minutes)

**Execute this SQL:**

```sql
-- Create auth schema (if not exists)
CREATE SCHEMA IF NOT EXISTS auth;

-- Create users_extended table for user-org mapping
CREATE TABLE IF NOT EXISTS auth.users_extended (
    id UUID PRIMARY KEY,

    -- Organization reference
    org_id UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,

    -- User identity
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    avatar_url TEXT,

    -- Status
    is_active BOOLEAN DEFAULT true,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_auth_users_org ON auth.users_extended(org_id);
CREATE INDEX IF NOT EXISTS idx_auth_users_email ON auth.users_extended(email);
CREATE INDEX IF NOT EXISTS idx_auth_users_active ON auth.users_extended(is_active);
CREATE INDEX IF NOT EXISTS idx_auth_users_org_active ON auth.users_extended(org_id, is_active);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON auth.users_extended TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA auth TO authenticated;

-- Add comments
COMMENT ON TABLE auth.users_extended IS 'User-to-organization mapping and extended user profile. Required for RLS policies in sync tables.';
COMMENT ON COLUMN auth.users_extended.id IS 'User ID from authentication provider (typically from auth provider)';
COMMENT ON COLUMN auth.users_extended.org_id IS 'Organization this user belongs to (enforced by RLS)';
COMMENT ON COLUMN auth.users_extended.email IS 'User email address (unique for login)';
COMMENT ON COLUMN auth.users_extended.is_active IS 'User can be deactivated without deleting records';
```

**Verification (run after execution):**

```sql
SELECT COUNT(*) as user_count FROM auth.users_extended;
-- Expected output: user_count | 0

SELECT schema_name FROM information_schema.schemata
WHERE schema_name = 'auth';
-- Expected output: auth

SELECT COUNT(*) as index_count FROM pg_indexes
WHERE schemaname = 'auth' AND tablename = 'users_extended';
-- Expected output: index_count | 4
```

---

### Phase 3: Verify Migration 0023 Status (5 minutes)

**Check if 0023 is applied:**

```sql
-- Check for sync infrastructure tables from 0023
SELECT table_name FROM information_schema.tables
WHERE table_schema='public'
  AND table_name LIKE 'sync%'
ORDER BY table_name;

-- Expected output (if 0023 is applied):
-- sync_job_queue
-- sync_schedule
-- (other 0023 tables)

-- If nothing is returned, 0023 needs to be applied first
```

**If 0023 is NOT applied:**

1. Apply migration 0023_sync_infrastructure.sql first
2. Verify it completes successfully
3. Then proceed to Phase 4

**Expected tables from 0023:**
- sync_job_queue
- sync_schedule
- sync_error_log
- sync_retry_policy

---

### Phase 4: Create Test Organization & User (5 minutes)

**Execute this SQL to populate test data:**

```sql
-- Create a test organization
INSERT INTO organization (name, slug, description, is_active)
VALUES (
    'Test Organization',
    'test-org',
    'Test organization for sync feature validation',
    true
)
ON CONFLICT (slug) DO NOTHING
RETURNING id;

-- Save the org_id from the output above, then use it below

-- Create a test user (replace <org_id> with the value from above)
INSERT INTO auth.users_extended (id, org_id, email, full_name, is_active)
VALUES (
    gen_random_uuid(),
    (SELECT id FROM organization WHERE slug = 'test-org'),
    'test@example.com',
    'Test User',
    true
)
ON CONFLICT (email) DO NOTHING
RETURNING id, email, org_id;
```

**Verification:**

```sql
-- Verify test organization exists
SELECT * FROM organization WHERE slug = 'test-org';

-- Verify test user exists
SELECT id, email, org_id FROM auth.users_extended
WHERE email = 'test@example.com';
```

---

### Phase 5: Apply Migration 0024 (10-15 minutes)

**Now that prerequisites are in place, apply migration 0024:**

**Option A: Using Neon migration script (Recommended)**

```bash
cd K:/00Project/MantisNXT
 yarn db:migrate --file database/migrations/0024_sync_preview_progress_logs.sql --database $NEON_DATABASE_URL
```

**Option B: Manual SQL Execution**

Execute the contents of `database/migrations/0024_sync_preview_progress_logs.sql`:

```bash
# This will apply the 400+ line migration
# Estimated time: 5-10 seconds
```

**What gets created:**
- 3 new tables (sync_preview_cache, sync_progress, sync_activity_log)
- 4 enum types (sync_type, sync_action, sync_entity_type, sync_status_type)
- 5 trigger functions (auto-cleanup, elapsed time calc, validation, etc.)
- 12 RLS policies (4 per table)
- 15+ indexes (for performance)
- Monthly partitions on sync_activity_log (2025-11 through 2026-03)

**Migration will output:**

```
🚀 ============================================================
🚀 APPLYING MIGRATION 0024: SYNC PREVIEW, PROGRESS & LOGGING
🚀 ============================================================

📋 Part 1/7: Creating enum types...
📋 Part 2/7: Creating sync_preview_cache table...
📋 Part 3/7: Creating sync_progress table...
📋 Part 4/7: Creating sync_activity_log table (partitioned)...
📋 Part 5/7: Enabling RLS and creating security policies...
📋 Part 6/7: Creating trigger functions...
📋 Part 7/7: Granting permissions to authenticated users...

✅ MIGRATION 0024 COMPLETED SUCCESSFULLY

Tables created:
  - sync_preview_cache (with 1-hour TTL)
  - sync_progress (with auto-elapsed calculation)
  - sync_activity_log (monthly partitioned)

Triggers installed:
  - auto_cleanup_preview_cache (manual execution)
  - update_sync_progress_elapsed (automatic)
  - validate_sync_progress_totals (automatic)
  - update_sync_progress_timestamp (automatic)
  - auto_log_sync_activity_on_progress_change (automatic)

RLS Policies: ENABLED on all tables
Organization Isolation: ENFORCED via org_id (multi-tenant safe)

🚀 Ready for production use!
```

---

## Post-Migration Verification

After applying migration 0024, verify all components:

### 1. Verify Table Creation

```sql
SELECT table_name,
       (SELECT COUNT(*) FROM information_schema.columns
        WHERE table_schema='public' AND table_name=t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name IN ('sync_preview_cache', 'sync_progress', 'sync_activity_log')
ORDER BY table_name;

-- Expected output:
-- sync_preview_cache | 8
-- sync_progress | 16
-- sync_activity_log | 10
```

### 2. Verify Enum Types

```sql
SELECT enum_name, ARRAY_AGG(enumlabel ORDER BY enumsortorder) as values
FROM pg_enum
WHERE enum_name IN ('sync_type', 'sync_action', 'sync_entity_type', 'sync_status_type')
GROUP BY enum_name
ORDER BY enum_name;

-- Expected output (4 enums with multiple values each)
```

### 3. Verify RLS Policies

```sql
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('sync_preview_cache', 'sync_progress', 'sync_activity_log')
ORDER BY tablename, policyname;

-- Expected output: 12 policies (4 per table)
```

### 4. Verify Indexes

```sql
SELECT tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('sync_preview_cache', 'sync_progress', 'sync_activity_log')
ORDER BY tablename, indexname;

-- Expected output: 15+ indexes
```

### 5. Verify Trigger Functions

```sql
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE 'sync_%' OR routine_name LIKE 'auto_%'
ORDER BY routine_name;

-- Expected output: 5 functions
-- - auto_cleanup_preview_cache
-- - auto_log_sync_activity_on_progress_change
-- - update_sync_progress_elapsed
-- - update_sync_progress_timestamp
-- - validate_sync_progress_totals
```

### 6. Test Trigger Auto-Calculation

```sql
-- Insert a test sync progress record
INSERT INTO sync_progress (
    org_id, sync_id, entity_type, total_items, processed_count, source_system
)
VALUES (
    (SELECT id FROM organization WHERE slug = 'test-org'),
    'test-sync-001',
    'customer'::sync_entity_type,
    100,
    0,
    'woocommerce'
)
RETURNING id, sync_id, elapsed_seconds, speed_items_per_min, eta_seconds;

-- Update to process some items
UPDATE sync_progress
SET processed_count = 50, current_item = 50
WHERE sync_id = 'test-sync-001'
RETURNING sync_id, processed_count, elapsed_seconds, speed_items_per_min, eta_seconds;

-- Verify:
-- - elapsed_seconds is auto-calculated
-- - speed_items_per_min is auto-calculated from processed_count/elapsed_seconds*60
-- - eta_seconds is auto-calculated from (total-processed)/speed*60
```

### 7. Test RLS Isolation

```sql
-- Set user context to test organization
SET ROLE authenticated;
SET app.current_user_id = '<test-user-id>';

-- This should return rows (user is in test-org)
SELECT COUNT(*) FROM sync_progress
WHERE org_id = (SELECT org_id FROM auth.users_extended WHERE email = 'test@example.com');

-- This should return 0 (RLS blocks access to other orgs)
SELECT COUNT(*) FROM sync_progress
WHERE org_id != (SELECT org_id FROM auth.users_extended WHERE email = 'test@example.com');
```

---

## Rollback Instructions (If Needed)

If migration 0024 needs to be rolled back:

```sql
BEGIN;

-- Drop RLS policies (reverse order)
DROP POLICY IF EXISTS sync_activity_log_delete ON sync_activity_log;
DROP POLICY IF EXISTS sync_activity_log_update ON sync_activity_log;
DROP POLICY IF EXISTS sync_activity_log_insert ON sync_activity_log;
DROP POLICY IF EXISTS sync_activity_log_select ON sync_activity_log;
DROP POLICY IF EXISTS sync_progress_delete ON sync_progress;
DROP POLICY IF EXISTS sync_progress_update ON sync_progress;
DROP POLICY IF EXISTS sync_progress_insert ON sync_progress;
DROP POLICY IF EXISTS sync_progress_select ON sync_progress;
DROP POLICY IF EXISTS preview_cache_delete ON sync_preview_cache;
DROP POLICY IF EXISTS preview_cache_update ON sync_preview_cache;
DROP POLICY IF EXISTS preview_cache_insert ON sync_preview_cache;
DROP POLICY IF EXISTS preview_cache_select ON sync_preview_cache;

-- Disable RLS
ALTER TABLE sync_activity_log DISABLE ROW LEVEL SECURITY;
ALTER TABLE sync_progress DISABLE ROW LEVEL SECURITY;
ALTER TABLE sync_preview_cache DISABLE ROW LEVEL SECURITY;

-- Drop trigger functions
DROP TRIGGER IF EXISTS sync_progress_log_completion ON sync_progress;
DROP TRIGGER IF EXISTS sync_progress_update_timestamp ON sync_progress;
DROP TRIGGER IF EXISTS sync_progress_validate_totals ON sync_progress;
DROP TRIGGER IF EXISTS sync_progress_update_elapsed ON sync_progress;

DROP FUNCTION IF EXISTS auto_log_sync_activity_on_progress_change();
DROP FUNCTION IF EXISTS update_sync_progress_timestamp();
DROP FUNCTION IF EXISTS validate_sync_progress_totals();
DROP FUNCTION IF EXISTS update_sync_progress_elapsed();
DROP FUNCTION IF EXISTS auto_cleanup_preview_cache();

-- Drop tables (partitions cascade)
DROP TABLE IF EXISTS sync_activity_log CASCADE;
DROP TABLE IF EXISTS sync_progress CASCADE;
DROP TABLE IF EXISTS sync_preview_cache CASCADE;

-- Drop enums
DROP TYPE IF EXISTS sync_status_type;
DROP TYPE IF EXISTS sync_entity_type;
DROP TYPE IF EXISTS sync_action;
DROP TYPE IF EXISTS sync_type;

COMMIT;
```

**Rollback time:** <1 second
**Data loss:** Only sync_* tables affected (safe to rollback)

---

## Execution Checklist

- [ ] Phase 1: Create organization table (5 min)
  - [ ] Execute SQL
  - [ ] Verify with SELECT COUNT(*) FROM organization

- [ ] Phase 2: Create auth schema and auth.users_extended (5 min)
  - [ ] Execute SQL
  - [ ] Verify with SELECT COUNT(*) FROM auth.users_extended

- [ ] Phase 3: Verify Migration 0023 status (5 min)
  - [ ] Check if sync tables exist
  - [ ] Apply 0023 if missing

- [ ] Phase 4: Create test data (5 min)
  - [ ] Create test organization
  - [ ] Create test user
  - [ ] Verify with SELECT queries

- [ ] Phase 5: Apply Migration 0024 (10-15 min)
  - [ ] Execute migration
  - [ ] Verify all output messages show success

- [ ] Post-Migration Verification (5 min)
  - [ ] Verify 3 tables created
  - [ ] Verify 4 enum types created
  - [ ] Verify 12 RLS policies created
  - [ ] Verify 15+ indexes created
  - [ ] Verify 5 trigger functions created

- [ ] Production readiness confirmation
  - [ ] All 8 validation sections pass
  - [ ] Test data verified
  - [ ] RLS isolation tested
  - [ ] Ready for application deployment

---

## Support & Troubleshooting

### Issue: "relation 'organization' does not exist"

**Cause:** Phase 1 was not completed
**Solution:** Execute Phase 1 SQL above

### Issue: "schema 'auth' does not exist"

**Cause:** Phase 2 was not completed
**Solution:** Execute Phase 2 SQL above

### Issue: "type 'sync_entity_type' does not exist"

**Cause:** Migration 0024 partially executed but failed
**Solution:** Execute rollback instructions, then repeat Phase 5

### Issue: RLS policies not enforcing isolation

**Cause:** auth.users_extended doesn't have test data
**Solution:** Execute Phase 4 SQL to create test user

### Issue: Trigger functions not auto-calculating values

**Cause:** Triggers not properly attached
**Solution:**
```sql
-- Verify triggers exist
SELECT trigger_name FROM information_schema.triggers
WHERE trigger_schema='public' AND event_object_table='sync_progress';

-- Should return: sync_progress_update_elapsed, sync_progress_validate_totals, sync_progress_update_timestamp
```

---

## Timeline Summary

| Phase | Task | Time | Status |
|-------|------|------|--------|
| 1 | Create organization table | 5 min | REQUIRED |
| 2 | Create auth schema & users | 5 min | REQUIRED |
| 3 | Verify migration 0023 | 5 min | REQUIRED |
| 4 | Create test data | 5 min | REQUIRED |
| 5 | Apply migration 0024 | 10 min | REQUIRED |
| 6 | Post-migration verification | 5 min | REQUIRED |
| **Total** | **All phases** | **35 min** | |

---

**Status:** Ready for execution
**Priority:** CRITICAL - Blocking application deployment
**Next Step:** Execute Phase 1 SQL above
