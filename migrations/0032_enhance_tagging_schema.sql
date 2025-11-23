-- Migration: Enhance Tagging Schema with Product Enrichment Support
-- Description: Adds short_description column, product name validation, enhances tag tables,
--              and creates enrichment logging infrastructure
-- Project: proud-mud-50346856

BEGIN;

-- Step 0: Ensure basic tag infrastructure exists (create if not present)
CREATE TABLE IF NOT EXISTS core.ai_tag_library (
  tag_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'custom',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS core.ai_tag_assignment (
  supplier_product_id UUID NOT NULL REFERENCES core.supplier_product(supplier_product_id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_by TEXT,
  PRIMARY KEY (supplier_product_id, tag_id)
);

CREATE TABLE IF NOT EXISTS core.ai_tag_rule (
  rule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL DEFAULT 'keyword',
  keyword TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_tag_assignment_tag ON core.ai_tag_assignment(tag_id);
CREATE INDEX IF NOT EXISTS idx_ai_tag_assignment_product ON core.ai_tag_assignment(supplier_product_id);
CREATE INDEX IF NOT EXISTS idx_ai_tag_rule_keyword ON core.ai_tag_rule(keyword);

-- Step 1: Add short_description column to core.supplier_product
ALTER TABLE core.supplier_product
  ADD COLUMN IF NOT EXISTS short_description TEXT;

-- Step 2: Add full_description to attrs_json structure (stored in JSONB)
-- Note: We'll access this via attrs_json->>'full_description' in queries
-- No column needed as it's in JSONB

-- Step 3: Add constraint to prevent product names from being SKU numbers
-- This will be enforced at application level, but we add a check constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'check_name_not_sku'
    AND conrelid = 'core.supplier_product'::regclass
  ) THEN
    ALTER TABLE core.supplier_product
      ADD CONSTRAINT check_name_not_sku 
      CHECK (name_from_supplier != supplier_sku);
  END IF;
END $$;

-- Step 4: Enhance core.ai_tag_library table
ALTER TABLE core.ai_tag_library
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS color VARCHAR(7), -- Hex color code
  ADD COLUMN IF NOT EXISTS icon VARCHAR(50), -- Icon identifier
  ADD COLUMN IF NOT EXISTS parent_tag_id TEXT REFERENCES core.ai_tag_library(tag_id),
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::JSONB,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Step 5: Create ai_tag_suggestion table for AI-generated tag suggestions
CREATE TABLE IF NOT EXISTS core.ai_tag_suggestion (
  suggestion_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_product_id UUID NOT NULL REFERENCES core.supplier_product(supplier_product_id) ON DELETE CASCADE,
  suggested_tags JSONB NOT NULL DEFAULT '[]'::JSONB, -- Array of {tag_id, confidence, reason}
  confidence DECIMAL(5,4) NOT NULL DEFAULT 0.0 CHECK (confidence >= 0.0 AND confidence <= 1.0),
  model_used TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'applied')),
  reviewed_by TEXT
);

-- Step 6: Create ai_tag_metadata table for structured metadata
CREATE TABLE IF NOT EXISTS core.ai_tag_metadata (
  metadata_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_id TEXT NOT NULL REFERENCES core.ai_tag_library(tag_id) ON DELETE CASCADE,
  supplier_product_id UUID NOT NULL REFERENCES core.supplier_product(supplier_product_id) ON DELETE CASCADE,
  metadata_key TEXT NOT NULL,
  metadata_value JSONB NOT NULL,
  source VARCHAR(20) NOT NULL DEFAULT 'ai' CHECK (source IN ('ai', 'manual', 'web_research')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tag_id, supplier_product_id, metadata_key)
);

