-- Migration: AI Database Tables
-- Created: 2025-11-04
-- Description: Create tables for AI query history, insights, anomalies, and predictions

-- AI Query History Table
CREATE TABLE IF NOT EXISTS ai_query_history (
    id BIGSERIAL PRIMARY KEY,
    user_query TEXT NOT NULL,
    generated_sql TEXT NOT NULL,
    result_count INTEGER NOT NULL DEFAULT 0,
    execution_time_ms INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI Insights Table
CREATE TABLE IF NOT EXISTS ai_insights (
    id BIGSERIAL PRIMARY KEY,
    analysis_type VARCHAR(100) NOT NULL,
    input_data JSONB NOT NULL,
    insights JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI Data Anomalies Table
CREATE TABLE IF NOT EXISTS ai_data_anomalies (
    id BIGSERIAL PRIMARY KEY,
    anomaly_type VARCHAR(100) NOT NULL,
    severity VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    affected_records INTEGER NOT NULL DEFAULT 0,
    detection_method VARCHAR(100) NOT NULL,
    suggested_fix TEXT,
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI Predictions Table
CREATE TABLE IF NOT EXISTS ai_predictions (
    id BIGSERIAL PRIMARY KEY,
    prediction_type VARCHAR(100) NOT NULL,
    target_id INTEGER,
    predictions JSONB NOT NULL,
    confidence DECIMAL(5,4) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_query_history_created_at ON ai_query_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_insights_analysis_type ON ai_insights(analysis_type);
CREATE INDEX IF NOT EXISTS idx_ai_insights_created_at ON ai_insights(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_anomalies_severity ON ai_data_anomalies(severity);
CREATE INDEX IF NOT EXISTS idx_ai_anomalies_detected_at ON ai_data_anomalies(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_predictions_type ON ai_predictions(prediction_type);
CREATE INDEX IF NOT EXISTS idx_ai_predictions_expires_at ON ai_predictions(expires_at);
CREATE INDEX IF NOT EXISTS idx_ai_predictions_target_id ON ai_predictions(target_id);

-- Comments for documentation
COMMENT ON TABLE ai_query_history IS 'Stores natural language queries converted to SQL with execution metrics';
COMMENT ON TABLE ai_insights IS 'Stores AI-generated insights and analysis results';
COMMENT ON TABLE ai_data_anomalies IS 'Stores detected data anomalies and quality issues';
COMMENT ON TABLE ai_predictions IS 'Stores AI predictions with confidence scores and expiration';
