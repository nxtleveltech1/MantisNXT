-- =====================================================
-- PRICING OPTIMIZATION PROGRESS TRACKING
-- =====================================================
-- Migration: 0017_pricing_optimization_progress.sql
-- Description: Adds progress tracking columns to optimization_runs table
-- Date: 2025-11-24

-- Add progress tracking columns
ALTER TABLE core.optimization_runs
ADD COLUMN IF NOT EXISTS progress_percent numeric(5,2) DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
ADD COLUMN IF NOT EXISTS current_step text,
ADD COLUMN IF NOT EXISTS products_processed integer DEFAULT 0;

-- Create index for progress queries
CREATE INDEX IF NOT EXISTS idx_optimization_runs_progress 
    ON core.optimization_runs(status, progress_percent) 
    WHERE status IN ('pending', 'running');

-- Add comment
COMMENT ON COLUMN core.optimization_runs.progress_percent IS 
    'Progress percentage (0-100) for optimization runs';
COMMENT ON COLUMN core.optimization_runs.current_step IS 
    'Current step description during optimization execution';
COMMENT ON COLUMN core.optimization_runs.products_processed IS 
    'Number of products processed so far';

