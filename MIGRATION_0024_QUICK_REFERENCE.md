# MIGRATION 0024 - QUICK REFERENCE

**Status:** SUCCESSFULLY APPLIED TO PRODUCTION ✓
**Database:** Neon PostgreSQL (mantis_issoh)
**Timestamp:** 2025-11-06 09:59:18 UTC
**Duration:** 4021.95ms

---

## WHAT WAS DEPLOYED

### 3 New Tables

1. **sync_preview_cache**
   - Stores computed delta snapshots
   - Auto-expires after 1 hour
   - 4 indexes for fast lookups
   - 4 RLS policies (select/insert/update/delete)

2. **sync_progress**
   - Tracks real-time sync progress
   - Auto-calculates elapsed_seconds, speed, and ETA
   - 5 indexes for status queries
   - 4 RLS policies (select/insert/update/delete)

3. **sync_activity_log**
   - Complete audit trail (partitioned by month)
   - 5 partitions (2025-11 through future)
   - 15+ indexes for analytics
   - 4 RLS policies (select/insert/update/delete)

### 4 New Enum Types
- `sync_type` - woocommerce, odoo, shopify, custom
- `sync_action` - preview_delta, sync_start, sync_complete, etc.
- `sync_entity_type` - customer, product, order, invoice, etc.
- `sync_status_type` - pending, in_progress, completed, failed, etc.

### 5 Automation Triggers
- Auto-calculate elapsed_seconds
- Auto-calculate speed (items/minute)
- Auto-calculate ETA
- Auto-detect completion
- Auto-create activity log entries

### 12 Security Policies (RLS)
- 4 policies per table
- SELECT, INSERT, UPDATE, DELETE
- Organization-based isolation
- Multi-tenant safe

---

## VERIFICATION RESULTS

| Component | Expected | Actual | Status |
|-----------|----------|--------|--------|
| Tables | 3 | 3 | ✓ |
| RLS Enabled | 3/3 | 3/3 | ✓ |
| Security Policies | 12 | 12 | ✓ |
| Indexes | 15+ | 55 | ✓ |
| Triggers | 5 | 6 | ✓ |
| Enums | 4 | 4 | ✓ |

---

## API ENDPOINTS (To Be Implemented)

```
GET  /api/v1/sync/preview/{syncId}
     Get cached delta snapshot

GET  /api/v1/sync/progress/{syncId}
     Get current sync progress (with ETA)

POST /api/v1/sync/progress
     Update sync progress

GET  /api/v1/sync/activity?org={orgId}&entity={entity}
     Get activity log for organization
```

---

## DATABASE QUERIES (Examples)

### Get Sync Progress
```sql
SELECT
  sync_id,
  current_item,
  total_items,
  processed_count,
  failed_count,
  speed_items_per_min,
  eta_seconds,
  elapsed_seconds
FROM sync_progress
WHERE org_id = $1 AND sync_id = $2;
```

### Get Activity Log for Organization
```sql
SELECT
  id,
  action,
  status,
  record_count,
  duration_seconds,
  error_message,
  created_at
FROM sync_activity_log
WHERE org_id = $1
ORDER BY created_at DESC
LIMIT 100;
```

### Get Active Syncs
```sql
SELECT
  id,
  sync_id,
  entity_type,
  current_item,
  total_items,
  speed_items_per_min,
  eta_seconds
FROM sync_progress
WHERE org_id = $1 AND completed_at IS NULL
ORDER BY updated_at DESC;
```

### Cache Management
```sql
-- Cleanup expired previews
DELETE FROM sync_preview_cache
WHERE expires_at < NOW();

-- Or use trigger function
SELECT * FROM auto_cleanup_preview_cache();
```

---

## TABLES STRUCTURE

### sync_preview_cache
```
id UUID PRIMARY KEY
org_id UUID (FK: organization)
sync_type ENUM
sync_id VARCHAR(255)
delta_json JSONB
computed_at TIMESTAMPTZ
expires_at TIMESTAMPTZ (1-hour TTL)
computed_by UUID (FK: auth.users_extended)
cache_key VARCHAR(255) UNIQUE
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

### sync_progress
```
id UUID PRIMARY KEY
org_id UUID (FK: organization) UNIQUE with sync_id
sync_id VARCHAR(255)
job_id VARCHAR(255)
entity_type ENUM
current_item INTEGER
total_items INTEGER
processed_count INTEGER
failed_count INTEGER
speed_items_per_min NUMERIC
eta_seconds INTEGER
elapsed_seconds INTEGER (auto-calculated)
started_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
completed_at TIMESTAMPTZ (auto-set)
source_system VARCHAR(50)
batch_number INTEGER
metadata JSONB
initiated_by UUID (FK: auth.users_extended)
```

### sync_activity_log
```
id UUID PRIMARY KEY with created_at
org_id UUID (FK: organization)
sync_id VARCHAR(255)
entity_type ENUM
action ENUM
status ENUM
record_count INTEGER
duration_seconds NUMERIC
error_message TEXT
user_id UUID (FK: auth.users_extended)
created_at TIMESTAMPTZ (PARTITION KEY)
```

**Partitions:**
- sync_activity_log_2025_11 (2025-11-01 to 2025-12-01)
- sync_activity_log_2025_12 (2025-12-01 to 2026-01-01)
- sync_activity_log_2026_01 (2026-01-01 to 2026-02-01)
- sync_activity_log_2026_02 (2026-02-01 to 2026-03-01)
- sync_activity_log_future (2026-03-01 to MAXVALUE)

---

## SECURITY (RLS)

All tables have Row-Level Security enabled:

```sql
-- Users can only see their organization's data
SELECT * FROM sync_progress;  -- Automatically filtered by org_id

