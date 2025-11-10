-- Migration: AI Categorization Tracking System
-- Description: Adds tracking columns for AI categorization status and job management tables
-- Date: 2025-11-09

-- =====================================================
-- PART 1: Add tracking columns to core.supplier_product
-- =====================================================

-- Add AI categorization tracking columns
ALTER TABLE core.supplier_product
ADD COLUMN IF NOT EXISTS ai_categorized_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS ai_categorization_status VARCHAR(20) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS ai_confidence DECIMAL(5,4),
ADD COLUMN IF NOT EXISTS ai_reasoning TEXT,
ADD COLUMN IF NOT EXISTS ai_provider VARCHAR(50),
ADD COLUMN IF NOT EXISTS previous_confidence DECIMAL(5,4);

-- Add constraint for valid status values
ALTER TABLE core.supplier_product
DROP CONSTRAINT IF EXISTS valid_ai_categorization_status;

ALTER TABLE core.supplier_product
ADD CONSTRAINT valid_ai_categorization_status 
CHECK (ai_categorization_status IN ('pending', 'processing', 'completed', 'failed', 'skipped'));

-- Add constraint for confidence range (0-1)
ALTER TABLE core.supplier_product
DROP CONSTRAINT IF EXISTS valid_ai_confidence;

ALTER TABLE core.supplier_product
ADD CONSTRAINT valid_ai_confidence 
CHECK (ai_confidence IS NULL OR (ai_confidence >= 0 AND ai_confidence <= 1));

ALTER TABLE core.supplier_product
DROP CONSTRAINT IF EXISTS valid_previous_confidence;

ALTER TABLE core.supplier_product
ADD CONSTRAINT valid_previous_confidence 
CHECK (previous_confidence IS NULL OR (previous_confidence >= 0 AND previous_confidence <= 1));

-- Create indexes for efficient filtering
CREATE INDEX IF NOT EXISTS idx_supplier_product_ai_status 
ON core.supplier_product(ai_categorization_status);

CREATE INDEX IF NOT EXISTS idx_supplier_product_ai_confidence 
ON core.supplier_product(ai_confidence) WHERE ai_confidence IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_supplier_product_supplier_ai_status 
ON core.supplier_product(supplier_id, ai_categorization_status);

CREATE INDEX IF NOT EXISTS idx_supplier_product_categorized_at 
ON core.supplier_product(ai_categorized_at) WHERE ai_categorized_at IS NOT NULL;

-- =====================================================
-- PART 2: Create job management tables
-- =====================================================

-- AI Categorization Job Table
CREATE TABLE IF NOT EXISTS core.ai_categorization_job (
    job_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_type VARCHAR(50) NOT NULL CHECK (job_type IN ('full_scan', 'partial', 'recategorize', 'import_triggered')),
    status VARCHAR(20) NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'paused', 'completed', 'failed', 'cancelled')),
    
    -- Progress tracking
    total_products INTEGER NOT NULL DEFAULT 0,
    processed_products INTEGER NOT NULL DEFAULT 0,
    successful_categorizations INTEGER NOT NULL DEFAULT 0,
    failed_categorizations INTEGER NOT NULL DEFAULT 0,
    skipped_products INTEGER NOT NULL DEFAULT 0,
    current_batch_offset INTEGER NOT NULL DEFAULT 0,
    batch_size INTEGER NOT NULL DEFAULT 200,
    
    -- Configuration
    filters JSONB DEFAULT '{}',
    config JSONB DEFAULT '{}',
    
    -- Metadata
    created_by VARCHAR(255) NOT NULL DEFAULT 'system',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    paused_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    last_activity_at TIMESTAMPTZ,
    
    -- Error tracking
    error_message TEXT,
    error_count INTEGER NOT NULL DEFAULT 0,
    
    -- Performance metrics
    total_duration_ms BIGINT,
    avg_batch_duration_ms BIGINT,
    total_tokens_used INTEGER DEFAULT 0,
    
    CONSTRAINT positive_counts CHECK (
        total_products >= 0 AND
        processed_products >= 0 AND
        successful_categorizations >= 0 AND
        failed_categorizations >= 0 AND
        skipped_products >= 0
    ),
    CONSTRAINT valid_offset CHECK (current_batch_offset >= 0),
    CONSTRAINT valid_batch_size CHECK (batch_size > 0 AND batch_size <= 1000)
);

-- Job table indexes
CREATE INDEX IF NOT EXISTS idx_ai_categorization_job_status 
ON core.ai_categorization_job(status);

