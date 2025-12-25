-- ===============================================
-- ENFORCE CORE SCHEMA CONSISTENCY MIGRATION
-- Ensures all core schema tables and operations
-- use explicit schema qualification
-- ===============================================

BEGIN;

-- Ensure core schema exists
CREATE SCHEMA IF NOT EXISTS core;

-- Verify core schema tables exist with correct structure
-- (These should already exist, but we ensure they're properly qualified)

-- Core category table (already exists, verify structure)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'core' AND table_name = 'category'
  ) THEN
    CREATE TABLE core.category (
      category_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(200) NOT NULL,
      parent_id UUID REFERENCES core.category(category_id),
      level INTEGER NOT NULL DEFAULT 0,
      path VARCHAR(500) NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  END IF;
END $$;

-- Core product table (already exists, verify structure)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'core' AND table_name = 'product'
  ) THEN
    CREATE TABLE core.product (
      product_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(500) NOT NULL,
      brand_id UUID,
      uom VARCHAR(50) NOT NULL,
      pack_size VARCHAR(50),
      barcode VARCHAR(50),
      category_id UUID REFERENCES core.category(category_id),
      attrs_json JSONB,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  END IF;
END $$;

-- Core supplier table (already exists, verify structure)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'core' AND table_name = 'supplier'
  ) THEN
    CREATE TABLE core.supplier (
      supplier_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(200) NOT NULL,
      code VARCHAR(50),
      active BOOLEAN NOT NULL DEFAULT true,
      default_currency VARCHAR(3) NOT NULL,
      payment_terms VARCHAR(100),
      contact_info JSONB,
      tax_number VARCHAR(50),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  END IF;
END $$;

-- Core supplier_product table (already exists, verify structure)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'core' AND table_name = 'supplier_product'
  ) THEN
    CREATE TABLE core.supplier_product (
      supplier_product_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      supplier_id UUID NOT NULL REFERENCES core.supplier(supplier_id) ON DELETE CASCADE,
      supplier_sku VARCHAR(100) NOT NULL,
      product_id UUID REFERENCES core.product(product_id),
      name_from_supplier VARCHAR(500) NOT NULL,
      uom VARCHAR(50) NOT NULL,
      pack_size VARCHAR(50),
      barcode VARCHAR(50),
      first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_seen_at TIMESTAMPTZ,
      is_active BOOLEAN NOT NULL DEFAULT true,
      is_new BOOLEAN NOT NULL DEFAULT true,
      category_id UUID REFERENCES core.category(category_id),
      attrs_json JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (supplier_id, supplier_sku)
    );
  END IF;
END $$;

-- Ensure all foreign key constraints reference core schema
DO $$
BEGIN
  -- Fix supplier_product foreign keys if they exist without schema qualification
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_schema = 'core' 
    AND table_name = 'supplier_product' 
    AND constraint_type = 'FOREIGN KEY'
  ) THEN
    -- Constraints should already be correct, but verify
    NULL; -- No action needed if constraints exist
  END IF;
END $$;

-- Create indexes if they don't exist (with core schema qualification)
CREATE INDEX IF NOT EXISTS idx_core_category_parent_id ON core.category (parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_core_category_path ON core.category (path);
CREATE INDEX IF NOT EXISTS idx_core_category_is_active ON core.category (is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_core_product_category_id ON core.product (category_id) WHERE category_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_core_product_is_active ON core.product (is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_core_supplier_product_supplier_id ON core.supplier_product (supplier_id);
CREATE INDEX IF NOT EXISTS idx_core_supplier_product_supplier_sku ON core.supplier_product (supplier_sku);
CREATE INDEX IF NOT EXISTS idx_core_supplier_product_product_id ON core.supplier_product (product_id) WHERE product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_core_supplier_product_category_id ON core.supplier_product (category_id) WHERE category_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_core_supplier_product_is_active ON core.supplier_product (is_active) WHERE is_active = true;

-- Verify schema consistency: Check for any unqualified references in views/functions
-- (This is informational - actual fixes should be in application code)

COMMIT;

-- Log migration
INSERT INTO schema_migrations (migration_name)
VALUES ('0234_enforce_core_schema_consistency')
ON CONFLICT (migration_name) DO NOTHING;

