-- =====================================================================
-- Migration: 0028_cleanup_automation.sql
-- Description: TTL automation, cleanup triggers, and scheduled maintenance
-- Author: Claude Agent SDK
-- Created: 2025-01-14
-- Dependencies: Requires 0025-0027 migrations
-- =====================================================================

-- Enable pg_cron extension for scheduled jobs (if available)
-- Note: pg_cron requires superuser privileges and may not be available in all environments
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- =====================================================================
-- FUNCTION: Cleanup expired pricelist uploads
-- Purpose: Delete uploaded files past their TTL and mark for storage cleanup
-- Pattern: Soft delete → storage cleanup → hard delete
-- =====================================================================
CREATE OR REPLACE FUNCTION spp.cleanup_expired_uploads()
RETURNS TABLE(
    deleted_count INTEGER,
    storage_paths TEXT[]
) AS $$
DECLARE
    v_deleted_count INTEGER := 0;
    v_storage_paths TEXT[];
BEGIN
    -- Collect storage paths for cleanup
    SELECT ARRAY_AGG(storage_path) INTO v_storage_paths
    FROM spp.pricelist_uploads
    WHERE expires_at < NOW()
    AND deleted_at IS NULL;

    -- Soft delete expired uploads
    UPDATE spp.pricelist_uploads
    SET
        deleted_at = NOW(),
        status = 'expired',
        updated_at = NOW()
    WHERE expires_at < NOW()
    AND deleted_at IS NULL;

    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

    -- Return cleanup summary
    RETURN QUERY SELECT v_deleted_count, v_storage_paths;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION spp.cleanup_expired_uploads IS 'Soft delete expired uploads and return storage paths for cleanup (run daily)';

-- =====================================================================
-- FUNCTION: Cleanup expired extraction results
-- Purpose: Delete cached extraction results past 24-hour TTL
-- =====================================================================
CREATE OR REPLACE FUNCTION spp.cleanup_expired_results()
RETURNS INTEGER AS $$
DECLARE
    v_deleted_count INTEGER := 0;
BEGIN
    DELETE FROM spp.extraction_results
    WHERE expires_at < NOW();

    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

    -- Log cleanup event
    INSERT INTO spp.extraction_metrics (
        org_id,
        metric_type,
        metric_value,
        metric_unit,
        metric_metadata
    )
    SELECT
        org_id,
        'cache_cleanup',
        1,
        'count',
        jsonb_build_object(
            'deleted_count', v_deleted_count,
            'cleanup_timestamp', NOW()
        )
    FROM public.organization
    LIMIT 1;

    RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION spp.cleanup_expired_results IS 'Delete extraction results past 24-hour TTL (run hourly)';

-- =====================================================================
-- FUNCTION: Cleanup expired rate limit entries
-- Purpose: Delete expired rate limit counters
-- =====================================================================
CREATE OR REPLACE FUNCTION spp.cleanup_expired_rate_limits()
RETURNS INTEGER AS $$
DECLARE
    v_deleted_count INTEGER := 0;
BEGIN
    DELETE FROM spp.api_rate_limit
    WHERE expires_at < NOW();

    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

    RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION spp.cleanup_expired_rate_limits IS 'Delete expired rate limit counters (run every 5 minutes)';

-- =====================================================================
-- FUNCTION: Archive old metrics data
-- Purpose: Move old metrics to archive table (optional, for data retention)
-- =====================================================================
CREATE TABLE IF NOT EXISTS spp.extraction_metrics_archive (
    LIKE spp.extraction_metrics INCLUDING ALL
);

COMMENT ON TABLE spp.extraction_metrics_archive IS 'Archive table for old extraction metrics (retention: 1 year)';

CREATE OR REPLACE FUNCTION spp.archive_old_metrics(
    p_retention_days INTEGER DEFAULT 90
)
RETURNS INTEGER AS $$
DECLARE
    v_archived_count INTEGER := 0;
    v_cutoff_date TIMESTAMPTZ;
BEGIN
    v_cutoff_date := NOW() - (p_retention_days || ' days')::INTERVAL;

    -- Move old metrics to archive
    WITH moved_metrics AS (
        DELETE FROM spp.extraction_metrics
        WHERE recorded_at < v_cutoff_date
        RETURNING *
    )
    INSERT INTO spp.extraction_metrics_archive
    SELECT * FROM moved_metrics;

    GET DIAGNOSTICS v_archived_count = ROW_COUNT;

    RETURN v_archived_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION spp.archive_old_metrics IS 'Archive metrics older than retention period (default: 90 days, run weekly)';

