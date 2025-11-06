# Schema Definition - Migration 0024
**Complete SQL Schema Reference for Sync Operations**

---

## Table: sync_preview_cache

```sql
CREATE TABLE sync_preview_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    sync_type sync_type NOT NULL,
    sync_id VARCHAR(255),
    delta_json JSONB NOT NULL DEFAULT '{}',
    computed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '1 hour'),
    computed_by UUID REFERENCES auth.users_extended(id) ON DELETE SET NULL,
    cache_key VARCHAR(255) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT preview_cache_not_expired CHECK (expires_at > NOW())
);
```

**Indexes:**
```sql
CREATE INDEX idx_sync_preview_cache_org_type ON sync_preview_cache(org_id, sync_type);
CREATE INDEX idx_sync_preview_cache_expires ON sync_preview_cache(expires_at);
CREATE INDEX idx_sync_preview_cache_computed ON sync_preview_cache(computed_at DESC);
CREATE INDEX idx_sync_preview_cache_key ON sync_preview_cache(cache_key) WHERE cache_key IS NOT NULL;
```

**RLS Policies:**
```sql
CREATE POLICY preview_cache_select ON sync_preview_cache FOR SELECT
    USING (EXISTS (SELECT 1 FROM auth.users_extended u WHERE u.id = auth.uid() AND u.org_id = sync_preview_cache.org_id));

CREATE POLICY preview_cache_insert ON sync_preview_cache FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM auth.users_extended u WHERE u.id = auth.uid() AND u.org_id = sync_preview_cache.org_id));

CREATE POLICY preview_cache_update ON sync_preview_cache FOR UPDATE
    USING (EXISTS (SELECT 1 FROM auth.users_extended u WHERE u.id = auth.uid() AND u.org_id = sync_preview_cache.org_id))
    WITH CHECK (EXISTS (SELECT 1 FROM auth.users_extended u WHERE u.id = auth.uid() AND u.org_id = sync_preview_cache.org_id));

CREATE POLICY preview_cache_delete ON sync_preview_cache FOR DELETE
    USING (EXISTS (SELECT 1 FROM auth.users_extended u WHERE u.id = auth.uid() AND u.org_id = sync_preview_cache.org_id));
```

---

## Table: sync_progress

```sql
CREATE TABLE sync_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    sync_id VARCHAR(255) NOT NULL,
    job_id VARCHAR(255),
    entity_type sync_entity_type NOT NULL,
    current_item INTEGER NOT NULL DEFAULT 0,
    total_items INTEGER NOT NULL DEFAULT 0,
    processed_count INTEGER NOT NULL DEFAULT 0,
    failed_count INTEGER NOT NULL DEFAULT 0,
    speed_items_per_min NUMERIC(10, 2),
    eta_seconds INTEGER,
    elapsed_seconds INTEGER NOT NULL DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    source_system VARCHAR(50),
    batch_number INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    initiated_by UUID REFERENCES auth.users_extended(id) ON DELETE SET NULL,

    CONSTRAINT sync_progress_positive_counts CHECK (
        processed_count >= 0 AND failed_count >= 0 AND
        processed_count + failed_count <= total_items
    ),
    CONSTRAINT sync_progress_positive_items CHECK (
        current_item >= 0 AND total_items >= 0 AND current_item <= total_items
    ),
    UNIQUE (org_id, sync_id)
);
```

**Indexes:**
```sql
CREATE INDEX idx_sync_progress_org_job ON sync_progress(org_id, job_id);
CREATE INDEX idx_sync_progress_org_sync ON sync_progress(org_id, sync_id);
CREATE INDEX idx_sync_progress_active ON sync_progress(org_id, updated_at DESC)
    WHERE completed_at IS NULL;
CREATE INDEX idx_sync_progress_updated ON sync_progress(org_id, updated_at DESC);
CREATE INDEX idx_sync_progress_entity ON sync_progress(org_id, entity_type, started_at DESC);
```