CREATE INDEX IF NOT EXISTS idx_ai_categorization_job_created_at 
ON core.ai_categorization_job(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_categorization_job_type_status 
ON core.ai_categorization_job(job_type, status);

CREATE INDEX IF NOT EXISTS idx_ai_categorization_job_created_by 
ON core.ai_categorization_job(created_by);

-- AI Categorization Progress Table (for real-time batch tracking)
CREATE TABLE IF NOT EXISTS core.ai_categorization_progress (
    progress_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES core.ai_categorization_job(job_id) ON DELETE CASCADE,
    batch_number INTEGER NOT NULL,
    batch_offset INTEGER NOT NULL,
    batch_size INTEGER NOT NULL,
    
    -- Batch metrics
    products_in_batch INTEGER NOT NULL,
    successful_count INTEGER NOT NULL DEFAULT 0,
    failed_count INTEGER NOT NULL DEFAULT 0,
    skipped_count INTEGER NOT NULL DEFAULT 0,
    
    -- Performance
    duration_ms BIGINT,
    tokens_used INTEGER,
    provider_used VARCHAR(50),
    
    -- Timestamps
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    
    -- Error tracking
    error_message TEXT,
    
    CONSTRAINT unique_job_batch UNIQUE(job_id, batch_number),
    CONSTRAINT positive_batch_counts CHECK (
        batch_number >= 0 AND
        batch_offset >= 0 AND
        batch_size > 0 AND
        products_in_batch >= 0 AND
        successful_count >= 0 AND
        failed_count >= 0 AND
        skipped_count >= 0
    )
);

-- Progress table indexes
CREATE INDEX IF NOT EXISTS idx_ai_categorization_progress_job 
ON core.ai_categorization_progress(job_id, batch_number);

CREATE INDEX IF NOT EXISTS idx_ai_categorization_progress_completed 
ON core.ai_categorization_progress(completed_at) WHERE completed_at IS NOT NULL;

-- =====================================================
-- PART 3: Create helper functions
-- =====================================================

-- Function to calculate job ETA
CREATE OR REPLACE FUNCTION core.calculate_job_eta(p_job_id UUID)
RETURNS INTERVAL AS $$
DECLARE
    v_processed INTEGER;
    v_total INTEGER;
    v_avg_duration_ms BIGINT;
    v_remaining INTEGER;
    v_eta_ms BIGINT;
BEGIN
    SELECT 
        processed_products,
        total_products,
        avg_batch_duration_ms
    INTO v_processed, v_total, v_avg_duration_ms
    FROM core.ai_categorization_job
    WHERE job_id = p_job_id;
    
    IF v_processed = 0 OR v_avg_duration_ms IS NULL THEN
        RETURN NULL;
    END IF;
    
    v_remaining := v_total - v_processed;
    v_eta_ms := (v_remaining * v_avg_duration_ms) / NULLIF(v_processed, 0);
    
    RETURN make_interval(secs => v_eta_ms / 1000.0);
END;
$$ LANGUAGE plpgsql;

-- Function to get job summary
CREATE OR REPLACE FUNCTION core.get_job_summary(p_job_id UUID)
RETURNS TABLE (
    job_id UUID,
    job_type VARCHAR,
    status VARCHAR,
    progress_percentage DECIMAL,
    total_products INTEGER,
    processed_products INTEGER,
    successful_categorizations INTEGER,
    failed_categorizations INTEGER,
    eta INTERVAL,
    created_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        j.job_id,
        j.job_type,
        j.status,
        CASE 
            WHEN j.total_products > 0 
            THEN ROUND((j.processed_products::DECIMAL / j.total_products::DECIMAL) * 100, 2)
            ELSE 0
        END as progress_percentage,
        j.total_products,
        j.processed_products,
        j.successful_categorizations,
        j.failed_categorizations,
        core.calculate_job_eta(j.job_id) as eta,
        j.created_at,
        j.completed_at
    FROM core.ai_categorization_job j
    WHERE j.job_id = p_job_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PART 4: Create triggers for automatic updates
-- =====================================================

-- Trigger to update last_activity_at on job updates
CREATE OR REPLACE FUNCTION core.update_job_last_activity()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_activity_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_job_last_activity ON core.ai_categorization_job;

CREATE TRIGGER trg_update_job_last_activity
    BEFORE UPDATE ON core.ai_categorization_job
    FOR EACH ROW
    EXECUTE FUNCTION core.update_job_last_activity();

-- Trigger to update supplier_product updated_at on categorization
CREATE OR REPLACE FUNCTION core.update_product_on_categorization()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.ai_categorization_status IS DISTINCT FROM OLD.ai_categorization_status 
       OR NEW.category_id IS DISTINCT FROM OLD.category_id THEN
        NEW.updated_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_product_on_categorization ON core.supplier_product;

CREATE TRIGGER trg_update_product_on_categorization
    BEFORE UPDATE ON core.supplier_product
    FOR EACH ROW
    EXECUTE FUNCTION core.update_product_on_categorization();

-- =====================================================
-- PART 5: Insert initial data / cleanup
-- =====================================================

-- Update existing products to have 'pending' status if they don't have a category
UPDATE core.supplier_product
SET ai_categorization_status = 'pending'
WHERE category_id IS NULL 
  AND ai_categorization_status IS NULL;

-- Update existing products with categories to 'completed' (but no confidence)
UPDATE core.supplier_product
SET ai_categorization_status = 'completed'
WHERE category_id IS NOT NULL 
  AND ai_categorization_status IS NULL;

-- =====================================================
-- PART 6: Grant permissions (if using role-based access)
-- =====================================================

-- Grant appropriate permissions (adjust roles as needed)
-- GRANT SELECT, INSERT, UPDATE ON core.ai_categorization_job TO app_user;
-- GRANT SELECT, INSERT, UPDATE ON core.ai_categorization_progress TO app_user;
-- GRANT SELECT, UPDATE ON core.supplier_product TO app_user;

-- =====================================================
-- Migration complete
-- =====================================================

COMMENT ON TABLE core.ai_categorization_job IS 'Manages AI categorization background jobs with resumability';
COMMENT ON TABLE core.ai_categorization_progress IS 'Tracks individual batch progress for real-time monitoring';
COMMENT ON COLUMN core.supplier_product.ai_categorization_status IS 'Current AI categorization status: pending, processing, completed, failed, skipped';
COMMENT ON COLUMN core.supplier_product.ai_confidence IS 'AI confidence score (0-1) for the categorization';
COMMENT ON COLUMN core.supplier_product.previous_confidence IS 'Previous confidence before re-categorization';

