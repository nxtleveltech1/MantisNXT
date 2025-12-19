-- Migration: 0227_dartai_project_management.sql
-- Description: Dart-AI Project Management integration (per-user tokens + audit)
-- Created: 2025-12-18
-- Dependencies: 0005_integrations.sql (integration_provider enum), auth.users_extended, organization/organizations table

-- Add Dart-AI provider to integration_provider enum
ALTER TYPE integration_provider ADD VALUE IF NOT EXISTS 'dartai';

-- ============================================================================
-- Dart-AI per-user token storage (encrypted at rest)
-- ============================================================================

CREATE TABLE IF NOT EXISTS auth.dartai_user_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users_extended(id) ON DELETE CASCADE,
  encrypted_token TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_validated_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  access_count INTEGER NOT NULL DEFAULT 0,

  CONSTRAINT dartai_user_tokens_unique UNIQUE (org_id, user_id),
  CONSTRAINT dartai_user_tokens_encrypted_not_empty CHECK (char_length(encrypted_token) > 0)
);

CREATE INDEX IF NOT EXISTS idx_dartai_user_tokens_org_user
ON auth.dartai_user_tokens(org_id, user_id);

CREATE INDEX IF NOT EXISTS idx_dartai_user_tokens_updated_at
ON auth.dartai_user_tokens(updated_at DESC);

-- updated_at trigger
DROP TRIGGER IF EXISTS update_dartai_user_tokens_updated_at ON auth.dartai_user_tokens;
CREATE TRIGGER update_dartai_user_tokens_updated_at
  BEFORE UPDATE ON auth.dartai_user_tokens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Audit log (append-only) for token lifecycle events
-- ============================================================================

CREATE TABLE IF NOT EXISTS auth.dartai_token_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users_extended(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'connected' | 'validated' | 'disconnected' | 'used'
  ip_address TEXT,
  user_agent TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT dartai_token_audit_action_not_empty CHECK (char_length(action) > 0)
);

CREATE INDEX IF NOT EXISTS idx_dartai_token_audit_log_org_created
ON auth.dartai_token_audit_log(org_id, created_at DESC);

-- ============================================================================
-- RLS policies (org isolation)
-- ============================================================================

ALTER TABLE auth.dartai_user_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.dartai_token_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dartai_user_tokens_org_isolation ON auth.dartai_user_tokens;
CREATE POLICY dartai_user_tokens_org_isolation ON auth.dartai_user_tokens
  FOR ALL
  USING (org_id = current_setting('app.current_org_id')::uuid);

DROP POLICY IF EXISTS dartai_token_audit_log_org_isolation ON auth.dartai_token_audit_log;
CREATE POLICY dartai_token_audit_log_org_isolation ON auth.dartai_token_audit_log
  FOR ALL
  USING (org_id = current_setting('app.current_org_id')::uuid);

-- Permissions (adjust to your runtime DB roles; keep aligned with existing auth tables)
GRANT SELECT, INSERT, UPDATE, DELETE ON auth.dartai_user_tokens TO authenticated;
GRANT SELECT, INSERT ON auth.dartai_token_audit_log TO authenticated;

INSERT INTO schema_migrations (migration_name)
VALUES ('0227_dartai_project_management')
ON CONFLICT (migration_name) DO NOTHING;