**RLS Policies:**
```sql
CREATE POLICY sync_progress_select ON sync_progress FOR SELECT
    USING (EXISTS (SELECT 1 FROM auth.users_extended u WHERE u.id = auth.uid() AND u.org_id = sync_progress.org_id));

CREATE POLICY sync_progress_insert ON sync_progress FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM auth.users_extended u WHERE u.id = auth.uid() AND u.org_id = sync_progress.org_id));

CREATE POLICY sync_progress_update ON sync_progress FOR UPDATE
    USING (EXISTS (SELECT 1 FROM auth.users_extended u WHERE u.id = auth.uid() AND u.org_id = sync_progress.org_id))
    WITH CHECK (EXISTS (SELECT 1 FROM auth.users_extended u WHERE u.id = auth.uid() AND u.org_id = sync_progress.org_id));

CREATE POLICY sync_progress_delete ON sync_progress FOR DELETE
    USING (EXISTS (SELECT 1 FROM auth.users_extended u WHERE u.id = auth.uid() AND u.org_id = sync_progress.org_id));
```

---

## Table: sync_activity_log (PARTITIONED)

```sql
CREATE TABLE sync_activity_log (
    id UUID NOT NULL,
    org_id UUID NOT NULL,
    sync_id VARCHAR(255),
    entity_type sync_entity_type,
    action sync_action NOT NULL,
    status sync_status_type NOT NULL,
    record_count INTEGER DEFAULT 0,
    duration_seconds NUMERIC(10, 2),
    error_message TEXT,
    user_id UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,

    CONSTRAINT sync_activity_log_positive_count CHECK (record_count >= 0),
    CONSTRAINT sync_activity_log_positive_duration CHECK (duration_seconds IS NULL OR duration_seconds >= 0)
) PARTITION BY RANGE (created_at);

ALTER TABLE sync_activity_log ADD CONSTRAINT sync_activity_log_pkey PRIMARY KEY (id, created_at);
ALTER TABLE sync_activity_log ADD CONSTRAINT fk_sync_activity_org
    FOREIGN KEY (org_id) REFERENCES organization(id) ON DELETE CASCADE;
ALTER TABLE sync_activity_log ADD CONSTRAINT fk_sync_activity_user
    FOREIGN KEY (user_id) REFERENCES auth.users_extended(id) ON DELETE SET NULL;
```

**Partitions:**
```sql
CREATE TABLE sync_activity_log_2025_11 PARTITION OF sync_activity_log
    FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');

CREATE TABLE sync_activity_log_2025_12 PARTITION OF sync_activity_log
    FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');

CREATE TABLE sync_activity_log_2026_01 PARTITION OF sync_activity_log
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

CREATE TABLE sync_activity_log_2026_02 PARTITION OF sync_activity_log
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

CREATE TABLE sync_activity_log_future PARTITION OF sync_activity_log
    FOR VALUES FROM ('2026-03-01') TO (MAXVALUE);
```

**Indexes (inherited by partitions):**
```sql
CREATE INDEX idx_sync_activity_log_org_created ON sync_activity_log(org_id, created_at DESC);
CREATE INDEX idx_sync_activity_log_user ON sync_activity_log(user_id, created_at DESC);
CREATE INDEX idx_sync_activity_log_entity ON sync_activity_log(org_id, entity_type, created_at DESC);
CREATE INDEX idx_sync_activity_log_action ON sync_activity_log(action, created_at DESC);
CREATE INDEX idx_sync_activity_log_status ON sync_activity_log(status, created_at DESC);
CREATE INDEX idx_sync_activity_log_sync_id ON sync_activity_log(sync_id, created_at DESC);
```

**RLS Policies:**
```sql
CREATE POLICY sync_activity_log_select ON sync_activity_log FOR SELECT
    USING (EXISTS (SELECT 1 FROM auth.users_extended u WHERE u.id = auth.uid() AND u.org_id = sync_activity_log.org_id));

CREATE POLICY sync_activity_log_insert ON sync_activity_log FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM auth.users_extended u WHERE u.id = auth.uid() AND u.org_id = sync_activity_log.org_id));

CREATE POLICY sync_activity_log_update ON sync_activity_log FOR UPDATE
    USING (EXISTS (SELECT 1 FROM auth.users_extended u WHERE u.id = auth.uid() AND u.org_id = sync_activity_log.org_id))
    WITH CHECK (EXISTS (SELECT 1 FROM auth.users_extended u WHERE u.id = auth.uid() AND u.org_id = sync_activity_log.org_id));

CREATE POLICY sync_activity_log_delete ON sync_activity_log FOR DELETE
    USING (EXISTS (SELECT 1 FROM auth.users_extended u WHERE u.id = auth.uid() AND u.org_id = sync_activity_log.org_id));
```

