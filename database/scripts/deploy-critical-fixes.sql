-- ============================================================================
-- CRITICAL DATABASE FIXES DEPLOYMENT
-- ============================================================================
-- This SQL file deploys all critical fixes in a single transaction
-- Execute using: psql $DATABASE_URL -f database/scripts/deploy-critical-fixes.sql
--
-- Includes:
--   1. Analytics sequences fix (005_fix_analytics_sequences.sql)
--   2. Supplier contact_person column (006_add_supplier_contact_person.sql)
-- ============================================================================

BEGIN;

-- ============================================================================
-- MIGRATION 005: FIX ANALYTICS SEQUENCES
-- ============================================================================

-- Analytics Anomalies Sequence Fix
-- --------------------------------

-- Create sequence for analytics_anomalies.anomaly_id
CREATE SEQUENCE IF NOT EXISTS core.analytics_anomalies_anomaly_id_seq;

-- Set current sequence value to max existing ID + 1
SELECT setval(
  'core.analytics_anomalies_anomaly_id_seq',
  COALESCE((SELECT MAX(anomaly_id) FROM core.analytics_anomalies), 0) + 1,
  false
);

-- Alter table to use sequence as default
ALTER TABLE core.analytics_anomalies
  ALTER COLUMN anomaly_id SET DEFAULT nextval('core.analytics_anomalies_anomaly_id_seq');

-- Set sequence ownership for automatic cleanup
ALTER SEQUENCE core.analytics_anomalies_anomaly_id_seq
  OWNED BY core.analytics_anomalies.anomaly_id;

-- Analytics Predictions Sequence Fix
-- -----------------------------------

-- Create sequence for analytics_predictions.prediction_id
CREATE SEQUENCE IF NOT EXISTS core.analytics_predictions_prediction_id_seq;

-- Set current sequence value to max existing ID + 1
SELECT setval(
  'core.analytics_predictions_prediction_id_seq',
  COALESCE((SELECT MAX(prediction_id) FROM core.analytics_predictions), 0) + 1,
  false
);

-- Alter table to use sequence as default
ALTER TABLE core.analytics_predictions
  ALTER COLUMN prediction_id SET DEFAULT nextval('core.analytics_predictions_prediction_id_seq');

-- Set sequence ownership
ALTER SEQUENCE core.analytics_predictions_prediction_id_seq
  OWNED BY core.analytics_predictions.prediction_id;

-- Verification for Migration 005
-- -------------------------------

DO $$
DECLARE
  test_anomaly_id BIGINT;
BEGIN
  INSERT INTO core.analytics_anomalies (
    type, severity, entity_type, entity_id, description
  ) VALUES (
    'test', 'low', 'system', 1, 'Migration verification test'
  ) RETURNING anomaly_id INTO test_anomaly_id;

  DELETE FROM core.analytics_anomalies WHERE anomaly_id = test_anomaly_id;

  RAISE NOTICE '✓ Analytics anomalies auto-increment verified: %', test_anomaly_id;
END $$;

DO $$
DECLARE
  test_prediction_id BIGINT;
BEGIN
  INSERT INTO core.analytics_predictions (
    model_type, entity_type, entity_id, prediction_type, prediction_date
  ) VALUES (
    'test', 'system', 1, 'test', NOW()
  ) RETURNING prediction_id INTO test_prediction_id;

  DELETE FROM core.analytics_predictions WHERE prediction_id = test_prediction_id;

  RAISE NOTICE '✓ Analytics predictions auto-increment verified: %', test_prediction_id;
END $$;

-- ============================================================================
-- MIGRATION 006: ADD SUPPLIER CONTACT_PERSON COLUMN
-- ============================================================================

-- Add contact_person column to core.supplier table
ALTER TABLE core.supplier
ADD COLUMN IF NOT EXISTS contact_person JSONB DEFAULT '{}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN core.supplier.contact_person IS 'Primary contact person information (name, email, phone, title)';

-- Create index for JSONB queries on contact_person
CREATE INDEX IF NOT EXISTS idx_supplier_contact_person_gin
ON core.supplier USING GIN (contact_person);

-- Update any existing rows to have empty object instead of NULL
UPDATE core.supplier
SET contact_person = '{}'::jsonb
WHERE contact_person IS NULL;

-- Verification for Migration 006
-- -------------------------------

DO $$
DECLARE
  col_exists BOOLEAN;
  idx_exists BOOLEAN;
BEGIN
  -- Check column exists
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'core'
      AND table_name = 'supplier'
      AND column_name = 'contact_person'
  ) INTO col_exists;

  -- Check index exists
  SELECT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'core'
      AND tablename = 'supplier'
      AND indexname = 'idx_supplier_contact_person_gin'
  ) INTO idx_exists;

  IF col_exists THEN
    RAISE NOTICE '✓ Column contact_person exists on core.supplier';
  ELSE
    RAISE EXCEPTION '✗ Column contact_person missing from core.supplier';
  END IF;

  IF idx_exists THEN
    RAISE NOTICE '✓ GIN index idx_supplier_contact_person_gin exists';
  ELSE
    RAISE WARNING '⚠ GIN index idx_supplier_contact_person_gin missing';
  END IF;
END $$;

-- ============================================================================
-- FINAL VERIFICATION SUMMARY
-- ============================================================================

-- Display migration status
SELECT
  'core.analytics_anomalies' as table_name,
  pg_get_serial_sequence('core.analytics_anomalies', 'anomaly_id') as sequence_name,
  'Sequence created and linked' as status
UNION ALL
SELECT
  'core.analytics_predictions' as table_name,
  pg_get_serial_sequence('core.analytics_predictions', 'prediction_id') as sequence_name,
  'Sequence created and linked' as status
UNION ALL
SELECT
  'core.supplier' as table_name,
  'contact_person' as column_name,
  'Column added with GIN index' as status;

COMMIT;

-- ============================================================================
-- DEPLOYMENT COMPLETE
-- ============================================================================
-- All critical fixes have been applied successfully.
-- Run verify-critical-fixes.ts to perform comprehensive verification.
-- ============================================================================
