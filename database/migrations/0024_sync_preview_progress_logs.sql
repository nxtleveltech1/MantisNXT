-- ============================================================================
-- Migration: 0024_sync_preview_progress_logs.sql
-- Purpose : Align sync tables with DeltaDetectionService and SyncProgressTracker
-- Author  : Codex
-- Date    : 2025-11-12
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. ENUM DEFINITIONS (idempotent)
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sync_type') THEN
        CREATE TYPE sync_type AS ENUM ('woocommerce', 'odoo', 'shopify', 'custom');
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sync_action') THEN
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
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sync_entity_type') THEN
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
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sync_status_type') THEN
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
    END IF;
END;
$$;

-- ============================================================================
-- 2. TABLES + INDEXES
-- ============================================================================

-- sync_preview_cache: used by DeltaDetectionService (requires entity_type + delta_data)
DROP TABLE IF EXISTS sync_preview_cache CASCADE;
CREATE TABLE sync_preview_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    sync_type sync_type NOT NULL,
    entity_type sync_entity_type NOT NULL,
    sync_id VARCHAR(255),
    delta_data JSONB NOT NULL DEFAULT '{}',
    computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 hour'),
    computed_by UUID REFERENCES auth.users_extended(id) ON DELETE SET NULL,
    cache_key VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT sync_preview_unique UNIQUE (org_id, sync_type, entity_type)
);

CREATE INDEX idx_sync_preview_org_type ON sync_preview_cache(org_id, sync_type, entity_type);
CREATE INDEX idx_sync_preview_expires ON sync_preview_cache(expires_at);
CREATE INDEX idx_sync_preview_key ON sync_preview_cache(cache_key) WHERE cache_key IS NOT NULL;

-- sync_progress: matches SyncProgressTracker expectations
DROP TABLE IF EXISTS sync_progress CASCADE;
CREATE TABLE sync_progress (
    id UUID PRIMARY KEY,
    org_id UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    sync_id VARCHAR(255) NOT NULL,
    job_id VARCHAR(255),
    entity_type sync_entity_type,
    total_items INTEGER NOT NULL DEFAULT 0,
    processed_count INTEGER NOT NULL DEFAULT 0,
    failed_count INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'running',
    metadata JSONB NOT NULL DEFAULT '{}',
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    initiated_by UUID REFERENCES auth.users_extended(id) ON DELETE SET NULL,
    CONSTRAINT sync_progress_counts CHECK (processed_count >= 0 AND failed_count >= 0),
    CONSTRAINT sync_progress_unique UNIQUE (org_id, sync_id)
);

CREATE INDEX idx_sync_progress_org_job ON sync_progress(org_id, job_id);
CREATE INDEX idx_sync_progress_org_sync ON sync_progress(org_id, sync_id);
CREATE INDEX idx_sync_progress_org_status ON sync_progress(org_id, status, updated_at DESC);

-- sync_activity_log: lightweight logRequest/logActivity target (no partitions)
DROP TABLE IF EXISTS sync_activity_log CASCADE;
CREATE TABLE sync_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    sync_id VARCHAR(255),
    entity_type sync_entity_type,
    activity_type TEXT NOT NULL,
    status TEXT NOT NULL,
    details JSONB DEFAULT '{}'::JSONB,
    user_id UUID REFERENCES auth.users_extended(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sync_activity_org ON sync_activity_log(org_id, created_at DESC);
CREATE INDEX idx_sync_activity_sync ON sync_activity_log(sync_id, created_at DESC);

-- ============================================================================
-- 3. TRIGGERS + SUPPORT FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_preview_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_preview_touch ON sync_preview_cache;
CREATE TRIGGER trg_sync_preview_touch
    BEFORE UPDATE ON sync_preview_cache
    FOR EACH ROW
    EXECUTE FUNCTION sync_preview_touch_updated_at();

-- ============================================================================
-- 4. AUTH FALLBACK + RLS POLICIES (session-derived org/user)
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS auth;

CREATE OR REPLACE FUNCTION auth.uid()
RETURNS UUID
LANGUAGE sql
AS $$
    SELECT NULLIF(current_setting('app.current_user_id', true), '')::uuid
$$;

ALTER TABLE sync_preview_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS preview_cache_rls ON sync_preview_cache;
CREATE POLICY preview_cache_rls ON sync_preview_cache
    USING (org_id = current_setting('app.current_org_id', true)::uuid)
    WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);

DROP POLICY IF EXISTS sync_progress_rls ON sync_progress;
CREATE POLICY sync_progress_rls ON sync_progress
    USING (org_id = current_setting('app.current_org_id', true)::uuid)
    WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);

DROP POLICY IF EXISTS sync_activity_rls ON sync_activity_log;
CREATE POLICY sync_activity_rls ON sync_activity_log
    USING (org_id = current_setting('app.current_org_id', true)::uuid)
    WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);

-- ============================================================================
-- 5. MIGRATION RECORD + OPTIONAL SMOKE TESTS
-- ============================================================================

INSERT INTO schema_migrations (migration_name)
VALUES ('0024_sync_preview_progress_logs')
ON CONFLICT (migration_name) DO NOTHING;

-- Smoke test helpers (run manually if needed)
-- SELECT * FROM sync_preview_cache LIMIT 1;
-- SELECT * FROM sync_progress LIMIT 1;
-- SELECT * FROM sync_activity_log LIMIT 1;

COMMIT;

-- ============================================================================
-- Manual verification checklist (run from app / Neon console)
-- 1. Exercise DeltaDetectionService.storeInCache / invalidatePreviewCache
-- 2. Run SyncProgressTracker.startTracking → updateProgress → endTracking
-- 3. Trigger logRequest/logActivity to ensure sync_activity_log writes succeed
-- 4. Load Activity Log UI and confirm records render without SQL errors
-- ============================================================================