---

## Enum Types

### sync_type
```sql
CREATE TYPE sync_type AS ENUM (
    'woocommerce',
    'odoo',
    'shopify',
    'custom'
);
```

### sync_action
```sql
CREATE TYPE sync_action AS ENUM (
    'preview_delta',
    'sync_start',
    'sync_complete',
    'batch_process',
    'error_recovery',
    'manual_trigger',
    'scheduled_run',
    'partial_resume'
);
```

### sync_entity_type
```sql
CREATE TYPE sync_entity_type AS ENUM (
    'customer',
    'product',
    'order',
    'invoice',
    'supplier',
    'inventory',
    'category',
    'attribute'
);
```

### sync_status_type
```sql
CREATE TYPE sync_status_type AS ENUM (
    'pending',
    'in_progress',
    'completed',
    'completed_with_errors',
    'failed',
    'cancelled',
    'paused',
    'timeout'
);
```

---

## Trigger Functions

### auto_cleanup_preview_cache()

```sql
CREATE OR REPLACE FUNCTION auto_cleanup_preview_cache()
RETURNS TABLE(deleted_count INTEGER, error_message TEXT) AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    DELETE FROM sync_preview_cache
    WHERE expires_at < NOW();

    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RETURN QUERY SELECT v_deleted_count, NULL::TEXT;

EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 0, SQLERRM;
END;
$$ LANGUAGE plpgsql;
```

**Execution:**
```sql
SELECT * FROM auto_cleanup_preview_cache();
-- Schedule every 15 minutes for production use
```

---

### update_sync_progress_elapsed()

```sql
CREATE OR REPLACE FUNCTION update_sync_progress_elapsed()
RETURNS TRIGGER AS $$
BEGIN
    NEW.elapsed_seconds := EXTRACT(EPOCH FROM (NOW() - NEW.started_at))::INTEGER;

    IF NEW.elapsed_seconds > 0 AND NEW.processed_count > 0 THEN
        NEW.speed_items_per_min := (NEW.processed_count::NUMERIC / NEW.elapsed_seconds) * 60;
    ELSE
        NEW.speed_items_per_min := 0;
    END IF;

    IF NEW.total_items > 0 AND NEW.speed_items_per_min > 0 THEN
        NEW.eta_seconds := ((NEW.total_items - NEW.processed_count) / NEW.speed_items_per_min) * 60;
    ELSE
        NEW.eta_seconds := NULL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_progress_update_elapsed ON sync_progress;
CREATE TRIGGER sync_progress_update_elapsed
    BEFORE INSERT OR UPDATE ON sync_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_sync_progress_elapsed();
```

---

### validate_sync_progress_totals()

```sql
CREATE OR REPLACE FUNCTION validate_sync_progress_totals()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.processed_count + NEW.failed_count) > NEW.total_items THEN
        RAISE EXCEPTION 'processed_count (%) + failed_count (%) exceeds total_items (%)',
            NEW.processed_count, NEW.failed_count, NEW.total_items;
    END IF;

    IF NEW.current_item > NEW.total_items THEN
        NEW.current_item := NEW.total_items;
    END IF;

    IF NEW.total_items > 0 AND
       (NEW.processed_count + NEW.failed_count) = NEW.total_items AND
       NEW.completed_at IS NULL THEN
        NEW.completed_at := NOW();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_progress_validate_totals ON sync_progress;
CREATE TRIGGER sync_progress_validate_totals
    BEFORE INSERT OR UPDATE ON sync_progress
    FOR EACH ROW
    EXECUTE FUNCTION validate_sync_progress_totals();
```

---

### update_sync_progress_timestamp()

