-- Rollback Migration 005: Remove Analytics Table Sequences
-- WARNING: This will prevent auto-increment on analytics tables
-- Only use this if migration 005 needs to be reverted

-- ============================================================================
-- REMOVE DEFAULT VALUES
-- ============================================================================

-- Remove default from analytics_anomalies.anomaly_id
ALTER TABLE core.analytics_anomalies
  ALTER COLUMN anomaly_id DROP DEFAULT;

-- Remove default from analytics_predictions.prediction_id
ALTER TABLE core.analytics_predictions
  ALTER COLUMN prediction_id DROP DEFAULT;

-- ============================================================================
-- DROP SEQUENCES
-- ============================================================================

-- Drop analytics_anomalies sequence
DROP SEQUENCE IF EXISTS core.analytics_anomalies_anomaly_id_seq CASCADE;

-- Drop analytics_predictions sequence
DROP SEQUENCE IF EXISTS core.analytics_predictions_prediction_id_seq CASCADE;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify sequences are removed
SELECT
  'core.analytics_anomalies' as table_name,
  column_name,
  column_default
FROM information_schema.columns
WHERE table_schema = 'core'
  AND table_name = 'analytics_anomalies'
  AND column_name = 'anomaly_id'

UNION ALL

SELECT
  'core.analytics_predictions' as table_name,
  column_name,
  column_default
FROM information_schema.columns
WHERE table_schema = 'core'
  AND table_name = 'analytics_predictions'
  AND column_name = 'prediction_id';

-- ============================================================================
-- ROLLBACK COMPLETE
-- ============================================================================