-- RLS policy enforces:
EXISTS (
  SELECT 1 FROM auth.users_extended u
  WHERE u.id = auth.uid()
  AND u.org_id = sync_progress.org_id
)
```

**Result:** Multi-tenant safe, no cross-org data leakage

---

## MAINTENANCE TASKS

### Daily
- Monitor trigger execution performance
- Watch for slow queries on indexes
- Check error_message field in activity_log

### Weekly
- Analyze index usage
- Vacuum and analyze tables
- Review activity logs for anomalies

### Monthly
- Archive old sync_activity_log partitions
- Review and optimize partition strategy
- Monitor cache hit rates

### Quarterly
- Create new partition for Q+3
- Review and update retention policies
- Performance analysis and tuning

---

## MONITORING

### Key Metrics to Track

1. **Cache Performance**
   - Cache hit ratio: SELECT COUNT(*) FROM sync_preview_cache WHERE expires_at > NOW()
   - Cache expiration rate: SELECT COUNT(*) FROM sync_preview_cache WHERE expires_at < NOW()

2. **Progress Tracking**
   - Active syncs: SELECT COUNT(*) FROM sync_progress WHERE completed_at IS NULL
   - Average speed: SELECT AVG(speed_items_per_min) FROM sync_progress
   - Average duration: SELECT AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) FROM sync_progress

3. **Activity Logging**
   - Success rate: SELECT COUNT(*) FILTER (WHERE status = 'completed') / COUNT(*) FROM sync_activity_log
   - Error rate: SELECT COUNT(*) FILTER (WHERE status IN ('failed', 'completed_with_errors')) / COUNT(*) FROM sync_activity_log

4. **Index Performance**
   - Check index usage: `SELECT * FROM pg_stat_user_indexes WHERE relname LIKE 'sync_%'`
   - Monitor query plans: `EXPLAIN ANALYZE SELECT ...`

---

## TROUBLESHOOTING

### Issue: RLS Policy Blocking Queries
**Solution:** Verify user exists in auth.users_extended with correct org_id
```sql
SELECT * FROM auth.users_extended WHERE id = current_user_id;
```

### Issue: Slow Progress Queries
**Solution:** Check if appropriate index is being used
```sql
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM sync_progress
WHERE org_id = $1 AND job_id = $2;
```

### Issue: Triggers Not Firing
**Solution:** Check trigger status and function permissions
```sql
SELECT * FROM information_schema.triggers
WHERE event_object_table LIKE 'sync_%';
```

### Issue: Partitions Not Working
**Solution:** Verify constraint_exclusion is on
```sql
SHOW constraint_exclusion;  -- Should be 'partition'
```

---

## ROLLBACK

To rollback migration 0024:

```bash
# Using automated script (if available)
npm run db:migrate:rollback -- --migration=0024

# Or manual rollback
psql -d mantis_issoh < database/migrations/rollback/0024_sync_preview_progress_logs.sql
```

**Data Impact:** None (new tables only, no modifications to existing data)

---

## RELATED FILES

- **Migration File:** `database/migrations/0024_sync_preview_progress_logs.sql`
- **Execution Script:** `scripts/execute-migration-0024-production.ts`
- **Full Report:** `MIGRATION_0024_EXECUTION_REPORT.md`
- **Dependencies:** `database/migrations/0001_*.sql`, `database/migrations/0023_*.sql`

---

## KEY FILES MODIFIED

None - This is a pure additive migration

**Files Created:**
- `scripts/execute-migration-0024-production.ts`
- `MIGRATION_0024_EXECUTION_REPORT.md` (this document)
- `MIGRATION_0024_QUICK_REFERENCE.md` (this file)

---

## SUCCESS CRITERIA - ALL MET ✓

- [x] 3 tables created
- [x] 3 tables have RLS enabled
- [x] 12 security policies active
- [x] 55 indexes created (15+)
- [x] 6 triggers installed (5+)
- [x] 4 enum types created
- [x] Monthly partitioning active
- [x] Foreign key constraints valid
- [x] Zero errors during execution
- [x] Multi-tenant isolation enforced
- [x] Backward compatible
- [x] Production ready

---

**Migration Status: PRODUCTION READY**
**Last Updated: 2025-11-06 09:59:18 UTC**