```sql
CREATE OR REPLACE FUNCTION update_sync_progress_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_progress_update_timestamp ON sync_progress;
CREATE TRIGGER sync_progress_update_timestamp
    BEFORE UPDATE ON sync_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_sync_progress_timestamp();
```

---

### auto_log_sync_activity_on_progress_change()

```sql
CREATE OR REPLACE FUNCTION auto_log_sync_activity_on_progress_change()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.completed_at IS NOT NULL AND OLD.completed_at IS NULL THEN
        INSERT INTO sync_activity_log (
            id, org_id, sync_id, entity_type, action, status,
            record_count, duration_seconds, error_message, user_id, created_at
        ) VALUES (
            gen_random_uuid(),
            NEW.org_id,
            NEW.sync_id,
            NEW.entity_type,
            'sync_complete',
            CASE
                WHEN NEW.failed_count = 0 THEN 'completed'::sync_status_type
                ELSE 'completed_with_errors'::sync_status_type
            END,
            NEW.processed_count + NEW.failed_count,
            EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at)),
            NULL,
            NEW.initiated_by,
            NOW()
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_progress_log_completion ON sync_progress;
CREATE TRIGGER sync_progress_log_completion
    AFTER UPDATE ON sync_progress
    FOR EACH ROW
    EXECUTE FUNCTION auto_log_sync_activity_on_progress_change();
```

---

## Grant Statements

```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON sync_preview_cache TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sync_progress TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sync_activity_log TO authenticated;

GRANT EXECUTE ON FUNCTION auto_cleanup_preview_cache() TO authenticated;
GRANT EXECUTE ON FUNCTION update_sync_progress_elapsed() TO authenticated;
GRANT EXECUTE ON FUNCTION validate_sync_progress_totals() TO authenticated;
GRANT EXECUTE ON FUNCTION update_sync_progress_timestamp() TO authenticated;
GRANT EXECUTE ON FUNCTION auto_log_sync_activity_on_progress_change() TO authenticated;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
```

---

## Column Details

### sync_preview_cache Columns

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | UUID | No | gen_random_uuid() | Primary key |
| org_id | UUID | No | — | Foreign key → organization |
| sync_type | sync_type | No | — | Integration source |
| sync_id | VARCHAR(255) | Yes | — | Integration-specific ID |
| delta_json | JSONB | No | '{}' | NEW/UPDATED/DELETED snapshot |
| computed_at | TIMESTAMP TZ | No | NOW() | When computed |
| expires_at | TIMESTAMP TZ | No | NOW() + 1h | TTL checkpoint |
| computed_by | UUID | Yes | — | FK → auth.users_extended |
| cache_key | VARCHAR(255) | Yes | — | Unique cache identifier |
| created_at | TIMESTAMP TZ | No | NOW() | Record created |
| updated_at | TIMESTAMP TZ | No | NOW() | Last modified |

### sync_progress Columns

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | UUID | No | gen_random_uuid() | Primary key |
| org_id | UUID | No | — | Foreign key → organization |
| sync_id | VARCHAR(255) | No | — | Unique sync run identifier |
| job_id | VARCHAR(255) | Yes | — | Associated async job |
| entity_type | sync_entity_type | No | — | Business object type |
| current_item | INTEGER | No | 0 | Current item processing |
| total_items | INTEGER | No | 0 | Total items in sync |
| processed_count | INTEGER | No | 0 | Successfully processed |
| failed_count | INTEGER | No | 0 | Failed items |
| speed_items_per_min | NUMERIC(10,2) | Yes | — | Auto-calculated speed |
| eta_seconds | INTEGER | Yes | — | Auto-calculated ETA |
| elapsed_seconds | INTEGER | No | 0 | Auto-calculated elapsed |
| started_at | TIMESTAMP TZ | No | NOW() | Sync start time |
| updated_at | TIMESTAMP TZ | No | NOW() | Last update time |
| completed_at | TIMESTAMP TZ | Yes | — | Completion time (auto-set) |
| source_system | VARCHAR(50) | Yes | — | Integration name |
| batch_number | INTEGER | Yes | 0 | Batch processing number |
| metadata | JSONB | Yes | '{}' | Flexible extra data |
| initiated_by | UUID | Yes | — | FK → auth.users_extended |