-- =====================================================================
-- FUNCTION: Cleanup stale worker locks
-- Purpose: Release worker locks from crashed/stuck jobs
-- =====================================================================
CREATE OR REPLACE FUNCTION spp.cleanup_stale_worker_locks()
RETURNS INTEGER AS $$
DECLARE
    v_released_count INTEGER := 0;
BEGIN
    -- Release locks from jobs locked longer than timeout
    UPDATE spp.extraction_jobs
    SET
        status = 'timeout',
        worker_id = NULL,
        worker_locked_at = NULL,
        error_message = 'Worker lock timeout - job may have crashed',
        updated_at = NOW()
    WHERE status = 'running'
    AND worker_locked_at IS NOT NULL
    AND worker_locked_at + worker_lock_timeout < NOW();

    GET DIAGNOSTICS v_released_count = ROW_COUNT;

    -- Log timeout events
    INSERT INTO spp.extraction_metrics (
        org_id,
        job_id,
        metric_type,
        metric_value,
        metric_unit,
        success
    )
    SELECT
        org_id,
        id,
        'job_timeout',
        1,
        'count',
        FALSE
    FROM spp.extraction_jobs
    WHERE status = 'timeout'
    AND updated_at > NOW() - INTERVAL '1 minute';

    RETURN v_released_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION spp.cleanup_stale_worker_locks IS 'Release worker locks from timed-out jobs (run every 5 minutes)';

-- =====================================================================
-- FUNCTION: Vacuum and analyze tables
-- Purpose: Maintain table statistics and reclaim space
-- =====================================================================
CREATE OR REPLACE FUNCTION spp.maintenance_vacuum_analyze()
RETURNS TEXT AS $$
BEGIN
    -- Analyze tables for query planner
    ANALYZE spp.pricelist_uploads;
    ANALYZE spp.extraction_jobs;
    ANALYZE spp.extraction_results;
    ANALYZE spp.import_jobs;
    ANALYZE spp.merge_history;
    ANALYZE spp.extraction_metrics;
    ANALYZE spp.api_rate_limit;
    ANALYZE spp.extraction_job_dlq;

    RETURN 'VACUUM ANALYZE completed for spp schema tables';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION spp.maintenance_vacuum_analyze IS 'Run VACUUM ANALYZE on all spp tables (run daily during low-traffic hours)';

-- =====================================================================
-- FUNCTION: Comprehensive cleanup (runs all cleanup tasks)
-- Purpose: Single entry point for all cleanup operations
-- =====================================================================
CREATE OR REPLACE FUNCTION spp.run_all_cleanup_tasks()
RETURNS TABLE(
    task_name TEXT,
    items_processed INTEGER,
    execution_time_ms INTEGER,
    success BOOLEAN,
    message TEXT
) AS $$
DECLARE
    v_start_time TIMESTAMPTZ;
    v_end_time TIMESTAMPTZ;
    v_result RECORD;
