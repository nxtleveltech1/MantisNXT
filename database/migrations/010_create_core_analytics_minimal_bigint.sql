-- Minimal core analytics tables with BIGINT identity keys
-- Date: 2025-10-29

BEGIN;

-- core.analytics_anomalies
CREATE TABLE IF NOT EXISTS core.analytics_anomalies (
  anomaly_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  organization_id INTEGER DEFAULT 1,
  type VARCHAR(100) NOT NULL,
  severity VARCHAR(50) NOT NULL CHECK (severity IN ('low','medium','high','critical')),
  entity_type VARCHAR(100) NOT NULL,
  entity_id BIGINT,
  description TEXT NOT NULL,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confidence_score DECIMAL(5,4) DEFAULT 0,
  impact_score DECIMAL(10,2) DEFAULT 0,
  resolved_at TIMESTAMPTZ,
  resolved_by VARCHAR(255),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- core.analytics_predictions
CREATE TABLE IF NOT EXISTS core.analytics_predictions (
  prediction_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  organization_id INTEGER DEFAULT 1,
  model_type VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id BIGINT,
  prediction_type VARCHAR(100) NOT NULL,
  predicted_value DECIMAL(15,4),
  confidence DECIMAL(5,4) DEFAULT 0,
  accuracy DECIMAL(5,4),
  time_horizon_days INTEGER DEFAULT 30,
  factors JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  prediction_date TIMESTAMPTZ NOT NULL,
  actual_value DECIMAL(15,4),
  validated_at TIMESTAMPTZ
);

COMMIT;

-- Verification
SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema='core' AND table_name IN ('analytics_anomalies','analytics_predictions');

