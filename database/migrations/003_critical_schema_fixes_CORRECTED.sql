-- ============================================================================
-- MantisNXT Database Schema Fixes - Phase 1 (CORRECTED)
-- ============================================================================
-- Description: Critical schema fixes for missing tables and columns
-- ADRs: ADR-020 through ADR-025
-- Target: Enterprise PostgreSQL @ 62.169.20.53:6600
-- Schema: Uses actual table names (singular: product, supplier, stock_location)
-- Author: Data Oracle (corrected by development phase)
-- Date: 2025-10-08
-- ============================================================================

BEGIN;

-- ============================================================================
-- SECTION 1: CREATE ENUMS
-- ============================================================================

-- Movement type enum
DO $$ BEGIN
  CREATE TYPE core.movement_type AS ENUM (
    'RECEIPT',       -- Goods received from supplier
    'SHIPMENT',      -- Goods shipped to customer
    'ADJUSTMENT',    -- Manual stock adjustment
    'TRANSFER',      -- Transfer between locations
    'RETURN',        -- Return from customer
    'DAMAGED',       -- Damaged goods write-off
    'THEFT',         -- Theft/loss write-off
    'PRODUCTION'     -- Manufacturing usage/output
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Reference type enum
DO $$ BEGIN
  CREATE TYPE core.reference_type AS ENUM (
    'PURCHASE_ORDER',
    'SALES_ORDER',
    'TRANSFER_ORDER',
    'MANUAL_ADJUSTMENT',
    'SYSTEM_ADJUSTMENT',
    'STOCK_COUNT'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Cost method enum
DO $$ BEGIN
  CREATE TYPE core.cost_method AS ENUM (
    'FIFO',      -- First In First Out
    'LIFO',      -- Last In First Out
    'WAC',       -- Weighted Average Cost
    'SPECIFIC'   -- Specific Identification
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- SECTION 2: CREATE BRAND TABLE (ADR-021)
-- ============================================================================

CREATE TABLE IF NOT EXISTS core.brand (
  brand_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Brand identification
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50),

  -- Brand details
  description TEXT,
  website TEXT,
  logo_url TEXT,
  country_of_origin VARCHAR(100),

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Audit (no user FK since core.users doesn't exist)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT brand_website_format CHECK (website IS NULL OR website ~* '^https?://.*')
);

-- Unique constraints (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS idx_brand_name_unique ON core.brand(LOWER(name));
CREATE UNIQUE INDEX IF NOT EXISTS idx_brand_code_unique ON core.brand(code) WHERE code IS NOT NULL;

-- Standard indexes
CREATE INDEX IF NOT EXISTS idx_brand_active ON core.brand(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_brand_metadata ON core.brand USING gin(metadata);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION core.update_brand_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS brand_update_timestamp ON core.brand;
CREATE TRIGGER brand_update_timestamp
BEFORE UPDATE ON core.brand
FOR EACH ROW
EXECUTE FUNCTION core.update_brand_timestamp();

-- Comments
COMMENT ON TABLE core.brand IS 'Standardized brand catalog for product classification';
COMMENT ON COLUMN core.brand.name IS 'Official brand name (case-insensitive unique)';
COMMENT ON COLUMN core.brand.code IS 'Brand code/abbreviation for internal use';

-- ============================================================================
-- SECTION 3: CREATE STOCK MOVEMENT TABLE (ADR-020)
-- ============================================================================

CREATE TABLE IF NOT EXISTS core.stock_movement (
  movement_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Movement details
  movement_type core.movement_type NOT NULL,
  supplier_product_id UUID NOT NULL REFERENCES core.supplier_product(supplier_product_id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES core.stock_location(location_id) ON DELETE CASCADE,

  -- Quantity (negative for outbound, positive for inbound)
  qty NUMERIC(18,4) NOT NULL,
  uom VARCHAR(50) NOT NULL DEFAULT 'EA',

  -- Cost tracking
  unit_cost NUMERIC(18,4),
  total_cost NUMERIC(18,4) GENERATED ALWAYS AS (qty * COALESCE(unit_cost, 0)) STORED,

  -- Reference to source document
  reference_type core.reference_type,
  reference_id UUID,
  reference_doc VARCHAR(100),

  -- Additional context
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamp
  movement_ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT stock_movement_qty_not_zero CHECK (qty != 0),
  CONSTRAINT stock_movement_cost_positive CHECK (unit_cost IS NULL OR unit_cost >= 0)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_stock_movement_product_time ON core.stock_movement(supplier_product_id, movement_ts DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movement_location_time ON core.stock_movement(location_id, movement_ts DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movement_reference ON core.stock_movement(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_stock_movement_created_at ON core.stock_movement(movement_ts DESC);
-- Removed idx_stock_movement_recent - NOW() is not immutable for index predicates
-- Use partial index without time-based predicate instead
CREATE INDEX IF NOT EXISTS idx_stock_movement_recent ON core.stock_movement(movement_ts DESC);

-- GIN index for metadata queries
CREATE INDEX IF NOT EXISTS idx_stock_movement_metadata ON core.stock_movement USING gin(metadata);

-- Comments
COMMENT ON TABLE core.stock_movement IS 'Complete audit trail of all inventory movements';
COMMENT ON COLUMN core.stock_movement.qty IS 'Positive = inbound, Negative = outbound';
COMMENT ON COLUMN core.stock_movement.unit_cost IS 'Cost per unit at time of movement';

-- ============================================================================
-- SECTION 4: ADD COST METHOD TO STOCK ON HAND (ADR-022)
-- ============================================================================

-- Add cost method column (unit_cost already exists in schema)
DO $$ BEGIN
  ALTER TABLE core.stock_on_hand ADD COLUMN IF NOT EXISTS cost_method core.cost_method DEFAULT 'WAC';
  ALTER TABLE core.stock_on_hand ADD COLUMN IF NOT EXISTS last_cost_update_at TIMESTAMPTZ;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

-- Comments
COMMENT ON COLUMN core.stock_on_hand.unit_cost IS 'Current unit cost (weighted average)';
COMMENT ON COLUMN core.stock_on_hand.cost_method IS 'Costing method: FIFO, LIFO, WAC, SPECIFIC';
COMMENT ON COLUMN core.stock_on_hand.total_value IS 'Total inventory value (qty * unit_cost)';

-- ============================================================================
-- SECTION 5: CREATE COST UPDATE TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION core.update_stock_cost_on_movement()
RETURNS TRIGGER AS $$
DECLARE
  v_current_qty NUMERIC;
  v_current_cost NUMERIC;
  v_new_cost NUMERIC;
BEGIN
  -- Only update cost for inbound movements with unit_cost
  IF NEW.qty > 0 AND NEW.unit_cost IS NOT NULL THEN

    -- Get current stock
    SELECT qty, unit_cost INTO v_current_qty, v_current_cost
    FROM core.stock_on_hand
    WHERE supplier_product_id = NEW.supplier_product_id AND location_id = NEW.location_id;

    IF FOUND AND v_current_qty > 0 THEN
      -- Calculate weighted average cost
      v_new_cost := (
        (v_current_qty * COALESCE(v_current_cost, 0)) +
        (NEW.qty * NEW.unit_cost)
      ) / (v_current_qty + NEW.qty);

      -- Update stock_on_hand with new cost
      UPDATE core.stock_on_hand
      SET
        unit_cost = v_new_cost,
        total_value = (qty + NEW.qty) * v_new_cost,
        last_cost_update_at = NOW(),
        qty = qty + NEW.qty
      WHERE supplier_product_id = NEW.supplier_product_id AND location_id = NEW.location_id;
    ELSIF FOUND THEN
      -- First receipt or restocking after stockout
      UPDATE core.stock_on_hand
      SET
        unit_cost = NEW.unit_cost,
        total_value = NEW.qty * NEW.unit_cost,
        last_cost_update_at = NOW(),
        qty = NEW.qty
      WHERE supplier_product_id = NEW.supplier_product_id AND location_id = NEW.location_id;
    ELSE
      -- Create new stock record
      INSERT INTO core.stock_on_hand (location_id, supplier_product_id, qty, unit_cost, total_value, cost_method, last_cost_update_at, as_of_ts, source)
      VALUES (NEW.location_id, NEW.supplier_product_id, NEW.qty, NEW.unit_cost, NEW.qty * NEW.unit_cost, 'WAC', NOW(), NOW(), 'movement');
    END IF;
  ELSIF NEW.qty < 0 THEN
    -- Outbound movement - reduce quantity only
    UPDATE core.stock_on_hand
    SET qty = qty + NEW.qty,  -- NEW.qty is negative
        total_value = (qty + NEW.qty) * COALESCE(unit_cost, 0)
    WHERE supplier_product_id = NEW.supplier_product_id AND location_id = NEW.location_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS stock_movement_update_stock ON core.stock_movement;
CREATE TRIGGER stock_movement_update_stock
AFTER INSERT ON core.stock_movement
FOR EACH ROW
EXECUTE FUNCTION core.update_stock_cost_on_movement();

-- ============================================================================
-- SECTION 6: ADD SUPPLIER CONTACT FIELDS (ADR-023)
-- ============================================================================

-- Add contact fields (contact_info JSONB already exists, add flat fields)
DO $$ BEGIN
  ALTER TABLE core.supplier ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(50);
  ALTER TABLE core.supplier ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255);
  ALTER TABLE core.supplier ADD COLUMN IF NOT EXISTS website TEXT;
  ALTER TABLE core.supplier ADD COLUMN IF NOT EXISTS payment_terms_days INTEGER DEFAULT 30;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

-- Email validation constraint
DO $$ BEGIN
  ALTER TABLE core.supplier
  ADD CONSTRAINT supplier_email_format
    CHECK (
      contact_email IS NULL OR
      contact_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Phone validation constraint
DO $$ BEGIN
  ALTER TABLE core.supplier
  ADD CONSTRAINT supplier_phone_format
    CHECK (
      contact_phone IS NULL OR
      contact_phone ~ '^\+?[0-9\s\-\(\)]{7,}$'
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Website validation constraint
DO $$ BEGIN
  ALTER TABLE core.supplier
  ADD CONSTRAINT supplier_website_format
    CHECK (
      website IS NULL OR
      website ~* '^https?://.*'
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Indexes for lookups
CREATE INDEX IF NOT EXISTS idx_supplier_email ON core.supplier(contact_email)
  WHERE contact_email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_supplier_phone ON core.supplier(contact_phone)
  WHERE contact_phone IS NOT NULL;

-- Comments
COMMENT ON COLUMN core.supplier.contact_phone IS 'Primary contact phone (international format)';
COMMENT ON COLUMN core.supplier.contact_email IS 'Primary contact email address';
COMMENT ON COLUMN core.supplier.website IS 'Company website URL';
COMMENT ON COLUMN core.supplier.payment_terms_days IS 'Default payment terms in days (30, 60, 90, etc.)';

-- ============================================================================
-- SECTION 7: ADD BRAND FIELD TO SUPPLIER_PRODUCT (ADR-023)
-- ============================================================================

-- Add brand_from_supplier if not exists (it might already exist)
DO $$ BEGIN
  ALTER TABLE core.supplier_product ADD COLUMN IF NOT EXISTS brand_from_supplier VARCHAR(255);
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

COMMENT ON COLUMN core.supplier_product.brand_from_supplier IS 'Brand name as provided by supplier';

-- ============================================================================
-- SECTION 8: UPDATE PRODUCT TABLE TO LINK BRAND
-- ============================================================================

-- Update product.brand_id FK to reference core.brand
ALTER TABLE core.product
DROP CONSTRAINT IF EXISTS product_brand_id_fkey;
ALTER TABLE core.product
ADD CONSTRAINT product_brand_id_fkey
FOREIGN KEY (brand_id) REFERENCES core.brand(brand_id) ON DELETE SET NULL;

-- ============================================================================
-- SECTION 9: PERFORMANCE INDEXES (ADR-025)
-- ============================================================================

-- Partial indexes for active records
CREATE INDEX IF NOT EXISTS idx_stock_on_hand_active ON core.stock_on_hand(supplier_product_id, location_id)
  WHERE qty > 0;

CREATE INDEX IF NOT EXISTS idx_supplier_active ON core.supplier(supplier_id, name)
  WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_product_active ON core.product(product_id, name)
  WHERE is_active = true;

-- Composite index for inventory valuation
CREATE INDEX IF NOT EXISTS idx_stock_on_hand_valuation ON core.stock_on_hand(location_id)
  INCLUDE (supplier_product_id, qty, unit_cost)
  WHERE qty > 0;

-- Case-insensitive search indexes
CREATE INDEX IF NOT EXISTS idx_product_name_lower ON core.product(LOWER(name));
CREATE INDEX IF NOT EXISTS idx_supplier_name_lower ON core.supplier(LOWER(name));

-- Full-text search indexes (if not exists)
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_product_search ON core.product USING gin(
    to_tsvector('english', COALESCE(name, ''))
  );
EXCEPTION
  WHEN duplicate_table THEN NULL;
END $$;

-- ============================================================================
-- SECTION 10: DATA BACKFILL
-- ============================================================================

-- Backfill brand data from supplier_product.brand_from_supplier
INSERT INTO core.brand (name, code, created_at)
SELECT DISTINCT
  TRIM(brand_from_supplier) as name,
  UPPER(LEFT(REGEXP_REPLACE(TRIM(brand_from_supplier), '[^a-zA-Z0-9]', '', 'g'), 10)) as code,
  NOW()
FROM core.supplier_product
WHERE brand_from_supplier IS NOT NULL
  AND TRIM(brand_from_supplier) != ''
  AND LENGTH(TRIM(brand_from_supplier)) > 0
ON CONFLICT (LOWER(name)) DO NOTHING;

-- Update product.brand_id based on supplier_product.brand_from_supplier
UPDATE core.product p
SET brand_id = brand_map.brand_id
FROM (
  SELECT DISTINCT ON (sp.product_id)
    sp.product_id,
    b.brand_id
  FROM core.supplier_product sp
  JOIN core.brand b ON LOWER(TRIM(sp.brand_from_supplier)) = LOWER(b.name)
  WHERE sp.brand_from_supplier IS NOT NULL
    AND sp.product_id IS NOT NULL
) AS brand_map
WHERE p.product_id = brand_map.product_id
  AND p.brand_id IS NULL;

-- Backfill supplier contact data from contact_info JSONB
UPDATE core.supplier
SET
  contact_email = COALESCE(contact_email, contact_info->>'email'),
  contact_phone = COALESCE(contact_phone, contact_info->>'phone'),
  website = COALESCE(website, contact_info->>'website'),
  payment_terms_days = COALESCE(payment_terms_days, (contact_info->>'payment_terms_days')::integer, 30)
WHERE contact_info IS NOT NULL
  AND (
    (contact_email IS NULL AND contact_info ? 'email') OR
    (contact_phone IS NULL AND contact_info ? 'phone') OR
    (website IS NULL AND contact_info ? 'website') OR
    (payment_terms_days IS NULL AND contact_info ? 'payment_terms_days')
  );

-- ============================================================================
-- VALIDATION QUERIES
-- ============================================================================

-- Verify tables created
DO $$
DECLARE
  v_brand_exists BOOLEAN;
  v_stock_movement_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'core' AND table_name = 'brand'
  ) INTO v_brand_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'core' AND table_name = 'stock_movement'
  ) INTO v_stock_movement_exists;

  RAISE NOTICE 'Brand table exists: %', v_brand_exists;
  RAISE NOTICE 'Stock movement table exists: %', v_stock_movement_exists;

  IF NOT v_brand_exists OR NOT v_stock_movement_exists THEN
    RAISE EXCEPTION 'Critical tables not created!';
  END IF;
END $$;

-- Count records created
DO $$
DECLARE
  v_brand_count INTEGER;
  v_products_with_brand INTEGER;
  v_suppliers_with_email INTEGER;
  v_supplier_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_brand_count FROM core.brand;
  SELECT COUNT(*) INTO v_products_with_brand FROM core.product WHERE brand_id IS NOT NULL;
  SELECT COUNT(*) INTO v_suppliers_with_email FROM core.supplier WHERE contact_email IS NOT NULL;
  SELECT COUNT(*) INTO v_supplier_count FROM core.supplier;

  RAISE NOTICE 'Brands created: %', v_brand_count;
  RAISE NOTICE 'Products with brand: %', v_products_with_brand;
  RAISE NOTICE 'Suppliers with email: %', v_suppliers_with_email;
  RAISE NOTICE 'Total suppliers: %', v_supplier_count;
END $$;

COMMIT;

-- ============================================================================
-- POST-MIGRATION NOTES
-- ============================================================================

-- After successful migration, verify with:

-- 1. Check foreign key constraints
-- SELECT con.conname, pg_get_constraintdef(con.oid)
-- FROM pg_constraint con
-- JOIN pg_class rel ON rel.oid = con.conrelid
-- JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
-- WHERE nsp.nspname = 'core'
-- AND rel.relname IN ('stock_on_hand', 'stock_movement', 'product', 'supplier');

-- 2. Verify stock movement table
-- SELECT COUNT(*) FROM core.stock_movement;

-- 3. Check brand linkage
-- SELECT COUNT(*) as products_with_brands FROM core.product WHERE brand_id IS NOT NULL;

-- 4. Verify supplier contact data
-- SELECT
--   COUNT(*) as total,
--   COUNT(contact_email) as with_email,
--   COUNT(contact_phone) as with_phone
-- FROM core.supplier;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
