-- ============================================================================
-- AI Services & Analytics System Migration
-- ============================================================================
-- Production-ready AI services and comprehensive analytics infrastructure
--
-- Features:
-- - AI service configuration and predictions
-- - Demand forecasting with accuracy tracking
-- - Anomaly detection and alerting
-- - Conversation/chatbot support
-- - Analytics dashboards and widgets
-- - Real-time metric calculations
--
-- Version: 0008
-- Author: Backend Architect
-- Created: 2025-11-02
-- ============================================================================

BEGIN;

-- ============================================================================
-- ENUMS
-- ============================================================================

-- AI Service Types
CREATE TYPE ai_service_type AS ENUM (
  'demand_forecasting',
  'supplier_scoring',
  'anomaly_detection',
  'sentiment_analysis',
  'recommendation_engine',
  'chatbot',
  'document_analysis'
);

-- Analytics Metric Types
CREATE TYPE analytics_metric_type AS ENUM (
  'sales',
  'inventory',
  'supplier_performance',
  'customer_behavior',
  'financial',
  'operational'
);

-- Forecast Horizons
CREATE TYPE forecast_horizon AS ENUM (
  'daily',
  'weekly',
  'monthly',
  'quarterly',
  'yearly'
);

-- Alert Severity Levels
CREATE TYPE alert_severity AS ENUM (
  'info',
  'warning',
  'critical',
  'urgent'
);

-- AI Providers
CREATE TYPE ai_provider AS ENUM (
  'openai',
  'anthropic',
  'azure_openai',
  'bedrock'
);

-- ============================================================================
-- AI SERVICE CONFIGURATION
-- ============================================================================

CREATE TABLE ai_service_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  service_type ai_service_type NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  provider ai_provider NOT NULL DEFAULT 'openai',
  model_name VARCHAR(100) NOT NULL,
  api_endpoint TEXT,
  config JSONB NOT NULL DEFAULT '{}'::jsonb, -- temperature, max_tokens, etc.
  rate_limit_per_hour INTEGER NOT NULL DEFAULT 1000,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Constraints
  CONSTRAINT unique_org_service UNIQUE (org_id, service_type)
);

-- RLS Policies
ALTER TABLE ai_service_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_service_config_tenant_isolation ON ai_service_config
  FOR ALL
  USING (org_id = current_setting('app.current_org_id', true)::uuid);

-- Indexes
CREATE INDEX idx_ai_service_config_org ON ai_service_config(org_id);
CREATE INDEX idx_ai_service_config_type ON ai_service_config(service_type) WHERE is_enabled = true;

-- ============================================================================
-- AI PREDICTIONS
-- ============================================================================

CREATE TABLE ai_prediction (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  service_type ai_service_type NOT NULL,
  entity_type VARCHAR(50) NOT NULL, -- 'product', 'supplier', 'customer'
  entity_id UUID NOT NULL,
  prediction_data JSONB NOT NULL,
  confidence_score DECIMAL(5, 4) NOT NULL, -- 0.0000 to 1.0000
  accuracy_score DECIMAL(5, 4), -- Calculated post-facto
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  feedback_received BOOLEAN NOT NULL DEFAULT false,
  actual_outcome JSONB,
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Constraints
  CONSTRAINT check_confidence_range CHECK (confidence_score >= 0 AND confidence_score <= 1),
  CONSTRAINT check_accuracy_range CHECK (accuracy_score IS NULL OR (accuracy_score >= 0 AND accuracy_score <= 1))
);

-- RLS Policies
ALTER TABLE ai_prediction ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_prediction_tenant_isolation ON ai_prediction
  FOR ALL
  USING (org_id = current_setting('app.current_org_id', true)::uuid);

-- Indexes
CREATE INDEX idx_ai_prediction_org ON ai_prediction(org_id);
CREATE INDEX idx_ai_prediction_entity ON ai_prediction(entity_type, entity_id);
CREATE INDEX idx_ai_prediction_expires ON ai_prediction(expires_at) WHERE expires_at > NOW();
CREATE INDEX idx_ai_prediction_service_type ON ai_prediction(service_type);
CREATE INDEX idx_ai_prediction_confidence ON ai_prediction(confidence_score DESC);

-- GIN index for JSONB search
CREATE INDEX idx_ai_prediction_data ON ai_prediction USING GIN (prediction_data);

-- ============================================================================
-- DEMAND FORECASTING
-- ============================================================================

CREATE TABLE demand_forecast (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  forecast_date DATE NOT NULL,
  forecast_horizon forecast_horizon NOT NULL,
  predicted_quantity DECIMAL(12, 2) NOT NULL,
  lower_bound DECIMAL(12, 2) NOT NULL,
  upper_bound DECIMAL(12, 2) NOT NULL,
  confidence_interval DECIMAL(5, 4) NOT NULL DEFAULT 0.95, -- 95% confidence interval
  algorithm_used VARCHAR(50) NOT NULL,
  actual_quantity DECIMAL(12, 2), -- Filled after forecast date passes
  accuracy_score DECIMAL(5, 4), -- Calculated post-facto
  metadata JSONB DEFAULT '{}'::jsonb, -- seasonal factors, trends, etc.
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_forecast UNIQUE (org_id, product_id, forecast_date, forecast_horizon),
  CONSTRAINT check_bounds CHECK (lower_bound <= predicted_quantity AND predicted_quantity <= upper_bound)
);

