-- Migration 005: Fix Analytics Tables Auto-Increment Sequences
-- Issue: analytics_anomalies and analytics_predictions missing auto-increment on primary keys
-- Impact: INSERT operations fail without explicit ID values
-- Resolution: Create sequences and set as default values

-- ============================================================================
-- ANALYTICS ANOMALIES SEQUENCE FIX
-- ============================================================================

-- Step 1: Create sequence for analytics_anomalies.anomaly_id
CREATE SEQUENCE IF NOT EXISTS core.analytics_anomalies_anomaly_id_seq;

-- Step 2: Set current sequence value to max existing ID + 1
-- This prevents conflicts with existing data
SELECT setval(
  'core.analytics_anomalies_anomaly_id_seq',
  COALESCE((SELECT MAX(anomaly_id) FROM core.analytics_anomalies), 0) + 1,
  false
);

-- Step 3: Alter table to use sequence as default
ALTER TABLE core.analytics_anomalies
  ALTER COLUMN anomaly_id SET DEFAULT nextval('core.analytics_anomalies_anomaly_id_seq');

-- Step 4: Set sequence ownership for automatic cleanup
ALTER SEQUENCE core.analytics_anomalies_anomaly_id_seq
  OWNED BY core.analytics_anomalies.anomaly_id;

-- ============================================================================
-- ANALYTICS PREDICTIONS SEQUENCE FIX
-- ============================================================================

-- Step 1: Create sequence for analytics_predictions.prediction_id
CREATE SEQUENCE IF NOT EXISTS core.analytics_predictions_prediction_id_seq;

-- Step 2: Set current sequence value to max existing ID + 1
SELECT setval(
  'core.analytics_predictions_prediction_id_seq',
  COALESCE((SELECT MAX(prediction_id) FROM core.analytics_predictions), 0) + 1,
  false
);

-- Step 3: Alter table to use sequence as default
ALTER TABLE core.analytics_predictions
  ALTER COLUMN prediction_id SET DEFAULT nextval('core.analytics_predictions_prediction_id_seq');

-- Step 4: Set sequence ownership
ALTER SEQUENCE core.analytics_predictions_prediction_id_seq
  OWNED BY core.analytics_predictions.prediction_id;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Test INSERT without explicit ID for anomalies
DO $$
DECLARE
  test_anomaly_id BIGINT;
BEGIN
  INSERT INTO core.analytics_anomalies (
    type, severity, entity_type, entity_id, description
  ) VALUES (
    'test', 'low', 'system', 1, 'Migration verification test'
  ) RETURNING anomaly_id INTO test_anomaly_id;

  -- Delete test record
  DELETE FROM core.analytics_anomalies WHERE anomaly_id = test_anomaly_id;

  RAISE NOTICE 'Analytics anomalies auto-increment verified: %', test_anomaly_id;
END $$;

-- Test INSERT without explicit ID for predictions
DO $$
DECLARE
  test_prediction_id BIGINT;
BEGIN
  INSERT INTO core.analytics_predictions (
    model_type, entity_type, entity_id, prediction_type, prediction_date
  ) VALUES (
    'test', 'system', 1, 'test', NOW()
  ) RETURNING prediction_id INTO test_prediction_id;

  -- Delete test record
  DELETE FROM core.analytics_predictions WHERE prediction_id = test_prediction_id;

  RAISE NOTICE 'Analytics predictions auto-increment verified: %', test_prediction_id;
END $$;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Migration summary
SELECT
  'core.analytics_anomalies' as table_name,
  pg_get_serial_sequence('core.analytics_anomalies', 'anomaly_id') as sequence_name,
  last_value as next_value
FROM core.analytics_anomalies_anomaly_id_seq

UNION ALL

SELECT
  'core.analytics_predictions' as table_name,
  pg_get_serial_sequence('core.analytics_predictions', 'prediction_id') as sequence_name,
  last_value as next_value
FROM core.analytics_predictions_prediction_id_seq;
