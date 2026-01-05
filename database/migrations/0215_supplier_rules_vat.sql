-- Migration: 0215_supplier_rules_vat
-- Description: Add supplier rules, VAT handling, and enhanced pricelist processing
-- Author: MantisNXT Team
-- Date: 2024-11-18

BEGIN;

-- Add columns to spp.pricelist_row for VAT and stock handling
ALTER TABLE spp.pricelist_row 
ADD COLUMN IF NOT EXISTS cost_price_ex_vat NUMERIC(12,2),
ADD COLUMN IF NOT EXISTS price_incl_vat NUMERIC(12,2),
ADD COLUMN IF NOT EXISTS vat_rate NUMERIC(5,4) DEFAULT 0.15,
ADD COLUMN IF NOT EXISTS stock_on_order INT DEFAULT 0;

-- Create supplier_rules table for storing supplier-specific rules
CREATE TABLE IF NOT EXISTS spp.supplier_rules (
    id SERIAL PRIMARY KEY,
    supplier_id UUID NOT NULL REFERENCES core.supplier(supplier_id) ON DELETE CASCADE,
    rule_name TEXT NOT NULL,
    rule_type TEXT NOT NULL CHECK (rule_type IN ('transformation', 'validation', 'approval', 'notification')),
    trigger_event TEXT NOT NULL DEFAULT 'pricelist_upload',
    execution_order INTEGER NOT NULL DEFAULT 1,
    is_blocking BOOLEAN NOT NULL DEFAULT false,
    rule_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(supplier_id, rule_name)
);

-- Create supplier_pricelist_mappings table for learned header mappings
CREATE TABLE IF NOT EXISTS spp.supplier_pricelist_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL REFERENCES core.supplier(supplier_id) ON DELETE CASCADE,
    header_signature TEXT NOT NULL,
    field_mappings JSONB NOT NULL,
    approved_by UUID,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(supplier_id, header_signature)
);

-- Create supplier_rule_executions table for audit trail
CREATE TABLE IF NOT EXISTS spp.supplier_rule_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL REFERENCES core.supplier(supplier_id) ON DELETE CASCADE,
    upload_id TEXT NOT NULL,
    rule_id INTEGER NOT NULL REFERENCES spp.supplier_rules(id) ON DELETE CASCADE,
    rule_name TEXT NOT NULL,
    rule_type TEXT NOT NULL,
    execution_order INTEGER NOT NULL,
    passed BOOLEAN NOT NULL,
    blocked BOOLEAN NOT NULL,
    error_message TEXT,
    transformed_data JSONB,
    execution_time_ms INTEGER,
    execution_result JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_supplier_rules_supplier_id ON spp.supplier_rules(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_rules_rule_type ON spp.supplier_rules(rule_type);
CREATE INDEX IF NOT EXISTS idx_supplier_pricelist_mappings_supplier_id ON spp.supplier_pricelist_mappings(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_rule_executions_supplier_id ON spp.supplier_rule_executions(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_rule_executions_upload_id ON spp.supplier_rule_executions(upload_id);
CREATE INDEX IF NOT EXISTS idx_supplier_rule_executions_created_at ON spp.supplier_rule_executions(created_at DESC);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON spp.supplier_rules TO PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON spp.supplier_pricelist_mappings TO PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON spp.supplier_rule_executions TO PUBLIC;
GRANT SELECT ON spp.supplier_rules TO PUBLIC;
GRANT SELECT ON spp.supplier_pricelist_mappings TO PUBLIC;
GRANT SELECT ON spp.supplier_rule_executions TO PUBLIC;

-- RLS policies omitted in this environment

COMMIT;

INSERT INTO schema_migrations (migration_name)
VALUES ('0215_supplier_rules_vat')
ON CONFLICT (migration_name) DO NOTHING;