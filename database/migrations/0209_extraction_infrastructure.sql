-- Migration: 0209_extraction_infrastructure
-- Description: Create extraction job queue infrastructure (DLQ, metrics, results cache)
-- Author: Claude
-- Date: 2025-01-14

BEGIN;

-- ============================================================================
-- SCHEMA: spp (Supplier Pricelist Processing)
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS spp;

-- ============================================================================
-- TABLE: extraction_jobs
-- ============================================================================

CREATE TABLE IF NOT EXISTS spp.extraction_jobs (
    job_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    upload_id UUID NOT NULL,
    org_id UUID NOT NULL,
    supplier_id UUID,
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'cancelled')),
    priority INTEGER NOT NULL DEFAULT 0,
    retry_count INTEGER NOT NULL DEFAULT 0,
    result JSONB,
    result_cache_key TEXT,
    error JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_extraction_jobs_status ON spp.extraction_jobs(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_extraction_jobs_upload ON spp.extraction_jobs(upload_id);
CREATE INDEX IF NOT EXISTS idx_extraction_jobs_org ON spp.extraction_jobs(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_extraction_jobs_priority ON spp.extraction_jobs(priority DESC, created_at);

COMMENT ON TABLE spp.extraction_jobs IS 'Extraction job tracking with status, priority, and retry information';
COMMENT ON COLUMN spp.extraction_jobs.priority IS 'Higher values = processed first (0-10 scale)';
COMMENT ON COLUMN spp.extraction_jobs.retry_count IS 'Number of retry attempts (max 3)';
COMMENT ON COLUMN spp.extraction_jobs.result_cache_key IS 'Cache key for extraction_results table';

-- ============================================================================
-- TABLE: extraction_job_dlq (Dead Letter Queue)
-- ============================================================================

CREATE TABLE IF NOT EXISTS spp.extraction_job_dlq (
    dlq_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL,
    upload_id UUID NOT NULL,
    config JSONB NOT NULL,
    org_id UUID NOT NULL,
    retry_count INTEGER NOT NULL DEFAULT 0,
    error_code TEXT NOT NULL,
    error_message TEXT NOT NULL,
    error_details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reprocessed_at TIMESTAMPTZ,
    reprocessed_by UUID,
    reprocess_notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_extraction_dlq_created ON spp.extraction_job_dlq(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_extraction_dlq_job ON spp.extraction_job_dlq(job_id);
CREATE INDEX IF NOT EXISTS idx_extraction_dlq_error ON spp.extraction_job_dlq(error_code);
CREATE INDEX IF NOT EXISTS idx_extraction_dlq_reprocessed ON spp.extraction_job_dlq(reprocessed_at) WHERE reprocessed_at IS NULL;

COMMENT ON TABLE spp.extraction_job_dlq IS 'Dead letter queue for failed extraction jobs requiring manual intervention';
COMMENT ON COLUMN spp.extraction_job_dlq.retry_count IS 'Number of automatic retries before DLQ insertion';
COMMENT ON COLUMN spp.extraction_job_dlq.reprocessed_at IS 'When the failed job was manually reprocessed';

-- ============================================================================
-- TABLE: extraction_metrics
-- ============================================================================

CREATE TABLE IF NOT EXISTS spp.extraction_metrics (
    metric_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('completed', 'failed', 'cancelled')),
    duration_ms INTEGER NOT NULL,
    rows_processed INTEGER NOT NULL DEFAULT 0,
    error_code TEXT,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_extraction_metrics_created ON spp.extraction_metrics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_extraction_metrics_status ON spp.extraction_metrics(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_extraction_metrics_job ON spp.extraction_metrics(job_id);

COMMENT ON TABLE spp.extraction_metrics IS 'Time-series metrics for extraction pipeline monitoring';
COMMENT ON COLUMN spp.extraction_metrics.duration_ms IS 'Total extraction duration in milliseconds';
COMMENT ON COLUMN spp.extraction_metrics.rows_processed IS 'Number of rows successfully processed';

-- ============================================================================
-- TABLE: extraction_results (Cache)
-- ============================================================================

CREATE TABLE IF NOT EXISTS spp.extraction_results (
    job_id UUID PRIMARY KEY,
    products JSONB NOT NULL,
    summary JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours')
);

CREATE INDEX IF NOT EXISTS idx_extraction_results_expires ON spp.extraction_results(expires_at);

COMMENT ON TABLE spp.extraction_results IS 'Cached extraction results with 24-hour TTL';
COMMENT ON COLUMN spp.extraction_results.expires_at IS 'Automatic expiration timestamp (24 hours from creation)';

-- ============================================================================
-- TABLE: file_uploads
-- ============================================================================

CREATE TABLE IF NOT EXISTS spp.file_uploads (
    upload_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL,
    supplier_id UUID,
    filename TEXT NOT NULL,
    file_type TEXT NOT NULL CHECK (file_type IN ('csv', 'xlsx', 'xls', 'json', 'pdf')),
    file_size BIGINT NOT NULL,
    storage_path TEXT NOT NULL,
    mime_type TEXT,
    uploaded_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_file_uploads_org ON spp.file_uploads(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_file_uploads_supplier ON spp.file_uploads(supplier_id, created_at DESC);

COMMENT ON TABLE spp.file_uploads IS 'File upload tracking for pricelist extraction';
COMMENT ON COLUMN spp.file_uploads.storage_path IS 'Absolute file system path to uploaded file';

-- ============================================================================
-- FUNCTION: Cleanup expired extraction results
-- ============================================================================

CREATE OR REPLACE FUNCTION spp.cleanup_expired_extraction_results()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM spp.extraction_results
    WHERE expires_at < NOW();

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION spp.cleanup_expired_extraction_results IS 'Cleanup expired extraction results (run daily via cron)';

-- ============================================================================
-- FUNCTION: Get extraction metrics dashboard
-- ============================================================================

CREATE OR REPLACE FUNCTION spp.get_extraction_metrics_dashboard()
RETURNS TABLE (
    jobs_last_hour BIGINT,
    jobs_last_24h BIGINT,
    success_rate_24h NUMERIC(5,2),
    avg_duration_ms INTEGER,
    rows_processed_24h BIGINT,
    top_errors JSONB
) AS $$
BEGIN
    RETURN QUERY
    WITH metrics AS (
        SELECT
            COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 hour') AS jobs_1h,
            COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') AS jobs_24h,
            ROUND(
                100.0 * COUNT(*) FILTER (WHERE status = 'completed' AND created_at > NOW() - INTERVAL '24 hours') /
                NULLIF(COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours'), 0),
                2
            ) AS success_rate,
            ROUND(AVG(duration_ms) FILTER (WHERE status = 'completed' AND created_at > NOW() - INTERVAL '24 hours'))::INTEGER AS avg_duration,
            SUM(rows_processed) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') AS rows_total
        FROM spp.extraction_metrics
    ),
    errors AS (
        SELECT jsonb_agg(
            jsonb_build_object(
                'code', error_code,
                'count', error_count
            )
            ORDER BY error_count DESC
        ) AS top_errors
        FROM (
            SELECT error_code, COUNT(*) AS error_count
            FROM spp.extraction_metrics
            WHERE status = 'failed'
              AND created_at > NOW() - INTERVAL '24 hours'
              AND error_code IS NOT NULL
            GROUP BY error_code
            ORDER BY error_count DESC
            LIMIT 5
        ) e
    )
    SELECT
        m.jobs_1h,
        m.jobs_24h,
        COALESCE(m.success_rate, 0),
        COALESCE(m.avg_duration, 0),
        COALESCE(m.rows_total, 0),
        COALESCE(e.top_errors, '[]'::jsonb)
    FROM metrics m
    CROSS JOIN errors e;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION spp.get_extraction_metrics_dashboard IS 'Get extraction pipeline metrics for monitoring dashboard';

-- ============================================================================
-- FUNCTION: Reprocess DLQ job
-- ============================================================================

CREATE OR REPLACE FUNCTION spp.reprocess_dlq_job(
    p_dlq_id UUID,
    p_user_id UUID,
    p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_job_id UUID;
    v_upload_id UUID;
    v_config JSONB;
    v_org_id UUID;
    v_new_job_id UUID;
BEGIN
    -- Get DLQ entry
    SELECT job_id, upload_id, config, org_id
    INTO v_job_id, v_upload_id, v_config, v_org_id
    FROM spp.extraction_job_dlq
    WHERE dlq_id = p_dlq_id
      AND reprocessed_at IS NULL;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'DLQ entry % not found or already reprocessed', p_dlq_id;
    END IF;

    -- Create new extraction job
    INSERT INTO spp.extraction_jobs (upload_id, org_id, config, priority)
    VALUES (v_upload_id, v_org_id, v_config, 10) -- High priority for reprocessed jobs
    RETURNING job_id INTO v_new_job_id;

    -- Mark DLQ entry as reprocessed
    UPDATE spp.extraction_job_dlq
    SET reprocessed_at = NOW(),
        reprocessed_by = p_user_id,
        reprocess_notes = p_notes
    WHERE dlq_id = p_dlq_id;

    RETURN v_new_job_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION spp.reprocess_dlq_job IS 'Reprocess a failed job from the dead letter queue';

-- ============================================================================
-- GRANTS (adjust based on your role structure)
-- ============================================================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA spp TO authenticated;

-- Grant table permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA spp TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA spp TO authenticated;

-- Grant sequence permissions
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA spp TO authenticated;

COMMIT;

INSERT INTO schema_migrations (migration_name)
VALUES ('0209_extraction_infrastructure')
ON CONFLICT (migration_name) DO NOTHING;
