-- Fix analytics_anomalies organization_id type mismatch
-- Change from integer to UUID to match rest of schema

BEGIN;

-- Drop dependent objects if any
ALTER TABLE analytics_anomalies DROP CONSTRAINT IF EXISTS analytics_anomalies_organization_id_fkey;

-- Change organization_id from integer to UUID
ALTER TABLE analytics_anomalies
  ALTER COLUMN organization_id TYPE UUID USING
    CASE
      WHEN organization_id = 0 THEN '00000000-0000-0000-0000-000000000000'::uuid
      ELSE uuid_generate_v4()
    END;

-- Set default for new records
ALTER TABLE analytics_anomalies
  ALTER COLUMN organization_id SET DEFAULT '00000000-0000-0000-0000-000000000000'::uuid;

-- Update any existing records with fallback org_id
UPDATE analytics_anomalies
SET organization_id = '00000000-0000-0000-0000-000000000000'::uuid
WHERE organization_id IS NULL;

COMMIT;