-- RLS Policies
ALTER TABLE demand_forecast ENABLE ROW LEVEL SECURITY;

CREATE POLICY demand_forecast_tenant_isolation ON demand_forecast
  FOR ALL
  USING (org_id = current_setting('app.current_org_id', true)::uuid);

-- Indexes
CREATE INDEX idx_demand_forecast_org ON demand_forecast(org_id);
CREATE INDEX idx_demand_forecast_product ON demand_forecast(product_id);
CREATE INDEX idx_demand_forecast_date ON demand_forecast(forecast_date);
CREATE INDEX idx_demand_forecast_horizon ON demand_forecast(forecast_horizon);
CREATE INDEX idx_demand_forecast_accuracy ON demand_forecast(accuracy_score DESC) WHERE accuracy_score IS NOT NULL;

-- ============================================================================
-- ANALYTICS DASHBOARDS
-- ============================================================================

CREATE TABLE analytics_dashboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  layout JSONB NOT NULL DEFAULT '[]'::jsonb, -- Widget positions and sizes
  filters JSONB DEFAULT '{}'::jsonb, -- Default filters
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_shared BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_org_dashboard_name UNIQUE (org_id, name)
);

-- RLS Policies
ALTER TABLE analytics_dashboard ENABLE ROW LEVEL SECURITY;

CREATE POLICY analytics_dashboard_tenant_isolation ON analytics_dashboard
  FOR ALL
  USING (org_id = current_setting('app.current_org_id', true)::uuid);

-- Indexes
CREATE INDEX idx_analytics_dashboard_org ON analytics_dashboard(org_id);
CREATE INDEX idx_analytics_dashboard_creator ON analytics_dashboard(created_by);
CREATE INDEX idx_analytics_dashboard_default ON analytics_dashboard(org_id) WHERE is_default = true;

-- ============================================================================
-- ANALYTICS WIDGETS
-- ============================================================================

CREATE TABLE analytics_widget (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  dashboard_id UUID NOT NULL REFERENCES analytics_dashboard(id) ON DELETE CASCADE,
  widget_type VARCHAR(50) NOT NULL, -- 'chart', 'kpi', 'table', 'map'
  metric_type analytics_metric_type NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb, -- Data source, visualization settings
  query JSONB NOT NULL DEFAULT '{}'::jsonb, -- Filters, aggregations
  refresh_interval_seconds INTEGER NOT NULL DEFAULT 300, -- 5 minutes
  position_x INTEGER NOT NULL DEFAULT 0,
  position_y INTEGER NOT NULL DEFAULT 0,
  width INTEGER NOT NULL DEFAULT 1,
  height INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT check_refresh_interval CHECK (refresh_interval_seconds >= 0)
);

-- RLS Policies
ALTER TABLE analytics_widget ENABLE ROW LEVEL SECURITY;

CREATE POLICY analytics_widget_tenant_isolation ON analytics_widget
  FOR ALL
  USING (org_id = current_setting('app.current_org_id', true)::uuid);

-- Indexes
CREATE INDEX idx_analytics_widget_org ON analytics_widget(org_id);
CREATE INDEX idx_analytics_widget_dashboard ON analytics_widget(dashboard_id);
CREATE INDEX idx_analytics_widget_type ON analytics_widget(metric_type);

-- GIN indexes for JSONB
CREATE INDEX idx_analytics_widget_config ON analytics_widget USING GIN (config);
CREATE INDEX idx_analytics_widget_query ON analytics_widget USING GIN (query);

-- ============================================================================
-- AI ALERTS
-- ============================================================================

CREATE TABLE ai_alert (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  service_type ai_service_type NOT NULL,
  severity alert_severity NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  recommendations JSONB DEFAULT '[]'::jsonb, -- Array of recommendation objects
  entity_type VARCHAR(50),
  entity_id UUID,
  is_acknowledged BOOLEAN NOT NULL DEFAULT false,
  acknowledged_by UUID REFERENCES users(id) ON DELETE SET NULL,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- RLS Policies
ALTER TABLE ai_alert ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_alert_tenant_isolation ON ai_alert
  FOR ALL
  USING (org_id = current_setting('app.current_org_id', true)::uuid);

-- Indexes
CREATE INDEX idx_ai_alert_org ON ai_alert(org_id);
CREATE INDEX idx_ai_alert_severity ON ai_alert(severity);
CREATE INDEX idx_ai_alert_unresolved ON ai_alert(org_id, is_resolved) WHERE is_resolved = false;
CREATE INDEX idx_ai_alert_created ON ai_alert(created_at DESC);

-- ============================================================================
-- AI CONVERSATIONS
-- ============================================================================

CREATE TABLE ai_conversation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  conversation_id VARCHAR(50) NOT NULL, -- Grouping identifier
  role VARCHAR(20) NOT NULL, -- 'user', 'assistant', 'system'
  content TEXT NOT NULL,
  context JSONB DEFAULT '{}'::jsonb, -- Relevant data context
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT check_role CHECK (role IN ('user', 'assistant', 'system'))
);

