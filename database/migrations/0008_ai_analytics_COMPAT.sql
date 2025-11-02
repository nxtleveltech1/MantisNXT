-- ============================================================================
-- AI SERVICES & ANALYTICS SYSTEM MIGRATION - COMPATIBILITY VERSION
-- ============================================================================
-- Production-ready AI services and comprehensive analytics infrastructure
-- Compatible with current schema (no organization/users/products tables)
--
-- Features:
-- - AI service configuration and predictions
-- - Demand forecasting with accuracy tracking
-- - Anomaly detection and alerting
-- - Conversation/chatbot support
-- - Analytics dashboards and widgets
-- - Real-time metric calculations
--
-- Version: 0008-COMPAT
-- Created: 2025-11-02
-- ============================================================================

BEGIN;

-- ============================================================================
-- ENUMS
-- ============================================================================

-- AI Service Types
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ai_service_type') THEN
        CREATE TYPE ai_service_type AS ENUM (
          'demand_forecasting',
          'supplier_scoring',
          'anomaly_detection',
          'sentiment_analysis',
          'recommendation_engine',
          'chatbot',
          'document_analysis'
        );
    END IF;
END $$;

-- Analytics Metric Types
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'analytics_metric_type') THEN
        CREATE TYPE analytics_metric_type AS ENUM (
          'sales',
          'inventory',
          'supplier_performance',
          'customer_behavior',
          'financial',
          'operational'
        );
    END IF;
END $$;

-- Forecast Horizons
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'forecast_horizon') THEN
        CREATE TYPE forecast_horizon AS ENUM (
          'daily',
          'weekly',
          'monthly',
          'quarterly',
          'yearly'
        );
    END IF;
END $$;

-- Alert Severity Levels
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'alert_severity') THEN
        CREATE TYPE alert_severity AS ENUM (
          'info',
          'warning',
          'critical',
          'urgent'
        );
    END IF;
END $$;

-- AI Providers
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ai_provider') THEN
        CREATE TYPE ai_provider AS ENUM (
          'openai',
          'anthropic',
          'azure_openai',
          'bedrock'
        );
    END IF;
END $$;

-- ============================================================================
-- AI SERVICE CONFIGURATION
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_service_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID,  -- Application-managed, no FK
  service_type ai_service_type NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  provider ai_provider NOT NULL DEFAULT 'openai',
  model_name VARCHAR(100) NOT NULL,
  api_endpoint TEXT,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  rate_limit_per_hour INTEGER NOT NULL DEFAULT 1000,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by UUID,  -- Application-managed, no FK
  updated_by UUID,  -- Application-managed, no FK

  CONSTRAINT unique_org_service UNIQUE (org_id, service_type)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_service_config_org ON ai_service_config(org_id);
CREATE INDEX IF NOT EXISTS idx_ai_service_config_type ON ai_service_config(service_type) WHERE is_enabled = true;

