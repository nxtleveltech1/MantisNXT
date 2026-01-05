-- Migration: 0211_fix_spp_upload_fk
-- Description: Align extraction_jobs FK with spp.pricelist_upload table and provide compatibility view

BEGIN;

CREATE SCHEMA IF NOT EXISTS spp;

CREATE TABLE IF NOT EXISTS spp.pricelist_upload (
  upload_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID,
  supplier_id UUID NOT NULL,
  filename TEXT NOT NULL,
  size_bytes BIGINT,
  mime_type TEXT,
  storage_path TEXT,
  currency TEXT NOT NULL DEFAULT 'ZAR',
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_to TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'received',
  row_count INTEGER NOT NULL DEFAULT 0,
  errors_json JSONB,
  validation_result JSONB,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  validation_job_id UUID,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_by UUID,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours'
);

-- Recreate compatibility view for legacy code referencing pluralized table name
DROP VIEW IF EXISTS spp.pricelist_uploads CASCADE;
CREATE VIEW spp.pricelist_uploads AS
  SELECT * FROM spp.pricelist_upload;

-- Refresh FK to point at canonical table
ALTER TABLE spp.extraction_jobs
  DROP CONSTRAINT IF EXISTS extraction_jobs_upload_id_fkey;

ALTER TABLE spp.extraction_jobs
  ADD CONSTRAINT extraction_jobs_upload_id_fkey
  FOREIGN KEY (upload_id)
  REFERENCES spp.pricelist_upload(upload_id)
  ON DELETE CASCADE;

COMMIT;

INSERT INTO schema_migrations (migration_name)
VALUES ('0211_fix_spp_upload_fk')
ON CONFLICT (migration_name) DO NOTHING;