-- RLS Policies
ALTER TABLE ai_conversation ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_conversation_tenant_isolation ON ai_conversation
  FOR ALL
  USING (org_id = current_setting('app.current_org_id', true)::uuid);

-- Indexes
CREATE INDEX idx_ai_conversation_org ON ai_conversation(org_id);
CREATE INDEX idx_ai_conversation_user ON ai_conversation(user_id);
CREATE INDEX idx_ai_conversation_id ON ai_conversation(conversation_id);
CREATE INDEX idx_ai_conversation_created ON ai_conversation(created_at DESC);

-- GIN index for context search
CREATE INDEX idx_ai_conversation_context ON ai_conversation USING GIN (context);

-- ============================================================================
-- ANALYTICS METRIC CACHE
-- ============================================================================
-- Pre-calculated metrics for performance

CREATE TABLE analytics_metric_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  metric_type analytics_metric_type NOT NULL,
  metric_key VARCHAR(255) NOT NULL, -- Unique identifier for the metric
  metric_value JSONB NOT NULL,
  time_period VARCHAR(50) NOT NULL, -- 'hourly', 'daily', 'weekly', 'monthly'
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_metric_cache UNIQUE (org_id, metric_type, metric_key, period_start)
);

-- RLS Policies
ALTER TABLE analytics_metric_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY analytics_metric_cache_tenant_isolation ON analytics_metric_cache
  FOR ALL
  USING (org_id = current_setting('app.current_org_id', true)::uuid);

-- Indexes
CREATE INDEX idx_metric_cache_org ON analytics_metric_cache(org_id);
CREATE INDEX idx_metric_cache_type ON analytics_metric_cache(metric_type);
CREATE INDEX idx_metric_cache_period ON analytics_metric_cache(period_start, period_end);
CREATE INDEX idx_metric_cache_calculated ON analytics_metric_cache(calculated_at DESC);

-- GIN index for value search
CREATE INDEX idx_metric_cache_value ON analytics_metric_cache USING GIN (metric_value);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update timestamp trigger for ai_service_config
CREATE TRIGGER ai_service_config_updated_at
  BEFORE UPDATE ON ai_service_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update timestamp trigger for analytics_dashboard
CREATE TRIGGER analytics_dashboard_updated_at
  BEFORE UPDATE ON analytics_dashboard
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update timestamp trigger for analytics_widget
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
  -- Calculate accuracy when actual quantity is set
  IF NEW.actual_quantity IS NOT NULL AND OLD.actual_quantity IS NULL THEN
    NEW.accuracy_score = 1 - ABS(NEW.predicted_quantity - NEW.actual_quantity) / NULLIF(NEW.actual_quantity, 0);
    NEW.accuracy_score = GREATEST(0, LEAST(1, NEW.accuracy_score)); -- Clamp to [0, 1]
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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
CREATE OR REPLACE VIEW v_active_ai_alerts AS
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

-- Forecast Performance Summary
CREATE OR REPLACE VIEW v_forecast_performance AS
SELECT
  df.org_id,
  df.product_id,
  p.name as product_name,
  df.forecast_horizon,
  COUNT(*) as total_forecasts,
  AVG(df.accuracy_score) as avg_accuracy,
  STDDEV(df.accuracy_score) as accuracy_stddev,
  COUNT(*) FILTER (WHERE df.accuracy_score >= 0.8) as high_accuracy_count
FROM demand_forecast df
JOIN products p ON p.id = df.product_id
WHERE df.accuracy_score IS NOT NULL
GROUP BY df.org_id, df.product_id, p.name, df.forecast_horizon;

-- Dashboard Widget Summary
CREATE OR REPLACE VIEW v_dashboard_widgets AS
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
-- GRANTS
-- ============================================================================

-- Note: Adjust based on your role structure
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
-- GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO app_user;
-- GRANT SELECT ON ALL VIEWS IN SCHEMA public TO app_user;

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

-- Check all tables created
SELECT table_name
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
  )
ORDER BY table_name;

-- Check all enums created
SELECT typname
FROM pg_type
WHERE typname IN (
  'ai_service_type',
  'analytics_metric_type',
  'forecast_horizon',
  'alert_severity',
  'ai_provider'
)
ORDER BY typname;

-- Check RLS enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename LIKE 'ai_%' OR tablename LIKE 'analytics_%' OR tablename = 'demand_forecast'
ORDER BY tablename;
