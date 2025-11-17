BEGIN;

CREATE SCHEMA IF NOT EXISTS spp;

CREATE TABLE IF NOT EXISTS public.supplier_rules (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  supplier_id UUID NOT NULL,
  rule_name TEXT NOT NULL,
  rule_type TEXT NOT NULL,
  trigger_event TEXT NOT NULL DEFAULT 'pricelist_upload',
  execution_order INTEGER NOT NULL DEFAULT 0,
  rule_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message_template TEXT,
  is_blocking BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_supplier_rules_supplier ON public.supplier_rules(supplier_id, is_active);
CREATE INDEX IF NOT EXISTS idx_supplier_rules_trigger ON public.supplier_rules(trigger_event);

CREATE TABLE IF NOT EXISTS public.supplier_profiles (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  supplier_id UUID NOT NULL,
  profile_name TEXT NOT NULL DEFAULT 'default',
  guidelines JSONB DEFAULT '{}'::jsonb,
  processing_config JSONB DEFAULT '{}'::jsonb,
  quality_standards JSONB DEFAULT '{}'::jsonb,
  compliance_rules JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (supplier_id, profile_name)
);

CREATE INDEX IF NOT EXISTS idx_supplier_profiles_supplier ON public.supplier_profiles(supplier_id, is_active);

CREATE TABLE IF NOT EXISTS public.supplier_rule_executions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  supplier_id UUID NOT NULL,
  rule_id BIGINT NOT NULL,
  operation_type TEXT NOT NULL,
  operation_id UUID,
  sku TEXT,
  rule_name TEXT,
  rule_type TEXT,
  execution_status TEXT NOT NULL,
  execution_result JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  execution_time_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_supplier_rule_exec_supplier ON public.supplier_rule_executions(supplier_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_supplier_rule_exec_rule ON public.supplier_rule_executions(rule_id);

COMMIT;

INSERT INTO schema_migrations (migration_name)
VALUES ('0212_supplier_rules_engine')
ON CONFLICT (migration_name) DO NOTHING;