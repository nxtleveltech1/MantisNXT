BEGIN;

-- Ensure UUID support for default values
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Ensure schema_migrations tracking table exists for legacy scripts
CREATE TABLE IF NOT EXISTS schema_migrations (
  migration_name TEXT PRIMARY KEY,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Recreate canonical schema surface expected by application dashboards
CREATE SCHEMA IF NOT EXISTS core;

-- Core supplier master
CREATE TABLE IF NOT EXISTS core.supplier (
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

-- Core category taxonomy
CREATE TABLE IF NOT EXISTS core.category (
  category_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  parent_id UUID REFERENCES core.category(category_id),
  level INTEGER NOT NULL DEFAULT 0,
  path VARCHAR(500) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Core product catalog
CREATE TABLE IF NOT EXISTS core.product (
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

-- Core supplier product mapping
CREATE TABLE IF NOT EXISTS core.supplier_product (
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

-- Core price history (SCD2) expected by analytics endpoints
CREATE TABLE IF NOT EXISTS core.price_history (
  price_history_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_product_id UUID NOT NULL REFERENCES core.supplier_product(supplier_product_id) ON DELETE CASCADE,
  price DECIMAL(15, 4) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  valid_from TIMESTAMPTZ NOT NULL,
  valid_to TIMESTAMPTZ,
  is_current BOOLEAN NOT NULL DEFAULT true,
  change_reason VARCHAR(500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Core inventory selections
CREATE TABLE IF NOT EXISTS core.inventory_selection (
  selection_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  selection_name VARCHAR(200) NOT NULL,
  description TEXT,
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  valid_from TIMESTAMPTZ,
  valid_to TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Core inventory selected items
CREATE TABLE IF NOT EXISTS core.inventory_selected_item (
  selection_item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  selection_id UUID NOT NULL REFERENCES core.inventory_selection(selection_id) ON DELETE CASCADE,
  supplier_product_id UUID NOT NULL REFERENCES core.supplier_product(supplier_product_id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'selected' CHECK (status IN ('selected', 'deselected', 'pending_approval')),
  notes TEXT,
  selected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  selected_by VARCHAR(255) NOT NULL,
  quantity_min INTEGER,
  quantity_max INTEGER,
  reorder_point INTEGER,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (selection_id, supplier_product_id)
);

-- Core stock locations
CREATE TABLE IF NOT EXISTS core.stock_location (
  location_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('internal', 'supplier', 'consignment', 'main', 'virtual', 'dropship')),
  supplier_id UUID REFERENCES core.supplier(supplier_id),
  address TEXT,
  metadata JSONB DEFAULT '{}'::JSONB,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Core stock on hand snapshots
CREATE TABLE IF NOT EXISTS core.stock_on_hand (
  soh_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES core.stock_location(location_id) ON DELETE CASCADE,
  supplier_product_id UUID NOT NULL REFERENCES core.supplier_product(supplier_product_id) ON DELETE CASCADE,
  qty INTEGER NOT NULL DEFAULT 0,
  unit_cost DECIMAL(15, 4),
  total_value DECIMAL(15, 4) GENERATED ALWAYS AS (qty * COALESCE(unit_cost, 0)) STORED,
  as_of_ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source VARCHAR(20) NOT NULL DEFAULT 'system' CHECK (source IN ('manual', 'import', 'system')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (location_id, supplier_product_id)
);

-- Baseline indexes for application access patterns
CREATE INDEX IF NOT EXISTS idx_core_supplier_active ON core.supplier (active);
CREATE INDEX IF NOT EXISTS idx_core_supplier_code ON core.supplier (code) WHERE code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_core_category_parent_id ON core.category (parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_core_category_path ON core.category (path);

CREATE INDEX IF NOT EXISTS idx_core_product_category_id ON core.product (category_id) WHERE category_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_core_product_active ON core.product (is_active);

CREATE INDEX IF NOT EXISTS idx_core_supplier_product_supplier_id ON core.supplier_product (supplier_id);
CREATE INDEX IF NOT EXISTS idx_core_supplier_product_supplier_sku ON core.supplier_product (supplier_sku);
CREATE INDEX IF NOT EXISTS idx_core_supplier_product_product_id ON core.supplier_product (product_id) WHERE product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_core_supplier_product_is_active ON core.supplier_product (is_active);

CREATE INDEX IF NOT EXISTS idx_core_price_history_supplier_product_id ON core.price_history (supplier_product_id);
CREATE INDEX IF NOT EXISTS idx_core_price_history_valid_from ON core.price_history (valid_from DESC);
CREATE INDEX IF NOT EXISTS idx_core_price_history_is_current ON core.price_history (is_current) WHERE is_current = true;

CREATE INDEX IF NOT EXISTS idx_core_inventory_selection_status ON core.inventory_selection (status);
CREATE INDEX IF NOT EXISTS idx_core_inventory_selection_created_at ON core.inventory_selection (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_core_inventory_selected_item_selection_id ON core.inventory_selected_item (selection_id);
CREATE INDEX IF NOT EXISTS idx_core_inventory_selected_item_supplier_product_id ON core.inventory_selected_item (supplier_product_id);
CREATE INDEX IF NOT EXISTS idx_core_inventory_selected_item_status ON core.inventory_selected_item (status);

CREATE INDEX IF NOT EXISTS idx_core_stock_location_type ON core.stock_location (type);
CREATE INDEX IF NOT EXISTS idx_core_stock_location_active ON core.stock_location (is_active);

CREATE INDEX IF NOT EXISTS idx_core_stock_on_hand_location_id ON core.stock_on_hand (location_id);
CREATE INDEX IF NOT EXISTS idx_core_stock_on_hand_supplier_product_id ON core.stock_on_hand (supplier_product_id);
CREATE INDEX IF NOT EXISTS idx_core_stock_on_hand_as_of_ts ON core.stock_on_hand (as_of_ts DESC);

COMMIT;

INSERT INTO schema_migrations (migration_name)
VALUES ('0207_restore_core_price_history')
ON CONFLICT (migration_name) DO NOTHING;

