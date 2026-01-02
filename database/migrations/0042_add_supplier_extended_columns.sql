-- Migration 0042: Add Extended Supplier Columns
-- Date: 2026-01-02
-- Purpose: Add missing columns to core.supplier required by the application
-- 
-- These columns are expected by:
--   - /api/products/compare-suppliers
--   - SKUComparisonPanel component
--   - Supplier comparison features

-- ============================================================================
-- ADD MISSING COLUMNS TO core.supplier
-- ============================================================================

-- Add tier column (strategic/preferred/approved/conditional)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'core'
      AND table_name = 'supplier'
      AND column_name = 'tier'
  ) THEN
    ALTER TABLE core.supplier
    ADD COLUMN tier VARCHAR(20) CHECK (tier IN ('strategic', 'preferred', 'approved', 'conditional'));
    RAISE NOTICE 'Added tier column to core.supplier';
  ELSE
    RAISE NOTICE 'tier column already exists';
  END IF;
END $$;

-- Add lead_time column (default lead time in days)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'core'
      AND table_name = 'supplier'
      AND column_name = 'lead_time'
  ) THEN
    ALTER TABLE core.supplier
    ADD COLUMN lead_time INTEGER DEFAULT 0;
    RAISE NOTICE 'Added lead_time column to core.supplier';
  ELSE
    RAISE NOTICE 'lead_time column already exists';
  END IF;
END $$;

-- Add minimum_order_value column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'core'
      AND table_name = 'supplier'
      AND column_name = 'minimum_order_value'
  ) THEN
    ALTER TABLE core.supplier
    ADD COLUMN minimum_order_value NUMERIC(15,2);
    RAISE NOTICE 'Added minimum_order_value column to core.supplier';
  ELSE
    RAISE NOTICE 'minimum_order_value column already exists';
  END IF;
END $$;

-- Add preferred_supplier column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'core'
      AND table_name = 'supplier'
      AND column_name = 'preferred_supplier'
  ) THEN
    ALTER TABLE core.supplier
    ADD COLUMN preferred_supplier BOOLEAN DEFAULT false;
    RAISE NOTICE 'Added preferred_supplier column to core.supplier';
  ELSE
    RAISE NOTICE 'preferred_supplier column already exists';
  END IF;
END $$;

-- Add base_discount_percent column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'core'
      AND table_name = 'supplier'
      AND column_name = 'base_discount_percent'
  ) THEN
    ALTER TABLE core.supplier
    ADD COLUMN base_discount_percent NUMERIC(5,2) DEFAULT 0;
    RAISE NOTICE 'Added base_discount_percent column to core.supplier';
  ELSE
    RAISE NOTICE 'base_discount_percent column already exists';
  END IF;
END $$;

-- ============================================================================
-- ADD USEFUL INDEXES
-- ============================================================================

-- Index for tier filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_supplier_tier
ON core.supplier (tier)
WHERE tier IS NOT NULL;

-- Index for preferred supplier lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_supplier_preferred
ON core.supplier (preferred_supplier)
WHERE preferred_supplier = true;

-- ============================================================================
-- VERIFY COLUMNS WERE ADDED
-- ============================================================================

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'core'
  AND table_name = 'supplier'
  AND column_name IN ('tier', 'lead_time', 'minimum_order_value', 'preferred_supplier', 'base_discount_percent')
ORDER BY column_name;

