-- Migration: 0210_supplier_org_mapping
-- Description: add supplier org linkage columns and validation job tracking

BEGIN;

CREATE SCHEMA IF NOT EXISTS spp;

ALTER TABLE core.supplier
  ADD COLUMN IF NOT EXISTS org_id uuid,
  ADD COLUMN IF NOT EXISTS organization_id uuid;

ALTER TABLE core.supplier
  ALTER COLUMN updated_at SET DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_core_supplier_org_id ON core.supplier(org_id);
CREATE INDEX IF NOT EXISTS idx_core_supplier_organization_id ON core.supplier(organization_id);

ALTER TABLE spp.pricelist_upload
  ADD COLUMN IF NOT EXISTS validation_job_id uuid;

CREATE INDEX IF NOT EXISTS idx_spp_pricelist_upload_validation_job_id
  ON spp.pricelist_upload(validation_job_id);

DO $$
DECLARE
  v_default_org uuid;
BEGIN
  SELECT id INTO v_default_org
  FROM organization
  ORDER BY created_at NULLS LAST
  LIMIT 1;

  IF v_default_org IS NOT NULL THEN
    UPDATE core.supplier
    SET
      org_id = COALESCE(org_id, organization_id, v_default_org),
      organization_id = COALESCE(organization_id, org_id, v_default_org);
  END IF;
END $$;

COMMIT;

INSERT INTO schema_migrations (migration_name)
VALUES ('0210_supplier_org_mapping')
ON CONFLICT (migration_name) DO NOTHING;

-- down
ALTER TABLE spp.pricelist_upload
  DROP COLUMN IF EXISTS validation_job_id;

DROP INDEX IF EXISTS idx_spp_pricelist_upload_validation_job_id;
DROP INDEX IF EXISTS idx_core_supplier_org_id;
DROP INDEX IF EXISTS idx_core_supplier_organization_id;

ALTER TABLE core.supplier
  DROP COLUMN IF EXISTS org_id,
  DROP COLUMN IF EXISTS organization_id;