-- Step 7: Create product_enrichment_log table for audit trail
CREATE TABLE IF NOT EXISTS core.product_enrichment_log (
  enrichment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_product_id UUID NOT NULL REFERENCES core.supplier_product(supplier_product_id) ON DELETE CASCADE,
  enrichment_type VARCHAR(50) NOT NULL CHECK (enrichment_type IN ('web_research', 'ai_tagging', 'description_update', 'name_correction', 'full_enrichment')),
  source_data JSONB, -- Original product data before enrichment
  changes_applied JSONB NOT NULL, -- What was changed: {field: value}
  confidence DECIMAL(5,4) CHECK (confidence >= 0.0 AND confidence <= 1.0),
  web_research_results JSONB, -- Cached web research data
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT
);

-- Step 8: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tag_library_parent ON core.ai_tag_library(parent_tag_id) WHERE parent_tag_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tag_library_active ON core.ai_tag_library(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_tag_suggestion_product ON core.ai_tag_suggestion(supplier_product_id);
CREATE INDEX IF NOT EXISTS idx_tag_suggestion_status ON core.ai_tag_suggestion(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_tag_suggestion_created ON core.ai_tag_suggestion(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tag_metadata_tag_product ON core.ai_tag_metadata(tag_id, supplier_product_id);
CREATE INDEX IF NOT EXISTS idx_tag_metadata_product ON core.ai_tag_metadata(supplier_product_id);

CREATE INDEX IF NOT EXISTS idx_enrichment_log_product ON core.product_enrichment_log(supplier_product_id);
CREATE INDEX IF NOT EXISTS idx_enrichment_log_type ON core.product_enrichment_log(enrichment_type);
CREATE INDEX IF NOT EXISTS idx_enrichment_log_created ON core.product_enrichment_log(created_at DESC);

-- Step 9: Create materialized view for tag analytics (refresh manually or via cron)
CREATE MATERIALIZED VIEW IF NOT EXISTS core.tag_analytics AS
SELECT 
  t.tag_id,
  t.name AS tag_name,
  t.type AS tag_type,
  COUNT(DISTINCT a.supplier_product_id) AS product_count,
  COUNT(DISTINCT CASE WHEN sp.is_active THEN a.supplier_product_id END) AS active_product_count,
  MIN(a.assigned_at) AS first_assignment,
  MAX(a.assigned_at) AS last_assignment,
  COUNT(DISTINCT DATE_TRUNC('day', a.assigned_at)) AS days_with_assignments
FROM core.ai_tag_library t
LEFT JOIN core.ai_tag_assignment a ON t.tag_id = a.tag_id
LEFT JOIN core.supplier_product sp ON a.supplier_product_id = sp.supplier_product_id
WHERE t.is_active = true
GROUP BY t.tag_id, t.name, t.type;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tag_analytics_tag_id ON core.tag_analytics(tag_id);

-- Step 10: Create function to refresh tag analytics
CREATE OR REPLACE FUNCTION core.refresh_tag_analytics()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY core.tag_analytics;
END;
$$;

-- Step 11: Add trigger to update updated_at on ai_tag_library
CREATE OR REPLACE FUNCTION core.update_tag_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tag_library_updated_at ON core.ai_tag_library;
CREATE TRIGGER trg_tag_library_updated_at
  BEFORE UPDATE ON core.ai_tag_library
  FOR EACH ROW
  EXECUTE FUNCTION core.update_tag_updated_at();

-- Step 12: Create function to validate product name is not SKU
CREATE OR REPLACE FUNCTION core.validate_product_name_not_sku()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.name_from_supplier = NEW.supplier_sku THEN
    RAISE EXCEPTION 'Product name cannot be the same as SKU. Please provide a descriptive product name.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_product_name ON core.supplier_product;
CREATE TRIGGER trg_validate_product_name
  BEFORE INSERT OR UPDATE ON core.supplier_product
  FOR EACH ROW
  EXECUTE FUNCTION core.validate_product_name_not_sku();

COMMIT;

-- Log migration
INSERT INTO schema_migrations (migration_name)
VALUES ('0032_enhance_tagging_schema')
ON CONFLICT (migration_name) DO NOTHING;

