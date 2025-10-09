-- ============================================================================
-- MantisNXT Database Schema Fixes - Phase 1
-- ============================================================================
-- Description: Critical schema fixes for missing tables and columns
-- ADRs: ADR-020 through ADR-025
-- Target: Enterprise PostgreSQL @ 62.169.20.53:6600
-- Author: Data Oracle
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
    'TRANSFER',      -- Transfer between warehouses
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
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

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

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES core.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES core.users(id) ON DELETE SET NULL,

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
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Movement details
  movement_type core.movement_type NOT NULL,
  product_id UUID NOT NULL REFERENCES core.products(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES core.warehouses(id) ON DELETE CASCADE,

  -- Quantity (negative for outbound, positive for inbound)
  quantity NUMERIC(10,2) NOT NULL,
  unit_of_measure VARCHAR(20) NOT NULL DEFAULT 'UNIT',

  -- Cost tracking
  cost_price NUMERIC(10,2),
  total_cost NUMERIC(12,2) GENERATED ALWAYS AS (quantity * COALESCE(cost_price, 0)) STORED,

  -- Reference to source document
  reference_type core.reference_type,
  reference_id UUID,
  reference_number VARCHAR(50),

  -- Additional context
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Audit fields
  created_by UUID REFERENCES core.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT stock_movement_quantity_not_zero CHECK (quantity != 0),
  CONSTRAINT stock_movement_cost_positive CHECK (cost_price IS NULL OR cost_price >= 0)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_stock_movement_product_time ON core.stock_movement(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movement_warehouse_time ON core.stock_movement(warehouse_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movement_reference ON core.stock_movement(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_stock_movement_created_at ON core.stock_movement(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movement_recent ON core.stock_movement(created_at DESC)
  WHERE created_at > NOW() - INTERVAL '90 days';

-- GIN index for metadata queries
CREATE INDEX IF NOT EXISTS idx_stock_movement_metadata ON core.stock_movement USING gin(metadata);

-- Comments
COMMENT ON TABLE core.stock_movement IS 'Complete audit trail of all inventory movements';
COMMENT ON COLUMN core.stock_movement.quantity IS 'Positive = inbound, Negative = outbound';
COMMENT ON COLUMN core.stock_movement.cost_price IS 'Cost per unit at time of movement';

-- ============================================================================
-- SECTION 4: ADD COST PRICE TO STOCK ON HAND (ADR-022)
-- ============================================================================

-- Add cost tracking columns
DO $$ BEGIN
  ALTER TABLE core.stock_on_hand ADD COLUMN IF NOT EXISTS cost_price NUMERIC(10,2);
  ALTER TABLE core.stock_on_hand ADD COLUMN IF NOT EXISTS cost_method core.cost_method DEFAULT 'WAC';
  ALTER TABLE core.stock_on_hand ADD COLUMN IF NOT EXISTS last_cost_update_at TIMESTAMPTZ;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

-- Add generated column for total value (drop first if exists)
DO $$ BEGIN
  ALTER TABLE core.stock_on_hand DROP COLUMN IF EXISTS total_value;
  ALTER TABLE core.stock_on_hand ADD COLUMN total_value NUMERIC(12,2)
    GENERATED ALWAYS AS (quantity * COALESCE(cost_price, 0)) STORED;
EXCEPTION
  WHEN others THEN NULL;
END $$;

-- Add constraints
DO $$ BEGIN
  ALTER TABLE core.stock_on_hand
  ADD CONSTRAINT stock_on_hand_cost_positive CHECK (cost_price IS NULL OR cost_price >= 0);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Comments
COMMENT ON COLUMN core.stock_on_hand.cost_price IS 'Current unit cost (weighted average)';
COMMENT ON COLUMN core.stock_on_hand.cost_method IS 'Costing method: FIFO, LIFO, WAC, SPECIFIC';
COMMENT ON COLUMN core.stock_on_hand.total_value IS 'Total inventory value (quantity * cost_price)';

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
  -- Only update cost for inbound movements with cost_price
  IF NEW.quantity > 0 AND NEW.cost_price IS NOT NULL THEN

    -- Get current stock
    SELECT quantity, cost_price INTO v_current_qty, v_current_cost
    FROM core.stock_on_hand
    WHERE product_id = NEW.product_id AND warehouse_id = NEW.warehouse_id;

    IF FOUND AND v_current_qty > 0 THEN
      -- Calculate weighted average cost
      v_new_cost := (
        (v_current_qty * COALESCE(v_current_cost, 0)) +
        (NEW.quantity * NEW.cost_price)
      ) / (v_current_qty + NEW.quantity);

      -- Update stock_on_hand with new cost
      UPDATE core.stock_on_hand
      SET
        cost_price = v_new_cost,
        last_cost_update_at = NOW()
      WHERE product_id = NEW.product_id AND warehouse_id = NEW.warehouse_id;
    ELSIF FOUND THEN
      -- First receipt or restocking after stockout
      UPDATE core.stock_on_hand
      SET
        cost_price = NEW.cost_price,
        last_cost_update_at = NOW()
      WHERE product_id = NEW.product_id AND warehouse_id = NEW.warehouse_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS stock_movement_update_cost ON core.stock_movement;
CREATE TRIGGER stock_movement_update_cost
AFTER INSERT ON core.stock_movement
FOR EACH ROW
EXECUTE FUNCTION core.update_stock_cost_on_movement();

-- ============================================================================
-- SECTION 6: ADD SUPPLIER CONTACT FIELDS (ADR-023)
-- ============================================================================

-- Add contact fields
DO $$ BEGIN
  ALTER TABLE core.suppliers ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(50);
  ALTER TABLE core.suppliers ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255);
  ALTER TABLE core.suppliers ADD COLUMN IF NOT EXISTS website TEXT;
  ALTER TABLE core.suppliers ADD COLUMN IF NOT EXISTS payment_terms VARCHAR(100) DEFAULT 'Net 30';
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

-- Email validation constraint
DO $$ BEGIN
  ALTER TABLE core.suppliers
  ADD CONSTRAINT suppliers_email_format
    CHECK (
      contact_email IS NULL OR
      contact_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Phone validation constraint
DO $$ BEGIN
  ALTER TABLE core.suppliers
  ADD CONSTRAINT suppliers_phone_format
    CHECK (
      contact_phone IS NULL OR
      contact_phone ~ '^\+?[0-9\s\-\(\)]{7,}$'
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Website validation constraint
DO $$ BEGIN
  ALTER TABLE core.suppliers
  ADD CONSTRAINT suppliers_website_format
    CHECK (
      website IS NULL OR
      website ~* '^https?://.*'
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Indexes for lookups
CREATE INDEX IF NOT EXISTS idx_suppliers_email ON core.suppliers(contact_email)
  WHERE contact_email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_suppliers_phone ON core.suppliers(contact_phone)
  WHERE contact_phone IS NOT NULL;

-- Comments
COMMENT ON COLUMN core.suppliers.contact_phone IS 'Primary contact phone (international format)';
COMMENT ON COLUMN core.suppliers.contact_email IS 'Primary contact email address';
COMMENT ON COLUMN core.suppliers.website IS 'Company website URL';
COMMENT ON COLUMN core.suppliers.payment_terms IS 'Default payment terms (e.g., Net 30, Net 60, COD)';

-- ============================================================================
-- SECTION 7: UPDATE FOREIGN KEY CONSTRAINTS (ADR-024)
-- ============================================================================

-- Products → Stock on Hand (CASCADE)
ALTER TABLE core.stock_on_hand
DROP CONSTRAINT IF EXISTS stock_on_hand_product_id_fkey;
ALTER TABLE core.stock_on_hand
ADD CONSTRAINT stock_on_hand_product_id_fkey
FOREIGN KEY (product_id) REFERENCES core.products(id) ON DELETE CASCADE;

-- Products → Stock Movement (CASCADE)
ALTER TABLE core.stock_movement
DROP CONSTRAINT IF EXISTS stock_movement_product_id_fkey;
ALTER TABLE core.stock_movement
ADD CONSTRAINT stock_movement_product_id_fkey
FOREIGN KEY (product_id) REFERENCES core.products(id) ON DELETE CASCADE;

-- Warehouses → Stock on Hand (RESTRICT)
ALTER TABLE core.stock_on_hand
DROP CONSTRAINT IF EXISTS stock_on_hand_warehouse_id_fkey;
ALTER TABLE core.stock_on_hand
ADD CONSTRAINT stock_on_hand_warehouse_id_fkey
FOREIGN KEY (warehouse_id) REFERENCES core.warehouses(id) ON DELETE RESTRICT;

-- Warehouses → Stock Movement (CASCADE)
ALTER TABLE core.stock_movement
DROP CONSTRAINT IF EXISTS stock_movement_warehouse_id_fkey;
ALTER TABLE core.stock_movement
ADD CONSTRAINT stock_movement_warehouse_id_fkey
FOREIGN KEY (warehouse_id) REFERENCES core.warehouses(id) ON DELETE CASCADE;

-- Brand → Products (SET NULL)
ALTER TABLE core.products
DROP CONSTRAINT IF EXISTS products_brand_id_fkey;
ALTER TABLE core.products
ADD CONSTRAINT products_brand_id_fkey
FOREIGN KEY (brand_id) REFERENCES core.brand(id) ON DELETE SET NULL;

-- Categories → Products (SET NULL) - if categories table exists
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'core' AND table_name = 'categories') THEN
    ALTER TABLE core.products
    DROP CONSTRAINT IF EXISTS products_category_id_fkey;
    ALTER TABLE core.products
    ADD CONSTRAINT products_category_id_fkey
    FOREIGN KEY (category_id) REFERENCES core.categories(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================================
-- SECTION 8: PERFORMANCE INDEXES (ADR-025)
-- ============================================================================

-- Partial indexes for active records
CREATE INDEX IF NOT EXISTS idx_stock_on_hand_active ON core.stock_on_hand(product_id, warehouse_id)
  WHERE quantity > 0;

CREATE INDEX IF NOT EXISTS idx_suppliers_active ON core.suppliers(id, name)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_products_active ON core.products(id, name, sku)
  WHERE is_active = true;

-- Composite index for inventory valuation
CREATE INDEX IF NOT EXISTS idx_stock_on_hand_valuation ON core.stock_on_hand(warehouse_id)
  INCLUDE (product_id, quantity, cost_price)
  WHERE quantity > 0;

-- Case-insensitive search indexes
CREATE INDEX IF NOT EXISTS idx_products_name_lower ON core.products(LOWER(name));
CREATE INDEX IF NOT EXISTS idx_products_sku_lower ON core.products(LOWER(sku));
CREATE INDEX IF NOT EXISTS idx_suppliers_name_lower ON core.suppliers(LOWER(name));

-- Full-text search indexes
CREATE INDEX IF NOT EXISTS idx_products_search ON core.products USING gin(
  to_tsvector('english', COALESCE(name, '') || ' ' || COALESCE(description, ''))
);

CREATE INDEX IF NOT EXISTS idx_suppliers_search ON core.suppliers USING gin(
  to_tsvector('english', COALESCE(name, '') || ' ' || COALESCE(description, ''))
);

-- ============================================================================
-- SECTION 9: MATERIALIZED VIEWS (ADR-025)
-- ============================================================================

-- 1. Inventory Valuation Summary
DROP MATERIALIZED VIEW IF EXISTS core.mv_inventory_valuation CASCADE;
CREATE MATERIALIZED VIEW core.mv_inventory_valuation AS
SELECT
  w.id as warehouse_id,
  w.name as warehouse_name,
  w.code as warehouse_code,
  COUNT(DISTINCT soh.product_id) as product_count,
  SUM(soh.quantity) as total_units,
  SUM(soh.total_value) as total_value,
  AVG(soh.cost_price) as avg_unit_cost,
  NOW() as last_refresh
FROM core.warehouses w
LEFT JOIN core.stock_on_hand soh ON soh.warehouse_id = w.id AND soh.quantity > 0
GROUP BY w.id, w.name, w.code;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_inventory_valuation_pk ON core.mv_inventory_valuation(warehouse_id);

-- 2. Product Stock Summary
DROP MATERIALIZED VIEW IF EXISTS core.mv_product_stock_summary CASCADE;
CREATE MATERIALIZED VIEW core.mv_product_stock_summary AS
SELECT
  p.id as product_id,
  p.name,
  p.sku,
  b.name as brand_name,
  SUM(soh.quantity) as total_quantity,
  COUNT(DISTINCT soh.warehouse_id) as warehouse_count,
  SUM(soh.total_value) as total_value,
  AVG(soh.cost_price) as avg_cost,
  MIN(soh.last_cost_update_at) as oldest_cost_date,
  NOW() as last_refresh
FROM core.products p
LEFT JOIN core.brand b ON b.id = p.brand_id
LEFT JOIN core.stock_on_hand soh ON soh.product_id = p.id AND soh.quantity > 0
WHERE p.is_active = true
GROUP BY p.id, p.name, p.sku, b.name;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_product_stock_pk ON core.mv_product_stock_summary(product_id);
CREATE INDEX IF NOT EXISTS idx_mv_product_stock_quantity ON core.mv_product_stock_summary(total_quantity DESC);
CREATE INDEX IF NOT EXISTS idx_mv_product_stock_value ON core.mv_product_stock_summary(total_value DESC);

-- 3. Low Stock Alert View
DROP MATERIALIZED VIEW IF EXISTS core.mv_low_stock_alerts CASCADE;
CREATE MATERIALIZED VIEW core.mv_low_stock_alerts AS
SELECT
  p.id as product_id,
  p.name,
  p.sku,
  w.id as warehouse_id,
  w.name as warehouse_name,
  soh.quantity,
  p.min_stock_level,
  p.max_stock_level,
  (p.min_stock_level - soh.quantity) as units_below_min,
  CASE
    WHEN soh.quantity <= 0 THEN 'OUT_OF_STOCK'
    WHEN soh.quantity < p.min_stock_level * 0.5 THEN 'CRITICAL'
    WHEN soh.quantity < p.min_stock_level THEN 'LOW'
    ELSE 'WARNING'
  END as severity,
  NOW() as last_refresh
FROM core.stock_on_hand soh
JOIN core.products p ON p.id = soh.product_id
JOIN core.warehouses w ON w.id = soh.warehouse_id
WHERE p.is_active = true
  AND p.min_stock_level IS NOT NULL
  AND soh.quantity < p.min_stock_level;

CREATE INDEX IF NOT EXISTS idx_mv_low_stock_severity ON core.mv_low_stock_alerts(severity, product_id);
CREATE INDEX IF NOT EXISTS idx_mv_low_stock_warehouse ON core.mv_low_stock_alerts(warehouse_id, severity);

-- Function to refresh all materialized views
CREATE OR REPLACE FUNCTION core.refresh_all_inventory_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY core.mv_inventory_valuation;
  REFRESH MATERIALIZED VIEW CONCURRENTLY core.mv_product_stock_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY core.mv_low_stock_alerts;

  RAISE NOTICE 'All inventory materialized views refreshed at %', NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SECTION 10: DATA BACKFILL
-- ============================================================================

-- Backfill brand data from brand_from_supplier
INSERT INTO core.brand (name, code, created_at)
SELECT DISTINCT
  TRIM(brand_from_supplier) as name,
  UPPER(LEFT(REGEXP_REPLACE(TRIM(brand_from_supplier), '[^a-zA-Z0-9]', '', 'g'), 10)) as code,
  NOW()
FROM core.products
WHERE brand_from_supplier IS NOT NULL
  AND TRIM(brand_from_supplier) != ''
  AND LENGTH(TRIM(brand_from_supplier)) > 0
ON CONFLICT DO NOTHING;

-- Update product.brand_id based on brand_from_supplier
UPDATE core.products p
SET brand_id = b.id
FROM core.brand b
WHERE LOWER(TRIM(p.brand_from_supplier)) = LOWER(b.name)
  AND p.brand_id IS NULL
  AND p.brand_from_supplier IS NOT NULL;

-- Backfill supplier contact data from metadata JSONB
UPDATE core.suppliers
SET
  contact_email = COALESCE(contact_email, metadata->>'email'),
  contact_phone = COALESCE(contact_phone, metadata->>'phone'),
  website = COALESCE(website, metadata->>'website'),
  payment_terms = COALESCE(payment_terms, metadata->>'payment_terms', 'Net 30')
WHERE metadata IS NOT NULL
  AND (
    (contact_email IS NULL AND metadata ? 'email') OR
    (contact_phone IS NULL AND metadata ? 'phone') OR
    (website IS NULL AND metadata ? 'website') OR
    (payment_terms IS NULL AND metadata ? 'payment_terms')
  );

-- Backfill cost_price from stock_movement (if data exists)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'core' AND table_name = 'stock_movement') THEN
    WITH latest_costs AS (
      SELECT DISTINCT ON (product_id, warehouse_id)
        product_id,
        warehouse_id,
        cost_price,
        created_at
      FROM core.stock_movement
      WHERE cost_price IS NOT NULL AND quantity > 0
      ORDER BY product_id, warehouse_id, created_at DESC
    )
    UPDATE core.stock_on_hand soh
    SET
      cost_price = lc.cost_price,
      last_cost_update_at = lc.created_at,
      cost_method = 'WAC'
    FROM latest_costs lc
    WHERE soh.product_id = lc.product_id
      AND soh.warehouse_id = lc.warehouse_id
      AND soh.cost_price IS NULL;
  END IF;
END $$;

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
BEGIN
  SELECT COUNT(*) INTO v_brand_count FROM core.brand;
  SELECT COUNT(*) INTO v_products_with_brand FROM core.products WHERE brand_id IS NOT NULL;
  SELECT COUNT(*) INTO v_suppliers_with_email FROM core.suppliers WHERE contact_email IS NOT NULL;

  RAISE NOTICE 'Brands created: %', v_brand_count;
  RAISE NOTICE 'Products with brand: %', v_products_with_brand;
  RAISE NOTICE 'Suppliers with email: %', v_suppliers_with_email;
END $$;

COMMIT;

-- ============================================================================
-- POST-MIGRATION NOTES
-- ============================================================================

-- After successful migration, run these queries to verify:

-- 1. Check foreign key constraints
-- SELECT con.conname, pg_get_constraintdef(con.oid)
-- FROM pg_constraint con
-- JOIN pg_class rel ON rel.oid = con.conrelid
-- WHERE rel.relname IN ('stock_on_hand', 'stock_movement', 'products', 'suppliers');

-- 2. Refresh materialized views
-- SELECT core.refresh_all_inventory_views();

-- 3. Verify inventory valuation
-- SELECT * FROM core.mv_inventory_valuation;

-- 4. Check for orphaned records (should be 0)
-- SELECT COUNT(*) FROM core.stock_on_hand soh
-- LEFT JOIN core.products p ON p.id = soh.product_id
-- WHERE p.id IS NULL;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
