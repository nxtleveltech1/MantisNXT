-- ============================================================================
-- Migration: 0235_pm_suite.sql
-- Description: Project Management Suite core.pm_* tables + remove Dart-AI storage
-- Date: 2026-02-05
-- ============================================================================

BEGIN;

CREATE SCHEMA IF NOT EXISTS core;

-- ===========================
-- ENUM TYPES
-- ===========================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pm_project_status') THEN
    CREATE TYPE pm_project_status AS ENUM ('active', 'archived', 'completed');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pm_project_visibility') THEN
    CREATE TYPE pm_project_visibility AS ENUM ('org', 'private');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pm_status_type') THEN
    CREATE TYPE pm_status_type AS ENUM ('todo', 'in_progress', 'done');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pm_task_priority') THEN
    CREATE TYPE pm_task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pm_task_type') THEN
    CREATE TYPE pm_task_type AS ENUM ('task', 'bug', 'feature');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pm_sprint_status') THEN
    CREATE TYPE pm_sprint_status AS ENUM ('planned', 'active', 'closed');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pm_milestone_status') THEN
    CREATE TYPE pm_milestone_status AS ENUM ('planned', 'achieved', 'missed');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pm_view_type') THEN
    CREATE TYPE pm_view_type AS ENUM ('kanban', 'list', 'calendar', 'gantt', 'roadmap', 'workload');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pm_dependency_type') THEN
    CREATE TYPE pm_dependency_type AS ENUM ('blocks', 'relates');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pm_custom_field_type') THEN
    CREATE TYPE pm_custom_field_type AS ENUM ('text', 'number', 'date', 'select', 'multi_select', 'checkbox', 'user');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pm_activity_action') THEN
    CREATE TYPE pm_activity_action AS ENUM (
      'created', 'updated', 'deleted', 'status_changed', 'assigned', 'unassigned',
      'commented', 'linked', 'unlinked', 'moved', 'completed', 'reopened'
    );
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pm_automation_trigger_type') THEN
    CREATE TYPE pm_automation_trigger_type AS ENUM ('event', 'schedule', 'sla');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pm_automation_status') THEN
    CREATE TYPE pm_automation_status AS ENUM ('active', 'paused', 'archived');
  END IF;
END$$;

-- ===========================
-- TABLES
-- ===========================
CREATE TABLE IF NOT EXISTS core.pm_project (
  project_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  project_key text NOT NULL,
  status pm_project_status NOT NULL DEFAULT 'active',
  visibility pm_project_visibility NOT NULL DEFAULT 'org',
  owner_id uuid REFERENCES auth.users_extended(id) ON DELETE SET NULL,
  start_date date,
  target_date date,
  completed_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT pm_project_name_len CHECK (char_length(name) >= 2),
  CONSTRAINT pm_project_key_format CHECK (project_key ~ '^[A-Z0-9][A-Z0-9_-]{1,20}$'),
  CONSTRAINT pm_project_org_key_unique UNIQUE (org_id, project_key)
);