### sync_activity_log Columns

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | UUID | No | — | Primary key (part of composite PK) |
| org_id | UUID | No | — | Foreign key → organization |
| sync_id | VARCHAR(255) | Yes | — | Reference to sync_progress |
| entity_type | sync_entity_type | Yes | — | What was synced |
| action | sync_action | No | — | Type of action |
| status | sync_status_type | No | — | Outcome status |
| record_count | INTEGER | Yes | 0 | Records affected |
| duration_seconds | NUMERIC(10,2) | Yes | — | Execution time |
| error_message | TEXT | Yes | — | Error details if failed |
| user_id | UUID | Yes | — | FK → auth.users_extended |
| created_at | TIMESTAMP TZ | No | — | PARTITION KEY |

---

## Constraints Summary

### Primary Keys
- `sync_preview_cache`: id
- `sync_progress`: id
- `sync_activity_log`: (id, created_at)

### Unique Constraints
- `sync_preview_cache`: cache_key (partial, where cache_key IS NOT NULL)
- `sync_progress`: (org_id, sync_id)

### Check Constraints
- `sync_preview_cache`: expires_at > NOW()
- `sync_progress`: processed_count + failed_count <= total_items
- `sync_progress`: current_item >= 0 AND total_items >= 0 AND current_item <= total_items
- `sync_activity_log`: record_count >= 0
- `sync_activity_log`: duration_seconds IS NULL OR duration_seconds >= 0

### Foreign Keys
- `sync_preview_cache.org_id` → `organization.id` (CASCADE)
- `sync_preview_cache.computed_by` → `auth.users_extended.id` (SET NULL)
- `sync_progress.org_id` → `organization.id` (CASCADE)
- `sync_progress.initiated_by` → `auth.users_extended.id` (SET NULL)
- `sync_activity_log.org_id` → `organization.id` (CASCADE)
- `sync_activity_log.user_id` → `auth.users_extended.id` (SET NULL)

---

## Index Summary

| Table | Index Name | Columns | Type | Notes |
|-------|-----------|---------|------|-------|
| sync_preview_cache | idx_sync_preview_cache_org_type | (org_id, sync_type) | BTREE | Query by org & type |
| sync_preview_cache | idx_sync_preview_cache_expires | (expires_at) | BTREE | TTL cleanup |
| sync_preview_cache | idx_sync_preview_cache_computed | (computed_at DESC) | BTREE | Recent entries |
| sync_preview_cache | idx_sync_preview_cache_key | (cache_key) | BTREE | Deduplication |
| sync_progress | idx_sync_progress_org_job | (org_id, job_id) | BTREE | Query by job |
| sync_progress | idx_sync_progress_org_sync | (org_id, sync_id) | BTREE | Query by sync |
| sync_progress | idx_sync_progress_active | (org_id, updated_at DESC) | BTREE | Active syncs only |
| sync_progress | idx_sync_progress_updated | (org_id, updated_at DESC) | BTREE | Recent updates |
| sync_progress | idx_sync_progress_entity | (org_id, entity_type, started_at DESC) | BTREE | Entity analytics |
| sync_activity_log | idx_sync_activity_log_org_created | (org_id, created_at DESC) | BTREE | Org activity |
| sync_activity_log | idx_sync_activity_log_user | (user_id, created_at DESC) | BTREE | User activity |
| sync_activity_log | idx_sync_activity_log_entity | (org_id, entity_type, created_at DESC) | BTREE | Entity activity |
| sync_activity_log | idx_sync_activity_log_action | (action, created_at DESC) | BTREE | Action activity |
| sync_activity_log | idx_sync_activity_log_status | (status, created_at DESC) | BTREE | Status activity |
| sync_activity_log | idx_sync_activity_log_sync_id | (sync_id, created_at DESC) | BTREE | Sync tracking |

---

## RLS Enabled

All tables have RLS enabled:

```sql
ALTER TABLE sync_preview_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_activity_log ENABLE ROW LEVEL SECURITY;
```

Total policies: 12 (4 per table × 3 tables)

---

**Last Updated:** 2025-11-06
**Version:** 1.0
**Status:** Production Ready