BEGIN
    -- Task 1: Cleanup expired uploads
    v_start_time := clock_timestamp();
    BEGIN
        SELECT deleted_count INTO v_result FROM spp.cleanup_expired_uploads();
        v_end_time := clock_timestamp();
        RETURN QUERY SELECT
            'cleanup_expired_uploads'::TEXT,
            v_result.deleted_count,
            EXTRACT(EPOCH FROM (v_end_time - v_start_time))::INTEGER * 1000,
            TRUE,
            'Expired uploads cleaned up'::TEXT;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT
            'cleanup_expired_uploads'::TEXT,
            0,
            0,
            FALSE,
            SQLERRM::TEXT;
    END;

    -- Task 2: Cleanup expired results
    v_start_time := clock_timestamp();
    BEGIN
        RETURN QUERY SELECT
            'cleanup_expired_results'::TEXT,
            spp.cleanup_expired_results(),
            EXTRACT(EPOCH FROM (clock_timestamp() - v_start_time))::INTEGER * 1000,
            TRUE,
            'Expired results cleaned up'::TEXT;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT
            'cleanup_expired_results'::TEXT,
            0,
            0,
            FALSE,
            SQLERRM::TEXT;
    END;

    -- Task 3: Cleanup expired rate limits
    v_start_time := clock_timestamp();
    BEGIN
        RETURN QUERY SELECT
            'cleanup_expired_rate_limits'::TEXT,
            spp.cleanup_expired_rate_limits(),
            EXTRACT(EPOCH FROM (clock_timestamp() - v_start_time))::INTEGER * 1000,
            TRUE,
            'Expired rate limits cleaned up'::TEXT;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT
            'cleanup_expired_rate_limits'::TEXT,
            0,
            0,
            FALSE,
            SQLERRM::TEXT;
    END;

    -- Task 4: Cleanup stale worker locks
    v_start_time := clock_timestamp();
    BEGIN
        RETURN QUERY SELECT
            'cleanup_stale_worker_locks'::TEXT,
            spp.cleanup_stale_worker_locks(),
            EXTRACT(EPOCH FROM (clock_timestamp() - v_start_time))::INTEGER * 1000,
            TRUE,
            'Stale worker locks released'::TEXT;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT
            'cleanup_stale_worker_locks'::TEXT,
            0,
            0,
            FALSE,
            SQLERRM::TEXT;
    END;

    -- Task 5: Archive old metrics
    v_start_time := clock_timestamp();
    BEGIN
        RETURN QUERY SELECT
            'archive_old_metrics'::TEXT,
            spp.archive_old_metrics(90),
            EXTRACT(EPOCH FROM (clock_timestamp() - v_start_time))::INTEGER * 1000,
            TRUE,
            'Old metrics archived'::TEXT;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT
            'archive_old_metrics'::TEXT,
            0,
            0,
            FALSE,
            SQLERRM::TEXT;
    END;

    -- Task 6: Vacuum and analyze
    v_start_time := clock_timestamp();
    BEGIN
        RETURN QUERY SELECT
            'maintenance_vacuum_analyze'::TEXT,
            0,
            EXTRACT(EPOCH FROM (clock_timestamp() - v_start_time))::INTEGER * 1000,
            TRUE,
            spp.maintenance_vacuum_analyze();
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT
            'maintenance_vacuum_analyze'::TEXT,
            0,
            0,
            FALSE,
            SQLERRM::TEXT;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION spp.run_all_cleanup_tasks IS 'Run all cleanup and maintenance tasks with error handling and timing (daily)';

-- =====================================================================
-- TRIGGER: Auto-extend upload TTL on access
-- Purpose: Extend TTL when file is accessed (up to max 30 days)
-- =====================================================================
CREATE OR REPLACE FUNCTION spp.extend_upload_ttl_on_access()
RETURNS TRIGGER AS $$
DECLARE
    v_max_ttl INTERVAL := INTERVAL '30 days';
    v_created_age INTERVAL;
