-- Migration: Add Category Migration Log Table
-- Description: Creates table to track category migration for products
-- Generated: 2025-12-18

BEGIN;

-- Category migration log table
CREATE TABLE IF NOT EXISTS core.category_migration_log (
  log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL,
  product_type TEXT NOT NULL CHECK (product_type IN ('product', 'supplier_product')),
  old_category_id UUID REFERENCES core.category(category_id) ON DELETE SET NULL,
  old_category_name TEXT,
  new_category_id UUID REFERENCES core.category(category_id) ON DELETE SET NULL,
  new_category_name TEXT,
  mapping_confidence TEXT CHECK (mapping_confidence IN ('high', 'low', 'manual', 'unmapped')),
  migrated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  migrated_by TEXT,
  notes TEXT
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_category_migration_log_product_id ON core.category_migration_log(product_id);
CREATE INDEX IF NOT EXISTS idx_category_migration_log_product_type ON core.category_migration_log(product_type);
CREATE INDEX IF NOT EXISTS idx_category_migration_log_old_category ON core.category_migration_log(old_category_id);
CREATE INDEX IF NOT EXISTS idx_category_migration_log_new_category ON core.category_migration_log(new_category_id);
CREATE INDEX IF NOT EXISTS idx_category_migration_log_confidence ON core.category_migration_log(mapping_confidence);
CREATE INDEX IF NOT EXISTS idx_category_migration_log_migrated_at ON core.category_migration_log(migrated_at DESC);

-- Category mapping table (stores approved mappings from old to new categories)
CREATE TABLE IF NOT EXISTS core.category_mapping (
  mapping_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  old_category_id UUID NOT NULL REFERENCES core.category(category_id) ON DELETE CASCADE,
  old_category_name TEXT NOT NULL,
  new_category_id UUID NOT NULL REFERENCES core.category(category_id) ON DELETE CASCADE,
  new_category_name TEXT NOT NULL,
  confidence TEXT CHECK (confidence IN ('high', 'low', 'manual')),
  mapping_method TEXT, -- 'exact_match', 'fuzzy_match', 'manual', etc.
  similarity_score NUMERIC(5,4), -- For fuzzy matches
  approved BOOLEAN NOT NULL DEFAULT false,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(old_category_id, new_category_id)
);

CREATE INDEX IF NOT EXISTS idx_category_mapping_old_category ON core.category_mapping(old_category_id);
CREATE INDEX IF NOT EXISTS idx_category_mapping_new_category ON core.category_mapping(new_category_id);
CREATE INDEX IF NOT EXISTS idx_category_mapping_approved ON core.category_mapping(approved);

COMMIT;

