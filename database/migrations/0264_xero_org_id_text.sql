-- Migration: 0264_xero_org_id_text.sql
-- Description: Alter Xero tables org_id from UUID to TEXT for Clerk org ID compatibility.
--   Clerk returns organizationId as string (e.g. org_2xxx). No FK to organization(id).
-- Author: Plan
-- Date: 2026-03

-- xero_connections
ALTER TABLE xero_connections
  ALTER COLUMN org_id TYPE TEXT USING org_id::TEXT;

-- xero_entity_mappings
ALTER TABLE xero_entity_mappings
  ALTER COLUMN org_id TYPE TEXT USING org_id::TEXT;

-- xero_account_mappings
ALTER TABLE xero_account_mappings
  ALTER COLUMN org_id TYPE TEXT USING org_id::TEXT;

-- xero_sync_log
ALTER TABLE xero_sync_log
  ALTER COLUMN org_id TYPE TEXT USING org_id::TEXT;

INSERT INTO schema_migrations (migration_name)
VALUES ('0264_xero_org_id_text')
ON CONFLICT (migration_name) DO NOTHING;
