-- ============================================================================
-- AI Database Integration Schema
-- ============================================================================
-- This migration adds tables to support AI-powered database operations:
-- - Query history tracking
-- - Analysis results storage
-- - Prediction caching
--
-- Author: Data Oracle
-- Created: 2025-10-01
-- ============================================================================

BEGIN;

-- ============================================================================
-- AI Query History Table
-- ============================================================================
-- Tracks all natural language queries converted to SQL

CREATE TABLE IF NOT EXISTS ai_query_history (
  id SERIAL PRIMARY KEY,
  user_query TEXT NOT NULL,
  generated_sql TEXT,
  result_count INTEGER,
  execution_time_ms INTEGER,
  safety_score DECIMAL(3, 2),
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for query history
CREATE INDEX idx_ai_query_history_created_at ON ai_query_history(created_at DESC);
CREATE INDEX idx_ai_query_history_success ON ai_query_history(success);
CREATE INDEX idx_ai_query_history_execution_time ON ai_query_history(execution_time_ms);

-- ============================================================================
-- AI Analysis Results Table
-- ============================================================================
-- Stores results from AI data analysis

CREATE TABLE IF NOT EXISTS ai_analysis_results (
  id SERIAL PRIMARY KEY,
  analysis_type VARCHAR(50) NOT NULL,
  input_data JSONB NOT NULL,
  insights JSONB NOT NULL,
  data_quality_score DECIMAL(3, 2),
  total_insights INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for analysis results
CREATE INDEX idx_ai_analysis_type ON ai_analysis_results(analysis_type);
CREATE INDEX idx_ai_analysis_created_at ON ai_analysis_results(created_at DESC);
CREATE INDEX idx_ai_analysis_quality ON ai_analysis_results(data_quality_score DESC);

-- GIN index for JSONB insights search
CREATE INDEX idx_ai_analysis_insights ON ai_analysis_results USING GIN (insights);

-- ============================================================================
-- AI Predictions Cache Table
-- ============================================================================
-- Caches AI-generated predictions with expiration

CREATE TABLE IF NOT EXISTS ai_predictions_cache (
  id SERIAL PRIMARY KEY,
  prediction_type VARCHAR(50) NOT NULL,
  target_id INTEGER,
  predictions JSONB NOT NULL,
  confidence DECIMAL(3, 2) NOT NULL,
  forecast_days INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  accessed_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMP,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for predictions cache
CREATE INDEX idx_ai_predictions_type_target ON ai_predictions_cache(prediction_type, target_id);
CREATE INDEX idx_ai_predictions_expires_at ON ai_predictions_cache(expires_at);
CREATE INDEX idx_ai_predictions_created_at ON ai_predictions_cache(created_at DESC);
CREATE INDEX idx_ai_predictions_confidence ON ai_predictions_cache(confidence DESC);

-- GIN index for JSONB predictions search
CREATE INDEX idx_ai_predictions_data ON ai_predictions_cache USING GIN (predictions);

-- ============================================================================
-- AI Data Anomalies Table (separate from existing ai_anomalies)
-- ============================================================================
-- New table for data quality anomalies detected by AI

CREATE TABLE IF NOT EXISTS ai_data_anomalies (
  id SERIAL PRIMARY KEY,
  anomaly_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  affected_records INTEGER,
  detection_method TEXT,
  suggested_fix TEXT,
  sql_to_fix TEXT,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP,
  resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  detected_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for data anomalies
CREATE INDEX idx_ai_data_anomalies_severity ON ai_data_anomalies(severity);
CREATE INDEX idx_ai_data_anomalies_resolved ON ai_data_anomalies(resolved);
CREATE INDEX idx_ai_data_anomalies_type ON ai_data_anomalies(anomaly_type);
CREATE INDEX idx_ai_data_anomalies_detected_at ON ai_data_anomalies(detected_at DESC);

-- Note: ai_insights table already exists with different schema
-- We'll use it as-is for compatibility

-- ============================================================================
-- AI Performance Metrics Table
-- ============================================================================
-- Tracks AI service performance and usage

CREATE TABLE IF NOT EXISTS ai_performance_metrics (
  id SERIAL PRIMARY KEY,
  operation_type VARCHAR(50) NOT NULL,
  execution_time_ms INTEGER NOT NULL,
  tokens_used INTEGER,
  model_used VARCHAR(50),
  success BOOLEAN DEFAULT true,
  error_type VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance metrics
CREATE INDEX idx_ai_perf_operation ON ai_performance_metrics(operation_type);
CREATE INDEX idx_ai_perf_created_at ON ai_performance_metrics(created_at DESC);
CREATE INDEX idx_ai_perf_success ON ai_performance_metrics(success);

-- Partitioning by month for performance metrics (optional for high volume)
-- CREATE TABLE ai_performance_metrics_2025_10 PARTITION OF ai_performance_metrics
-- FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');

-- ============================================================================
-- VIEWS FOR AI ANALYTICS
-- ============================================================================

-- View: Query Performance Summary
CREATE OR REPLACE VIEW v_ai_query_performance AS
SELECT
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as total_queries,
  AVG(execution_time_ms) as avg_execution_time,
  MAX(execution_time_ms) as max_execution_time,
  AVG(result_count) as avg_results,
  SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful_queries,
  ROUND(AVG(safety_score), 2) as avg_safety_score
FROM ai_query_history
GROUP BY DATE_TRUNC('hour', created_at)
ORDER BY hour DESC;

-- View: Anomaly Summary by Type
CREATE OR REPLACE VIEW v_ai_data_anomaly_summary AS
SELECT
  anomaly_type as type,
  severity,
  COUNT(*) as total_count,
  SUM(CASE WHEN resolved THEN 1 ELSE 0 END) as resolved_count,
  SUM(affected_records) as total_affected_records,
  MIN(detected_at) as first_detected,
  MAX(detected_at) as last_detected
FROM ai_data_anomalies
GROUP BY anomaly_type, severity
ORDER BY
  CASE severity
    WHEN 'critical' THEN 1
    WHEN 'high' THEN 2
    WHEN 'medium' THEN 3
    ELSE 4
  END,
  total_count DESC;

-- View: Prediction Cache Stats
CREATE OR REPLACE VIEW v_ai_prediction_stats AS
SELECT
  prediction_type,
  COUNT(*) as total_predictions,
  AVG(confidence) as avg_confidence,
  AVG(accessed_count) as avg_access_count,
  COUNT(CASE WHEN expires_at > NOW() THEN 1 END) as active_predictions,
  COUNT(CASE WHEN expires_at <= NOW() THEN 1 END) as expired_predictions
FROM ai_predictions_cache
GROUP BY prediction_type
ORDER BY total_predictions DESC;

-- View: AI Analysis Dashboard
CREATE OR REPLACE VIEW v_ai_analysis_dashboard AS
SELECT
  analysis_type,
  COUNT(*) as total_analyses,
  AVG(data_quality_score) as avg_quality_score,
  SUM(total_insights) as total_insights_generated,
  MAX(created_at) as latest_analysis
FROM ai_analysis_results
GROUP BY analysis_type
ORDER BY total_analyses DESC;

-- ============================================================================
-- FUNCTIONS FOR AI OPERATIONS
-- ============================================================================

-- Function: Clean expired predictions
CREATE OR REPLACE FUNCTION cleanup_expired_predictions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM ai_predictions_cache
  WHERE expires_at < NOW() - INTERVAL '7 days'
    AND accessed_count < 5;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function: Get AI service health score
CREATE OR REPLACE FUNCTION get_ai_health_score()
RETURNS TABLE(
  overall_score DECIMAL,
  query_success_rate DECIMAL,
  avg_execution_time INTEGER,
  active_anomalies INTEGER,
  unresolved_critical_anomalies INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH recent_queries AS (
    SELECT
      AVG(CASE WHEN success THEN 1.0 ELSE 0.0 END) as success_rate,
      AVG(execution_time_ms) as avg_time
    FROM ai_query_history
    WHERE created_at > NOW() - INTERVAL '24 hours'
  ),
  recent_anomalies AS (
    SELECT
      COUNT(*) as total_anomalies,
      SUM(CASE WHEN severity = 'critical' AND NOT resolved THEN 1 ELSE 0 END) as critical_unresolved
    FROM ai_data_anomalies
    WHERE detected_at > NOW() - INTERVAL '24 hours'
  )
  SELECT
    ROUND((rq.success_rate * 0.4 +
           (1 - LEAST(rq.avg_time / 10000.0, 1.0)) * 0.3 +
           (1 - LEAST(ra.total_anomalies / 100.0, 1.0)) * 0.3)::NUMERIC, 2) as overall_score,
    ROUND(rq.success_rate::NUMERIC, 2) as query_success_rate,
    ROUND(rq.avg_time)::INTEGER as avg_execution_time,
    ra.total_anomalies::INTEGER as active_anomalies,
    ra.critical_unresolved::INTEGER as unresolved_critical_anomalies
  FROM recent_queries rq
  CROSS JOIN recent_anomalies ra;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger: Update prediction access count
CREATE OR REPLACE FUNCTION update_prediction_access()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE ai_predictions_cache
  SET accessed_count = accessed_count + 1,
      last_accessed_at = NOW()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: Application should call this when accessing predictions

-- ============================================================================
-- GRANTS AND PERMISSIONS
-- ============================================================================

-- Grant access to application role (adjust as needed)
-- GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO app_user;
-- GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO app_user;
-- GRANT SELECT ON ALL VIEWS IN SCHEMA public TO app_user;

-- ============================================================================
-- DATA QUALITY CONSTRAINTS
-- ============================================================================

-- Ensure confidence scores are valid
ALTER TABLE ai_predictions_cache
  ADD CONSTRAINT check_confidence_range
  CHECK (confidence >= 0 AND confidence <= 1);

-- Ensure safety scores are valid
ALTER TABLE ai_query_history
  ADD CONSTRAINT check_safety_score_range
  CHECK (safety_score IS NULL OR (safety_score >= 0 AND safety_score <= 1));

-- Ensure severity is valid for data anomalies
ALTER TABLE ai_data_anomalies
  ADD CONSTRAINT check_severity_values
  CHECK (severity IN ('low', 'medium', 'high', 'critical'));

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify tables created
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE 'ai_%'
ORDER BY table_name;

-- Verify views created
SELECT table_name
FROM information_schema.views
WHERE table_schema = 'public'
  AND table_name LIKE 'v_ai_%'
ORDER BY table_name;

-- Test health score function
SELECT * FROM get_ai_health_score();