CREATE TABLE IF NOT EXISTS core.pm_project_member (
  project_id uuid NOT NULL REFERENCES core.pm_project(project_id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users_extended(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  is_active boolean DEFAULT true,
  joined_at timestamptz DEFAULT now(),
  added_by uuid REFERENCES auth.users_extended(id) ON DELETE SET NULL,
  PRIMARY KEY (project_id, user_id)
);

CREATE TABLE IF NOT EXISTS core.pm_status (
  status_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES core.pm_project(project_id) ON DELETE CASCADE,
  name text NOT NULL,
  status_key text NOT NULL,
  status_type pm_status_type NOT NULL DEFAULT 'todo',
  color text DEFAULT '#64748b',
  position integer NOT NULL DEFAULT 0,
  is_default boolean DEFAULT false,
  is_archived boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT pm_status_unique_key UNIQUE (project_id, status_key)
);

CREATE TABLE IF NOT EXISTS core.pm_label (
  label_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES core.pm_project(project_id) ON DELETE CASCADE,
  name text NOT NULL,
  color text DEFAULT '#0ea5e9',
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT pm_label_unique_name UNIQUE (project_id, name)
);

CREATE TABLE IF NOT EXISTS core.pm_sprint (
  sprint_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES core.pm_project(project_id) ON DELETE CASCADE,
  name text NOT NULL,
  goal text,
  start_date date,
  end_date date,
  status pm_sprint_status NOT NULL DEFAULT 'planned',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS core.pm_milestone (
  milestone_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES core.pm_project(project_id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  due_date date,
  status pm_milestone_status NOT NULL DEFAULT 'planned',
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS core.pm_task (
  task_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES core.pm_project(project_id) ON DELETE CASCADE,
  parent_task_id uuid REFERENCES core.pm_task(task_id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status_id uuid NOT NULL REFERENCES core.pm_status(status_id) ON DELETE RESTRICT,
  priority pm_task_priority NOT NULL DEFAULT 'medium',
  task_type pm_task_type NOT NULL DEFAULT 'task',
  estimate_points numeric,
  start_date date,
  due_date date,
  completed_at timestamptz,
  primary_assignee_id uuid REFERENCES auth.users_extended(id) ON DELETE SET NULL,
  reporter_id uuid REFERENCES auth.users_extended(id) ON DELETE SET NULL,
  sprint_id uuid REFERENCES core.pm_sprint(sprint_id) ON DELETE SET NULL,
  milestone_id uuid REFERENCES core.pm_milestone(milestone_id) ON DELETE SET NULL,
  position numeric(12,4) NOT NULL DEFAULT 0,
  progress_percent integer DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS core.pm_task_assignee (
  task_id uuid NOT NULL REFERENCES core.pm_task(task_id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users_extended(id) ON DELETE CASCADE,
  assigned_at timestamptz DEFAULT now(),
  assigned_by uuid REFERENCES auth.users_extended(id) ON DELETE SET NULL,
  PRIMARY KEY (task_id, user_id)
);

CREATE TABLE IF NOT EXISTS core.pm_task_dependency (
  dependency_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES core.pm_task(task_id) ON DELETE CASCADE,
  depends_on_task_id uuid NOT NULL REFERENCES core.pm_task(task_id) ON DELETE CASCADE,
  dependency_type pm_dependency_type NOT NULL DEFAULT 'blocks',
  created_by uuid REFERENCES auth.users_extended(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT pm_task_dependency_unique UNIQUE (task_id, depends_on_task_id, dependency_type)
);

CREATE TABLE IF NOT EXISTS core.pm_task_label (
  task_id uuid NOT NULL REFERENCES core.pm_task(task_id) ON DELETE CASCADE,
  label_id uuid NOT NULL REFERENCES core.pm_label(label_id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, label_id)
);

CREATE TABLE IF NOT EXISTS core.pm_comment (
  comment_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN ('project', 'task', 'sprint', 'milestone')),
  entity_id uuid NOT NULL,
  author_id uuid REFERENCES auth.users_extended(id) ON DELETE SET NULL,
  body text NOT NULL,
  parent_comment_id uuid REFERENCES core.pm_comment(comment_id) ON DELETE CASCADE,
  is_edited boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS core.pm_attachment (
  attachment_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('project', 'task', 'sprint', 'milestone')),
  entity_id uuid NOT NULL,
  document_id uuid NOT NULL REFERENCES docustore.documents(id) ON DELETE CASCADE,
  uploaded_by uuid REFERENCES auth.users_extended(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS core.pm_view (
  view_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  project_id uuid REFERENCES core.pm_project(project_id) ON DELETE SET NULL,
  name text NOT NULL,
  view_type pm_view_type NOT NULL,
  config jsonb DEFAULT '{}'::jsonb,
  owner_id uuid REFERENCES auth.users_extended(id) ON DELETE SET NULL,
  is_shared boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS core.pm_portfolio (
  portfolio_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  owner_id uuid REFERENCES auth.users_extended(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS core.pm_portfolio_project (
  portfolio_id uuid NOT NULL REFERENCES core.pm_portfolio(portfolio_id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES core.pm_project(project_id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  added_at timestamptz DEFAULT now(),
  PRIMARY KEY (portfolio_id, project_id)
);

CREATE TABLE IF NOT EXISTS core.pm_custom_field (
  field_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  project_id uuid REFERENCES core.pm_project(project_id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN ('project', 'task')),
  name text NOT NULL,
  field_key text NOT NULL,
  field_type pm_custom_field_type NOT NULL,
  options jsonb DEFAULT '{}'::jsonb,
  is_required boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT pm_custom_field_unique UNIQUE (org_id, project_id, entity_type, field_key)
);

CREATE TABLE IF NOT EXISTS core.pm_custom_field_value (
  value_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  field_id uuid NOT NULL REFERENCES core.pm_custom_field(field_id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN ('project', 'task')),
  entity_id uuid NOT NULL,
  value jsonb DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT pm_custom_field_value_unique UNIQUE (field_id, entity_id)
);

CREATE TABLE IF NOT EXISTS core.pm_activity (
  activity_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users_extended(id) ON DELETE SET NULL,
  entity_type text NOT NULL CHECK (entity_type IN ('project', 'task', 'sprint', 'milestone', 'comment', 'portfolio')),
  entity_id uuid NOT NULL,
  action pm_activity_action NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS core.pm_webhook (
  webhook_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  name text NOT NULL,
  target_url text NOT NULL,
  secret text NOT NULL,
  events text[] NOT NULL DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS core.pm_webhook_delivery (
  delivery_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id uuid NOT NULL REFERENCES core.pm_webhook(webhook_id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL CHECK (status IN ('pending', 'success', 'failed')),
  attempt_count integer NOT NULL DEFAULT 0,
  response_status integer,
  response_body text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS core.pm_automation_rule (
  rule_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  project_id uuid REFERENCES core.pm_project(project_id) ON DELETE CASCADE,
  name text NOT NULL,
  trigger_type pm_automation_trigger_type NOT NULL,
  trigger_config jsonb DEFAULT '{}'::jsonb,
  conditions jsonb DEFAULT '[]'::jsonb,
  actions jsonb DEFAULT '[]'::jsonb,
  status pm_automation_status NOT NULL DEFAULT 'active',
  created_by uuid REFERENCES auth.users_extended(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS core.pm_automation_run (
  run_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id uuid REFERENCES core.pm_automation_rule(rule_id) ON DELETE SET NULL,
  org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  project_id uuid REFERENCES core.pm_project(project_id) ON DELETE SET NULL,
  trigger_type pm_automation_trigger_type NOT NULL,
  trigger_context jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL CHECK (status IN ('success', 'failed', 'skipped')),
  message text,
  created_at timestamptz DEFAULT now()
);

-- ===========================
-- INDEXES
-- ===========================
CREATE INDEX IF NOT EXISTS idx_pm_project_org ON core.pm_project(org_id);
CREATE INDEX IF NOT EXISTS idx_pm_project_owner ON core.pm_project(owner_id);
CREATE INDEX IF NOT EXISTS idx_pm_project_status ON core.pm_project(status);
CREATE INDEX IF NOT EXISTS idx_pm_project_visibility ON core.pm_project(visibility);

CREATE INDEX IF NOT EXISTS idx_pm_member_user ON core.pm_project_member(user_id);

CREATE INDEX IF NOT EXISTS idx_pm_status_project ON core.pm_status(project_id);
CREATE INDEX IF NOT EXISTS idx_pm_status_org ON core.pm_status(org_id);

CREATE INDEX IF NOT EXISTS idx_pm_label_project ON core.pm_label(project_id);

CREATE INDEX IF NOT EXISTS idx_pm_task_project ON core.pm_task(project_id);
CREATE INDEX IF NOT EXISTS idx_pm_task_org ON core.pm_task(org_id);
CREATE INDEX IF NOT EXISTS idx_pm_task_status ON core.pm_task(status_id);
CREATE INDEX IF NOT EXISTS idx_pm_task_assignee ON core.pm_task(primary_assignee_id);
CREATE INDEX IF NOT EXISTS idx_pm_task_due ON core.pm_task(due_date);
CREATE INDEX IF NOT EXISTS idx_pm_task_sprint ON core.pm_task(sprint_id);
CREATE INDEX IF NOT EXISTS idx_pm_task_milestone ON core.pm_task(milestone_id);
CREATE INDEX IF NOT EXISTS idx_pm_task_position ON core.pm_task(project_id, status_id, position);

CREATE INDEX IF NOT EXISTS idx_pm_task_assignee_task ON core.pm_task_assignee(task_id);
CREATE INDEX IF NOT EXISTS idx_pm_task_assignee_user ON core.pm_task_assignee(user_id);

CREATE INDEX IF NOT EXISTS idx_pm_dependency_task ON core.pm_task_dependency(task_id);
CREATE INDEX IF NOT EXISTS idx_pm_dependency_depends ON core.pm_task_dependency(depends_on_task_id);

CREATE INDEX IF NOT EXISTS idx_pm_sprint_project ON core.pm_sprint(project_id);
CREATE INDEX IF NOT EXISTS idx_pm_sprint_org ON core.pm_sprint(org_id);

CREATE INDEX IF NOT EXISTS idx_pm_milestone_project ON core.pm_milestone(project_id);
CREATE INDEX IF NOT EXISTS idx_pm_milestone_org ON core.pm_milestone(org_id);
CREATE INDEX IF NOT EXISTS idx_pm_milestone_due ON core.pm_milestone(due_date);

CREATE INDEX IF NOT EXISTS idx_pm_comment_entity ON core.pm_comment(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_pm_comment_org ON core.pm_comment(org_id);

CREATE INDEX IF NOT EXISTS idx_pm_attachment_entity ON core.pm_attachment(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_pm_attachment_doc ON core.pm_attachment(document_id);

CREATE INDEX IF NOT EXISTS idx_pm_view_org ON core.pm_view(org_id);
CREATE INDEX IF NOT EXISTS idx_pm_view_project ON core.pm_view(project_id);

CREATE INDEX IF NOT EXISTS idx_pm_portfolio_org ON core.pm_portfolio(org_id);
CREATE INDEX IF NOT EXISTS idx_pm_portfolio_project ON core.pm_portfolio_project(project_id);

CREATE INDEX IF NOT EXISTS idx_pm_custom_field_org ON core.pm_custom_field(org_id);
CREATE INDEX IF NOT EXISTS idx_pm_custom_field_project ON core.pm_custom_field(project_id);

CREATE INDEX IF NOT EXISTS idx_pm_activity_org ON core.pm_activity(org_id);
CREATE INDEX IF NOT EXISTS idx_pm_activity_entity ON core.pm_activity(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_pm_activity_created ON core.pm_activity(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pm_webhook_org ON core.pm_webhook(org_id);
CREATE INDEX IF NOT EXISTS idx_pm_webhook_active ON core.pm_webhook(is_active);

CREATE INDEX IF NOT EXISTS idx_pm_webhook_delivery_org ON core.pm_webhook_delivery(org_id);
CREATE INDEX IF NOT EXISTS idx_pm_webhook_delivery_status ON core.pm_webhook_delivery(status);

CREATE INDEX IF NOT EXISTS idx_pm_automation_org ON core.pm_automation_rule(org_id);
CREATE INDEX IF NOT EXISTS idx_pm_automation_project ON core.pm_automation_rule(project_id);
CREATE INDEX IF NOT EXISTS idx_pm_automation_status ON core.pm_automation_rule(status);

CREATE INDEX IF NOT EXISTS idx_pm_automation_run_org ON core.pm_automation_run(org_id);
CREATE INDEX IF NOT EXISTS idx_pm_automation_run_rule ON core.pm_automation_run(rule_id);
CREATE INDEX IF NOT EXISTS idx_pm_automation_run_created ON core.pm_automation_run(created_at DESC);

-- ===========================
-- TRIGGERS
-- ===========================
CREATE OR REPLACE FUNCTION core.pm_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS pm_project_updated_at ON core.pm_project;
CREATE TRIGGER pm_project_updated_at
  BEFORE UPDATE ON core.pm_project
  FOR EACH ROW EXECUTE FUNCTION core.pm_set_updated_at();

DROP TRIGGER IF EXISTS pm_status_updated_at ON core.pm_status;
CREATE TRIGGER pm_status_updated_at
  BEFORE UPDATE ON core.pm_status
  FOR EACH ROW EXECUTE FUNCTION core.pm_set_updated_at();

DROP TRIGGER IF EXISTS pm_label_updated_at ON core.pm_label;
CREATE TRIGGER pm_label_updated_at
  BEFORE UPDATE ON core.pm_label
  FOR EACH ROW EXECUTE FUNCTION core.pm_set_updated_at();

DROP TRIGGER IF EXISTS pm_task_updated_at ON core.pm_task;
CREATE TRIGGER pm_task_updated_at
  BEFORE UPDATE ON core.pm_task
  FOR EACH ROW EXECUTE FUNCTION core.pm_set_updated_at();

DROP TRIGGER IF EXISTS pm_sprint_updated_at ON core.pm_sprint;
CREATE TRIGGER pm_sprint_updated_at
  BEFORE UPDATE ON core.pm_sprint
  FOR EACH ROW EXECUTE FUNCTION core.pm_set_updated_at();

DROP TRIGGER IF EXISTS pm_milestone_updated_at ON core.pm_milestone;
CREATE TRIGGER pm_milestone_updated_at
  BEFORE UPDATE ON core.pm_milestone
  FOR EACH ROW EXECUTE FUNCTION core.pm_set_updated_at();

DROP TRIGGER IF EXISTS pm_comment_updated_at ON core.pm_comment;
CREATE TRIGGER pm_comment_updated_at
  BEFORE UPDATE ON core.pm_comment
  FOR EACH ROW EXECUTE FUNCTION core.pm_set_updated_at();

DROP TRIGGER IF EXISTS pm_view_updated_at ON core.pm_view;
CREATE TRIGGER pm_view_updated_at
  BEFORE UPDATE ON core.pm_view
  FOR EACH ROW EXECUTE FUNCTION core.pm_set_updated_at();

DROP TRIGGER IF EXISTS pm_portfolio_updated_at ON core.pm_portfolio;
CREATE TRIGGER pm_portfolio_updated_at
  BEFORE UPDATE ON core.pm_portfolio
  FOR EACH ROW EXECUTE FUNCTION core.pm_set_updated_at();

DROP TRIGGER IF EXISTS pm_custom_field_updated_at ON core.pm_custom_field;
CREATE TRIGGER pm_custom_field_updated_at
  BEFORE UPDATE ON core.pm_custom_field
  FOR EACH ROW EXECUTE FUNCTION core.pm_set_updated_at();

DROP TRIGGER IF EXISTS pm_webhook_updated_at ON core.pm_webhook;
CREATE TRIGGER pm_webhook_updated_at
  BEFORE UPDATE ON core.pm_webhook
  FOR EACH ROW EXECUTE FUNCTION core.pm_set_updated_at();

DROP TRIGGER IF EXISTS pm_webhook_delivery_updated_at ON core.pm_webhook_delivery;
CREATE TRIGGER pm_webhook_delivery_updated_at
  BEFORE UPDATE ON core.pm_webhook_delivery
  FOR EACH ROW EXECUTE FUNCTION core.pm_set_updated_at();

DROP TRIGGER IF EXISTS pm_automation_rule_updated_at ON core.pm_automation_rule;
CREATE TRIGGER pm_automation_rule_updated_at
  BEFORE UPDATE ON core.pm_automation_rule
  FOR EACH ROW EXECUTE FUNCTION core.pm_set_updated_at();

-- ===========================
-- REMOVE DART-AI STORAGE
-- ===========================
DROP POLICY IF EXISTS dartai_user_tokens_org_isolation ON auth.dartai_user_tokens;
DROP POLICY IF EXISTS dartai_token_audit_log_org_isolation ON auth.dartai_token_audit_log;

DROP TABLE IF EXISTS auth.dartai_token_audit_log;
DROP TABLE IF EXISTS auth.dartai_user_tokens;

COMMIT;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
