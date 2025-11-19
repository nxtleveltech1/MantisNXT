-- Migration to fix supplier profile consistency and schema alignment
-- This migration ensures all supplier-related tables are properly aligned

BEGIN;

-- Ensure supplier_profiles table exists with proper constraints
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

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_supplier_profiles_supplier ON public.supplier_profiles(supplier_id, is_active);

-- Ensure supplier_rules table exists in public schema (not spp)
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_supplier_rules_supplier ON public.supplier_rules(supplier_id, is_active);
CREATE INDEX IF NOT EXISTS idx_supplier_rules_trigger ON public.supplier_rules(trigger_event);

-- Ensure supplier_rule_executions table exists
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_supplier_rule_exec_supplier ON public.supplier_rule_executions(supplier_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_supplier_rule_exec_rule ON public.supplier_rule_executions(rule_id);

-- Migrate any existing data from spp schema to public schema
INSERT INTO public.supplier_rules (
  supplier_id, rule_name, rule_type, trigger_event, execution_order, 
  rule_config, error_message_template, is_blocking, is_active, created_at, updated_at
)
SELECT 
  supplier_id, rule_name, rule_type, trigger_event, execution_order,
  rule_config, error_message_template, is_blocking, is_active, created_at, updated_at
FROM spp.supplier_rules 
WHERE supplier_id NOT IN (SELECT supplier_id FROM public.supplier_rules)
ON CONFLICT DO NOTHING;

-- Create default supplier profiles for existing suppliers that don't have them
INSERT INTO public.supplier_profiles (
  supplier_id, profile_name, guidelines, processing_config, quality_standards, compliance_rules, is_active
)
SELECT 
  s.id as supplier_id,
  'default' as profile_name,
  '{
    "inventory_management": {
      "auto_approve": false,
      "validation_required": true,
      "max_upload_size": 10485760
    },
    "pricing": {
      "currency": "ZAR",
      "tax_inclusive": false,
      "markup_percentage": 0
    },
    "business_rules": {
      "minimum_order_value": 100,
      "payment_terms": "Net 30",
      "delivery_timeframe": "7-14 days"
    }
  }'::jsonb as guidelines,
  '{
    "upload_validation": {
      "required_fields": ["sku", "name", "price"],
      "price_range": {"min": 0, "max": 100000},
      "file_formats": ["xlsx", "csv"]
    },
    "transformation_rules": {
      "auto_format": true,
      "standardize_names": false,
      "currency_conversion": false
    }
  }'::jsonb as processing_config,
  '{
    "quality_checks": {
      "duplicate_detection": true,
      "price_validation": true,
      "data_completeness": 0.8,
      "image_requirements": false
    },
    "approval_workflow": {
      "tier_1_required": true,
      "tier_2_required": false,
      "auto_approve_threshold": 0
    }
  }'::jsonb as quality_standards,
  '{
    "business_rules": {
      "supplier_certification_required": false,
      "tax_compliance_required": true,
      "environmental_standards": false
    },
    "regulatory": {
      "requires_approval": false,
      "restricted_categories": []
    }
  }'::jsonb as compliance_rules,
  true as is_active
FROM public.suppliers s
WHERE s.id NOT IN (SELECT supplier_id FROM public.supplier_profiles WHERE profile_name = 'default')
AND s.status = 'active';

-- Add foreign key constraints (if they don't exist and the referenced tables exist)
-- Note: These are commented out as they may fail if the referenced tables don't exist
-- ALTER TABLE public.supplier_profiles ADD CONSTRAINT fk_supplier_profiles_supplier 
--   FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE CASCADE;
-- 
-- ALTER TABLE public.supplier_rules ADD CONSTRAINT fk_supplier_rules_supplier 
--   FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE CASCADE;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplier_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplier_rules TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplier_rule_executions TO authenticated;

GRANT SELECT ON public.supplier_profiles TO anon;
GRANT SELECT ON public.supplier_rules TO anon;
GRANT SELECT ON public.supplier_rule_executions TO anon;

COMMIT;

-- Record migration completion
INSERT INTO schema_migrations (migration_name)
VALUES ('fix_supplier_profile_consistency')
ON CONFLICT (migration_name) DO NOTHING;