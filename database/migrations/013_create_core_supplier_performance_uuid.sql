-- Create core.supplier_performance (UUID-aligned)
-- Date: 2025-10-29

BEGIN;

CREATE TABLE IF NOT EXISTS core.supplier_performance (
  performance_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES core.supplier(supplier_id) ON DELETE CASCADE,
  evaluation_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  on_time_delivery_rate DECIMAL(5,2) DEFAULT 0 CHECK (on_time_delivery_rate BETWEEN 0 AND 100),
  quality_acceptance_rate DECIMAL(5,2) DEFAULT 0 CHECK (quality_acceptance_rate BETWEEN 0 AND 100),
  overall_rating DECIMAL(3,2) DEFAULT 0 CHECK (overall_rating BETWEEN 0 AND 5),
  response_time_hours INTEGER DEFAULT 24 CHECK (response_time_hours >= 0),
  communication_score DECIMAL(3,2) DEFAULT 0 CHECK (communication_score BETWEEN 0 AND 5),
  cost_competitiveness DECIMAL(3,2) DEFAULT 0 CHECK (cost_competitiveness BETWEEN 0 AND 5),
  total_orders INTEGER DEFAULT 0,
  total_value DECIMAL(18,4) DEFAULT 0,
  issues_reported INTEGER DEFAULT 0,
  issues_resolved INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_supplier_performance_supplier_id ON core.supplier_performance(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_performance_eval_date ON core.supplier_performance(evaluation_date DESC);

DROP TRIGGER IF EXISTS update_supplier_performance_updated_at ON core.supplier_performance;
CREATE TRIGGER update_supplier_performance_updated_at
  BEFORE UPDATE ON core.supplier_performance
  FOR EACH ROW EXECUTE FUNCTION core.update_updated_at_column();

COMMIT;