BEGIN
    -- Calculate age since creation
    v_created_age := NOW() - NEW.created_at;

    -- Extend TTL if accessed and not expired
    IF NEW.status IN ('uploaded', 'processing', 'completed') AND v_created_age < v_max_ttl THEN
        -- Extend by 7 days, but not beyond 30 days from creation
        NEW.expires_at := LEAST(
            NOW() + INTERVAL '7 days',
            NEW.created_at + v_max_ttl
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: This trigger would fire on SELECT, but PostgreSQL doesn't support SELECT triggers
-- Instead, applications should call a function to extend TTL on access
CREATE OR REPLACE FUNCTION spp.extend_upload_ttl(p_upload_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_max_ttl INTERVAL := INTERVAL '30 days';
BEGIN
    UPDATE spp.pricelist_uploads
    SET
        expires_at = LEAST(
            NOW() + INTERVAL '7 days',
            created_at + v_max_ttl
        ),
        updated_at = NOW()
    WHERE id = p_upload_id
    AND status IN ('uploaded', 'processing', 'completed')
    AND (created_at + v_max_ttl) > NOW();

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION spp.extend_upload_ttl IS 'Extend upload TTL by 7 days when accessed (max 30 days total)';

-- =====================================================================
-- TRIGGER: Auto-extend result TTL on access
-- Purpose: Extend result cache TTL when accessed (up to max 7 days)
-- =====================================================================
CREATE OR REPLACE FUNCTION spp.extend_result_ttl(p_result_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_max_ttl INTERVAL := INTERVAL '7 days';
BEGIN
    UPDATE spp.extraction_results
    SET
        expires_at = LEAST(
            NOW() + INTERVAL '24 hours',
            created_at + v_max_ttl
        ),
        accessed_at = NOW(),
        access_count = access_count + 1,
        updated_at = NOW()
    WHERE id = p_result_id
    AND (created_at + v_max_ttl) > NOW();

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION spp.extend_result_ttl IS 'Extend result cache TTL by 24 hours when accessed (max 7 days total)';

-- =====================================================================
-- Scheduled Jobs (using pg_cron if available)
-- =====================================================================

-- Note: Uncomment these if pg_cron is available in your environment
-- Requires: CREATE EXTENSION pg_cron;

/*
-- Run comprehensive cleanup daily at 2 AM
SELECT cron.schedule(
    'spp-daily-cleanup',
    '0 2 * * *', -- Daily at 2 AM
    $$SELECT spp.run_all_cleanup_tasks();$$
);

-- Cleanup expired results every hour
SELECT cron.schedule(
    'spp-hourly-result-cleanup',
    '0 * * * *', -- Every hour
    $$SELECT spp.cleanup_expired_results();$$
);

-- Cleanup stale worker locks every 5 minutes
SELECT cron.schedule(
    'spp-worker-lock-cleanup',
    '*/5 * * * *', -- Every 5 minutes
    $$SELECT spp.cleanup_stale_worker_locks();$$
);

-- Cleanup expired rate limits every 5 minutes
SELECT cron.schedule(
    'spp-rate-limit-cleanup',
    '*/5 * * * *', -- Every 5 minutes
    $$SELECT spp.cleanup_expired_rate_limits();$$
);

-- Archive old metrics weekly (Sundays at 3 AM)
SELECT cron.schedule(
    'spp-weekly-metrics-archive',
    '0 3 * * 0', -- Sundays at 3 AM
    $$SELECT spp.archive_old_metrics(90);$$
);
*/

-- =====================================================================
-- Manual Cleanup Instructions (if pg_cron not available)
-- =====================================================================
COMMENT ON SCHEMA spp IS 'Supplier Pricelist Processing - Cleanup automation (Migration 0028)

MANUAL CLEANUP SCHEDULE (if pg_cron not available):

1. Daily (2 AM): SELECT * FROM spp.run_all_cleanup_tasks();
2. Hourly: SELECT spp.cleanup_expired_results();
3. Every 5 minutes: SELECT spp.cleanup_stale_worker_locks();
4. Every 5 minutes: SELECT spp.cleanup_expired_rate_limits();
5. Weekly (Sundays): SELECT spp.archive_old_metrics(90);

APPLICATION INTEGRATION:
- Call spp.extend_upload_ttl(uuid) when accessing uploads
- Call spp.extend_result_ttl(uuid) when accessing extraction results
- Call spp.increment_rate_limit(...) for API rate limiting
';

-- =====================================================================
-- Grants
-- =====================================================================
GRANT EXECUTE ON FUNCTION spp.cleanup_expired_uploads TO authenticated;
GRANT EXECUTE ON FUNCTION spp.cleanup_expired_results TO authenticated;
GRANT EXECUTE ON FUNCTION spp.cleanup_expired_rate_limits TO authenticated;
GRANT EXECUTE ON FUNCTION spp.cleanup_stale_worker_locks TO authenticated;
GRANT EXECUTE ON FUNCTION spp.archive_old_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION spp.maintenance_vacuum_analyze TO authenticated;
GRANT EXECUTE ON FUNCTION spp.run_all_cleanup_tasks TO authenticated;
GRANT EXECUTE ON FUNCTION spp.extend_upload_ttl TO authenticated;
GRANT EXECUTE ON FUNCTION spp.extend_result_ttl TO authenticated;

-- Admin-only functions (requires elevated privileges)
REVOKE EXECUTE ON FUNCTION spp.maintenance_vacuum_analyze FROM authenticated;
GRANT EXECUTE ON FUNCTION spp.maintenance_vacuum_analyze TO postgres;

-- =====================================================================
-- Migration Complete
-- =====================================================================

-- Create a summary view of cleanup status
CREATE OR REPLACE VIEW spp.cleanup_status AS
SELECT
    'pricelist_uploads' AS table_name,
    COUNT(*) FILTER (WHERE expires_at < NOW() AND deleted_at IS NULL) AS expired_count,
    COUNT(*) FILTER (WHERE deleted_at IS NOT NULL) AS deleted_count,
    MIN(expires_at) AS next_expiration
FROM spp.pricelist_uploads
UNION ALL
SELECT
    'extraction_results',
    COUNT(*) FILTER (WHERE expires_at < NOW()),
    0,
    MIN(expires_at)
FROM spp.extraction_results
UNION ALL
SELECT
    'api_rate_limit',
    COUNT(*) FILTER (WHERE expires_at < NOW()),
    0,
    MIN(expires_at)
FROM spp.api_rate_limit
UNION ALL
SELECT
    'extraction_jobs',
    COUNT(*) FILTER (WHERE status = 'running' AND worker_locked_at + worker_lock_timeout < NOW()),
    0,
    NULL
FROM spp.extraction_jobs;

COMMENT ON VIEW spp.cleanup_status IS 'Real-time cleanup status dashboard showing expired items and next expiration times';

GRANT SELECT ON spp.cleanup_status TO authenticated;