-- ============================================================================
-- AI PREDICTIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_prediction (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID,  -- Application-managed, no FK
  service_type ai_service_type NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  prediction_data JSONB NOT NULL,
  confidence_score DECIMAL(5, 4) NOT NULL,
  accuracy_score DECIMAL(5, 4),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  feedback_received BOOLEAN NOT NULL DEFAULT false,
  actual_outcome JSONB,
  metadata JSONB DEFAULT '{}'::jsonb,

  CONSTRAINT check_confidence_range CHECK (confidence_score >= 0 AND confidence_score <= 1),
  CONSTRAINT check_accuracy_range CHECK (accuracy_score IS NULL OR (accuracy_score >= 0 AND accuracy_score <= 1))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_prediction_org ON ai_prediction(org_id);
CREATE INDEX IF NOT EXISTS idx_ai_prediction_entity ON ai_prediction(entity_type, entity_id);
-- Removed partial index with NOW() predicate - incompatible with PostgreSQL 17 strict immutability
CREATE INDEX IF NOT EXISTS idx_ai_prediction_expires ON ai_prediction(expires_at);
CREATE INDEX IF NOT EXISTS idx_ai_prediction_service_type ON ai_prediction(service_type);
CREATE INDEX IF NOT EXISTS idx_ai_prediction_confidence ON ai_prediction(confidence_score DESC);
CREATE INDEX IF NOT EXISTS idx_ai_prediction_data ON ai_prediction USING GIN (prediction_data);

-- ============================================================================
-- DEMAND FORECASTING
-- ============================================================================

-- Note: products exists as a VIEW, not a table, so we cannot create FK constraint
-- Create demand_forecast without FK to products
CREATE TABLE IF NOT EXISTS demand_forecast (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID,  -- Application-managed, no FK
  product_id UUID NOT NULL,  -- No FK constraint - products is a view
  forecast_date DATE NOT NULL,
  forecast_horizon forecast_horizon NOT NULL,
  predicted_quantity DECIMAL(12, 2) NOT NULL,
  lower_bound DECIMAL(12, 2) NOT NULL,
  upper_bound DECIMAL(12, 2) NOT NULL,
  confidence_interval DECIMAL(5, 4) NOT NULL DEFAULT 0.95,
  algorithm_used VARCHAR(50) NOT NULL,
  actual_quantity DECIMAL(12, 2),
  accuracy_score DECIMAL(5, 4),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_forecast UNIQUE (org_id, product_id, forecast_date, forecast_horizon),
  CONSTRAINT check_bounds CHECK (lower_bound <= predicted_quantity AND predicted_quantity <= upper_bound)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_demand_forecast_org ON demand_forecast(org_id);
CREATE INDEX IF NOT EXISTS idx_demand_forecast_product ON demand_forecast(product_id);
CREATE INDEX IF NOT EXISTS idx_demand_forecast_date ON demand_forecast(forecast_date);
CREATE INDEX IF NOT EXISTS idx_demand_forecast_horizon ON demand_forecast(forecast_horizon);
CREATE INDEX IF NOT EXISTS idx_demand_forecast_accuracy ON demand_forecast(accuracy_score DESC) WHERE accuracy_score IS NOT NULL;

-- ============================================================================
-- ANALYTICS DASHBOARDS
-- ============================================================================

-- Create stub users table if needed
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS analytics_dashboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID,  -- Application-managed, no FK
  name VARCHAR(255) NOT NULL,
  description TEXT,
  layout JSONB NOT NULL DEFAULT '[]'::jsonb,
  filters JSONB DEFAULT '{}'::jsonb,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_shared BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_org_dashboard_name UNIQUE (org_id, name)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_analytics_dashboard_org ON analytics_dashboard(org_id);
CREATE INDEX IF NOT EXISTS idx_analytics_dashboard_creator ON analytics_dashboard(created_by);
CREATE INDEX IF NOT EXISTS idx_analytics_dashboard_default ON analytics_dashboard(org_id) WHERE is_default = true;

-- ============================================================================
-- ANALYTICS WIDGETS
-- ============================================================================

CREATE TABLE IF NOT EXISTS analytics_widget (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID,  -- Application-managed, no FK
  dashboard_id UUID NOT NULL REFERENCES analytics_dashboard(id) ON DELETE CASCADE,
  widget_type VARCHAR(50) NOT NULL,
  metric_type analytics_metric_type NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  query JSONB NOT NULL DEFAULT '{}'::jsonb,
  refresh_interval_seconds INTEGER NOT NULL DEFAULT 300,
  position_x INTEGER NOT NULL DEFAULT 0,
  position_y INTEGER NOT NULL DEFAULT 0,
  width INTEGER NOT NULL DEFAULT 1,
  height INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  CONSTRAINT check_refresh_interval CHECK (refresh_interval_seconds >= 0)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_analytics_widget_org ON analytics_widget(org_id);
CREATE INDEX IF NOT EXISTS idx_analytics_widget_dashboard ON analytics_widget(dashboard_id);
CREATE INDEX IF NOT EXISTS idx_analytics_widget_type ON analytics_widget(metric_type);
CREATE INDEX IF NOT EXISTS idx_analytics_widget_config ON analytics_widget USING GIN (config);
CREATE INDEX IF NOT EXISTS idx_analytics_widget_query ON analytics_widget USING GIN (query);

-- ============================================================================
-- AI ALERTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_alert (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID,  -- Application-managed, no FK
  service_type ai_service_type NOT NULL,
  severity alert_severity NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  recommendations JSONB DEFAULT '[]'::jsonb,
  entity_type VARCHAR(50),
  entity_id UUID,
  is_acknowledged BOOLEAN NOT NULL DEFAULT false,
  acknowledged_by UUID,  -- Application-managed, no FK
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_alert_org ON ai_alert(org_id);
CREATE INDEX IF NOT EXISTS idx_ai_alert_severity ON ai_alert(severity);
CREATE INDEX IF NOT EXISTS idx_ai_alert_unresolved ON ai_alert(org_id, is_resolved) WHERE is_resolved = false;
CREATE INDEX IF NOT EXISTS idx_ai_alert_created ON ai_alert(created_at DESC);

-- ============================================================================
-- AI CONVERSATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_conversation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID,  -- Application-managed, no FK
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  conversation_id VARCHAR(50) NOT NULL,
  role VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  context JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  CONSTRAINT check_role CHECK (role IN ('user', 'assistant', 'system'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_conversation_org ON ai_conversation(org_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversation_user ON ai_conversation(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversation_id ON ai_conversation(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversation_created ON ai_conversation(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_conversation_context ON ai_conversation USING GIN (context);

-- ============================================================================
-- ANALYTICS METRIC CACHE
-- ============================================================================

CREATE TABLE IF NOT EXISTS analytics_metric_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID,  -- Application-managed, no FK
  metric_type analytics_metric_type NOT NULL,
  metric_key VARCHAR(255) NOT NULL,
  metric_value JSONB NOT NULL,
  time_period VARCHAR(50) NOT NULL,
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_metric_cache UNIQUE (org_id, metric_type, metric_key, period_start)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_metric_cache_org ON analytics_metric_cache(org_id);
CREATE INDEX IF NOT EXISTS idx_metric_cache_type ON analytics_metric_cache(metric_type);
CREATE INDEX IF NOT EXISTS idx_metric_cache_period ON analytics_metric_cache(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_metric_cache_calculated ON analytics_metric_cache(calculated_at DESC);
CREATE INDEX IF NOT EXISTS idx_metric_cache_value ON analytics_metric_cache USING GIN (metric_value);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update timestamp triggers (using existing function)
DROP TRIGGER IF EXISTS ai_service_config_updated_at ON ai_service_config;
CREATE TRIGGER ai_service_config_updated_at
  BEFORE UPDATE ON ai_service_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS analytics_dashboard_updated_at ON analytics_dashboard;
CREATE TRIGGER analytics_dashboard_updated_at
  BEFORE UPDATE ON analytics_dashboard
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS analytics_widget_updated_at ON analytics_widget;
CREATE TRIGGER analytics_widget_updated_at
  BEFORE UPDATE ON analytics_widget
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Calculate forecast accuracy
CREATE OR REPLACE FUNCTION calculate_forecast_accuracy()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.actual_quantity IS NOT NULL AND OLD.actual_quantity IS NULL THEN
    NEW.accuracy_score = 1 - ABS(NEW.predicted_quantity - NEW.actual_quantity) / NULLIF(NEW.actual_quantity, 0);
    NEW.accuracy_score = GREATEST(0, LEAST(1, NEW.accuracy_score));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS demand_forecast_accuracy ON demand_forecast;
CREATE TRIGGER demand_forecast_accuracy
  BEFORE UPDATE ON demand_forecast
  FOR EACH ROW
  EXECUTE FUNCTION calculate_forecast_accuracy();

-- Clean expired predictions
CREATE OR REPLACE FUNCTION cleanup_expired_predictions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM ai_prediction
  WHERE expires_at < NOW() - INTERVAL '30 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Get AI service health
CREATE OR REPLACE FUNCTION get_ai_service_health(p_org_id UUID)
RETURNS TABLE(
  service_type ai_service_type,
  is_enabled BOOLEAN,
  total_predictions BIGINT,
  avg_confidence DECIMAL,
  active_alerts BIGINT,
  last_prediction TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sc.service_type,
    sc.is_enabled,
    COUNT(DISTINCT p.id) as total_predictions,
    AVG(p.confidence_score) as avg_confidence,
    COUNT(DISTINCT a.id) FILTER (WHERE a.is_resolved = false) as active_alerts,
    MAX(p.created_at) as last_prediction
  FROM ai_service_config sc
  LEFT JOIN ai_prediction p ON p.service_type = sc.service_type AND p.org_id = sc.org_id
  LEFT JOIN ai_alert a ON a.service_type = sc.service_type AND a.org_id = sc.org_id
  WHERE sc.org_id = p_org_id
  GROUP BY sc.service_type, sc.is_enabled;
END;
$$ LANGUAGE plpgsql;

-- Get forecast accuracy metrics
CREATE OR REPLACE FUNCTION get_forecast_accuracy_metrics(p_org_id UUID, p_days INTEGER DEFAULT 30)
RETURNS TABLE(
  forecast_horizon forecast_horizon,
  total_forecasts BIGINT,
  avg_accuracy DECIMAL,
  median_accuracy DECIMAL,
  forecasts_with_actuals BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    df.forecast_horizon,
    COUNT(*) as total_forecasts,
    AVG(df.accuracy_score) as avg_accuracy,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY df.accuracy_score) as median_accuracy,
    COUNT(*) FILTER (WHERE df.actual_quantity IS NOT NULL) as forecasts_with_actuals
  FROM demand_forecast df
  WHERE df.org_id = p_org_id
    AND df.created_at >= NOW() - (p_days || ' days')::INTERVAL
  GROUP BY df.forecast_horizon;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VIEWS
-- ============================================================================

-- Active AI Alerts Summary
DROP VIEW IF EXISTS v_active_ai_alerts CASCADE;
CREATE VIEW v_active_ai_alerts AS
SELECT
  a.org_id,
  a.service_type,
  a.severity,
  COUNT(*) as alert_count,
  MAX(a.created_at) as latest_alert,
  MIN(a.created_at) as earliest_alert
FROM ai_alert a
WHERE a.is_resolved = false
GROUP BY a.org_id, a.service_type, a.severity;

-- Forecast Performance Summary (simplified - products is a view, not a table)
DROP VIEW IF EXISTS v_forecast_performance CASCADE;
CREATE VIEW v_forecast_performance AS
SELECT
  df.org_id,
  df.product_id,
  df.forecast_horizon,
  COUNT(*) as total_forecasts,
  AVG(df.accuracy_score) as avg_accuracy,
  STDDEV(df.accuracy_score) as accuracy_stddev,
  COUNT(*) FILTER (WHERE df.accuracy_score >= 0.8) as high_accuracy_count
FROM demand_forecast df
WHERE df.accuracy_score IS NOT NULL
GROUP BY df.org_id, df.product_id, df.forecast_horizon;

-- Dashboard Widget Summary
DROP VIEW IF EXISTS v_dashboard_widgets CASCADE;
CREATE VIEW v_dashboard_widgets AS
SELECT
  d.org_id,
  d.id as dashboard_id,
  d.name as dashboard_name,
  COUNT(w.id) as widget_count,
  array_agg(DISTINCT w.widget_type) as widget_types,
  array_agg(DISTINCT w.metric_type) as metric_types
FROM analytics_dashboard d
LEFT JOIN analytics_widget w ON w.dashboard_id = d.id
GROUP BY d.org_id, d.id, d.name;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE ai_service_config IS 'Configuration for AI services per organization';
COMMENT ON TABLE ai_prediction IS 'AI predictions with confidence tracking';
COMMENT ON TABLE demand_forecast IS 'Demand forecasting with accuracy validation';
COMMENT ON TABLE analytics_dashboard IS 'User-defined analytics dashboards';
COMMENT ON TABLE analytics_widget IS 'Dashboard widgets with metric calculations';
COMMENT ON TABLE ai_alert IS 'AI-generated alerts and recommendations';
COMMENT ON TABLE ai_conversation IS 'Chatbot conversation history';
COMMENT ON TABLE analytics_metric_cache IS 'Pre-calculated metrics for performance';

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT 'AI Analytics migration completed successfully' AS status;

-- Check all tables created
SELECT COUNT(*) as ai_tables_count
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'ai_service_config',
    'ai_prediction',
    'demand_forecast',
    'analytics_dashboard',
    'analytics_widget',
    'ai_alert',
    'ai_conversation',
    'analytics_metric_cache'
  );

-- Check all enums created
SELECT COUNT(*) as ai_enums_count
FROM pg_type
WHERE typname IN (
  'ai_service_type',
  'analytics_metric_type',
  'forecast_horizon',
  'alert_severity',
  'ai_provider'
);

-- Check functions created
SELECT COUNT(*) as ai_functions_count
FROM pg_proc
WHERE proname IN (
  'calculate_forecast_accuracy',
  'cleanup_expired_predictions',
  'get_ai_service_health',
  'get_forecast_accuracy_metrics'
);

-- Check views created
SELECT COUNT(*) as ai_views_count
FROM pg_views
WHERE schemaname = 'public'
AND viewname IN ('v_active_ai_alerts', 'v_forecast_performance', 'v_dashboard_widgets');
