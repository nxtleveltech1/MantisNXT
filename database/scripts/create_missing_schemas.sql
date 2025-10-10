-- Create Missing Schemas and Tables for NXT-SPP System
-- This script initializes any missing schemas and core tables based on type definitions

\echo 'Creating missing schemas and tables for NXT-SPP system...'
\echo '===================================================='

-- Ensure UUID generation support for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create schemas if not exist
CREATE SCHEMA IF NOT EXISTS spp;    -- Staging/isolation layer
CREATE SCHEMA IF NOT EXISTS core;   -- Canonical master data
CREATE SCHEMA IF NOT EXISTS serve;  -- Read-optimized views

\echo '✓ Schemas created/verified'

-- ============================================================================
-- SPP SCHEMA TABLES (Staging Layer)
-- ============================================================================

-- SPP: Pricelist upload metadata
CREATE TABLE IF NOT EXISTS spp.pricelist_upload (
    upload_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    filename VARCHAR(255) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    valid_from TIMESTAMPTZ NOT NULL,
    valid_to TIMESTAMPTZ,
    row_count INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'validating', 'validated', 'merged', 'failed', 'rejected')),
    errors_json JSONB,
    processed_by VARCHAR(255),
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- SPP: Individual pricelist rows
CREATE TABLE IF NOT EXISTS spp.pricelist_row (
    upload_id UUID NOT NULL REFERENCES spp.pricelist_upload(upload_id) ON DELETE CASCADE,
    row_num INTEGER NOT NULL,
    supplier_sku VARCHAR(100) NOT NULL,
    name VARCHAR(500) NOT NULL,
    brand VARCHAR(100),
    uom VARCHAR(50) NOT NULL,
    pack_size VARCHAR(50),
    price DECIMAL(15,4) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    category_raw VARCHAR(200),
    vat_code VARCHAR(20),
    barcode VARCHAR(50),
    attrs_json JSONB,
    validation_errors TEXT[],
    PRIMARY KEY (upload_id, row_num)
);

\echo '✓ SPP schema tables created/verified'

-- ============================================================================
-- CORE SCHEMA TABLES (Canonical Master Data)
-- ============================================================================

-- CORE: Supplier master record
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

-- CORE: Category taxonomy with hierarchical path support
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

-- CORE: Internal product master catalog
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

-- CORE: Supplier product mapping
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
    UNIQUE(supplier_id, supplier_sku)
);

-- CORE: Price history with SCD Type 2 support
CREATE TABLE IF NOT EXISTS core.price_history (
    price_history_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_product_id UUID NOT NULL REFERENCES core.supplier_product(supplier_product_id) ON DELETE CASCADE,
    price DECIMAL(15,4) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    valid_from TIMESTAMPTZ NOT NULL,
    valid_to TIMESTAMPTZ,
    is_current BOOLEAN NOT NULL DEFAULT true,
    change_reason VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- CORE: Inventory selection (ISI) - what we chose to stock
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

-- CORE: Selected items within a selection
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
    UNIQUE(selection_id, supplier_product_id)
);

-- CORE: Stock location
CREATE TABLE IF NOT EXISTS core.stock_location (
    location_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('internal', 'supplier', 'consignment')),
    supplier_id UUID REFERENCES core.supplier(supplier_id),
    address TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- CORE: Stock on hand snapshot
CREATE TABLE IF NOT EXISTS core.stock_on_hand (
    soh_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID NOT NULL REFERENCES core.stock_location(location_id) ON DELETE CASCADE,
    supplier_product_id UUID NOT NULL REFERENCES core.supplier_product(supplier_product_id) ON DELETE CASCADE,
    qty INTEGER NOT NULL DEFAULT 0,
    unit_cost DECIMAL(15,4),
    total_value DECIMAL(15,4) GENERATED ALWAYS AS (qty * COALESCE(unit_cost, 0)) STORED,
    as_of_ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source VARCHAR(20) NOT NULL DEFAULT 'system' CHECK (source IN ('manual', 'import', 'system')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(location_id, supplier_product_id)
);

\echo '✓ CORE schema tables created/verified'

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- SPP indexes
CREATE INDEX IF NOT EXISTS idx_spp_pricelist_upload_supplier_id ON spp.pricelist_upload(supplier_id);
CREATE INDEX IF NOT EXISTS idx_spp_pricelist_upload_status ON spp.pricelist_upload(status);
CREATE INDEX IF NOT EXISTS idx_spp_pricelist_upload_created_at ON spp.pricelist_upload(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_spp_pricelist_row_upload_id ON spp.pricelist_row(upload_id);

-- CORE indexes
CREATE INDEX IF NOT EXISTS idx_core_supplier_active ON core.supplier(active);
CREATE INDEX IF NOT EXISTS idx_core_supplier_code ON core.supplier(code) WHERE code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_core_category_parent_id ON core.category(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_core_category_path ON core.category(path);
CREATE INDEX IF NOT EXISTS idx_core_category_level ON core.category(level);

CREATE INDEX IF NOT EXISTS idx_core_product_category_id ON core.product(category_id) WHERE category_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_core_product_brand_id ON core.product(brand_id) WHERE brand_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_core_product_active ON core.product(is_active);

CREATE INDEX IF NOT EXISTS idx_core_supplier_product_supplier_id ON core.supplier_product(supplier_id);
CREATE INDEX IF NOT EXISTS idx_core_supplier_product_supplier_sku ON core.supplier_product(supplier_sku);
CREATE INDEX IF NOT EXISTS idx_core_supplier_product_product_id ON core.supplier_product(product_id) WHERE product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_core_supplier_product_active ON core.supplier_product(is_active);
CREATE INDEX IF NOT EXISTS idx_core_supplier_product_is_new ON core.supplier_product(is_new);

CREATE INDEX IF NOT EXISTS idx_core_price_history_supplier_product_id ON core.price_history(supplier_product_id);
CREATE INDEX IF NOT EXISTS idx_core_price_history_valid_from ON core.price_history(valid_from DESC);
CREATE INDEX IF NOT EXISTS idx_core_price_history_is_current ON core.price_history(is_current) WHERE is_current = true;

CREATE INDEX IF NOT EXISTS idx_core_inventory_selection_status ON core.inventory_selection(status);
CREATE INDEX IF NOT EXISTS idx_core_inventory_selection_created_at ON core.inventory_selection(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_core_inventory_selected_item_selection_id ON core.inventory_selected_item(selection_id);
CREATE INDEX IF NOT EXISTS idx_core_inventory_selected_item_supplier_product_id ON core.inventory_selected_item(supplier_product_id);
CREATE INDEX IF NOT EXISTS idx_core_inventory_selected_item_status ON core.inventory_selected_item(status);

CREATE INDEX IF NOT EXISTS idx_core_stock_location_type ON core.stock_location(type);
CREATE INDEX IF NOT EXISTS idx_core_stock_location_active ON core.stock_location(is_active);

CREATE INDEX IF NOT EXISTS idx_core_stock_on_hand_location_id ON core.stock_on_hand(location_id);
CREATE INDEX IF NOT EXISTS idx_core_stock_on_hand_supplier_product_id ON core.stock_on_hand(supplier_product_id);
CREATE INDEX IF NOT EXISTS idx_core_stock_on_hand_as_of_ts ON core.stock_on_hand(as_of_ts DESC);

\echo '✓ Performance indexes created/verified'

-- ============================================================================
-- SERVE SCHEMA VIEWS (Read-Optimized)
-- ============================================================================

-- SERVE: Product table by supplier view
CREATE OR REPLACE VIEW serve.v_product_table_by_supplier AS
WITH current_prices AS (
  SELECT DISTINCT ON (supplier_product_id)
    supplier_product_id,
    price AS current_price,
    currency,
    valid_from AS current_valid_from
  FROM core.price_history
  WHERE is_current = true
  ORDER BY supplier_product_id, valid_from DESC
),
ranked_ph AS (
  SELECT
    supplier_product_id,
    price,
    currency,
    valid_from,
    ROW_NUMBER() OVER (PARTITION BY supplier_product_id ORDER BY valid_from DESC) AS rn
  FROM core.price_history
),
previous_prices AS (
  SELECT p1.supplier_product_id,
         p2.price AS previous_price
  FROM ranked_ph p1
  JOIN ranked_ph p2
    ON p1.supplier_product_id = p2.supplier_product_id
   AND p1.rn = 1
   AND p2.rn = 2
)
SELECT 
  sp.supplier_id,
  s.name AS supplier_name,
  sp.supplier_product_id,
  sp.supplier_sku,
  sp.name_from_supplier,
  sp.uom,
  sp.pack_size,
  c.name AS category_name,
  cp.current_price,
  prev.previous_price,
  CASE WHEN prev.previous_price IS NOT NULL AND prev.previous_price <> 0
       THEN ROUND(((cp.current_price - prev.previous_price) / prev.previous_price) * 100, 2)
       ELSE NULL END AS price_change_pct,
  cp.currency,
  sp.is_new,
  CASE WHEN sp.product_id IS NOT NULL THEN true ELSE false END AS is_mapped,
  CASE WHEN isi.selection_item_id IS NOT NULL THEN true ELSE false END AS is_selected,
  sp.first_seen_at,
  sp.last_seen_at,
  sp.product_id AS internal_product_id,
  p.name AS internal_product_name
FROM core.supplier_product sp
JOIN core.supplier s ON s.supplier_id = sp.supplier_id
LEFT JOIN core.category c ON c.category_id = sp.category_id
LEFT JOIN core.product p ON p.product_id = sp.product_id
LEFT JOIN current_prices cp ON cp.supplier_product_id = sp.supplier_product_id
LEFT JOIN previous_prices prev ON prev.supplier_product_id = sp.supplier_product_id
LEFT JOIN core.inventory_selected_item isi ON isi.supplier_product_id = sp.supplier_product_id 
  AND isi.status = 'selected'
  AND isi.selection_id IN (SELECT selection_id FROM core.inventory_selection WHERE status = 'active')
WHERE sp.is_active = true;

-- SERVE: Selected catalog view
CREATE OR REPLACE VIEW serve.v_selected_catalog AS
SELECT 
    sel.selection_id,
    sel.selection_name,
    sp.supplier_product_id,
    sp.supplier_id,
    s.name as supplier_name,
    sp.supplier_sku,
    sp.name_from_supplier as product_name,
    ph.price as current_price,
    ph.currency,
    c.name as category_name,
    CASE WHEN soh.soh_id IS NOT NULL THEN true ELSE false END as is_in_stock,
    soh.qty as qty_on_hand,
    isi.selected_at
FROM core.inventory_selection sel
JOIN core.inventory_selected_item isi ON isi.selection_id = sel.selection_id
JOIN core.supplier_product sp ON sp.supplier_product_id = isi.supplier_product_id
JOIN core.supplier s ON s.supplier_id = sp.supplier_id
LEFT JOIN core.category c ON c.category_id = sp.category_id
LEFT JOIN core.price_history ph ON ph.supplier_product_id = sp.supplier_product_id AND ph.is_current = true
LEFT JOIN core.stock_on_hand soh ON soh.supplier_product_id = sp.supplier_product_id
WHERE sel.status = 'active' AND isi.status = 'selected';

-- SERVE: Stock on hand by supplier view
CREATE OR REPLACE VIEW serve.v_soh_by_supplier AS
SELECT 
    sp.supplier_id,
    s.name as supplier_name,
    sp.supplier_product_id,
    sp.supplier_sku,
    sp.name_from_supplier as product_name,
    soh.location_id,
    sl.name as location_name,
    soh.qty as qty_on_hand,
    soh.unit_cost,
    soh.total_value,
    ph.currency,
    soh.as_of_ts,
    CASE WHEN isi.selection_item_id IS NOT NULL THEN true ELSE false END as is_selected
FROM core.supplier_product sp
JOIN core.supplier s ON s.supplier_id = sp.supplier_id
JOIN core.stock_on_hand soh ON soh.supplier_product_id = sp.supplier_product_id
JOIN core.stock_location sl ON sl.location_id = soh.location_id
LEFT JOIN core.price_history ph ON ph.supplier_product_id = sp.supplier_product_id AND ph.is_current = true
LEFT JOIN core.inventory_selected_item isi ON isi.supplier_product_id = sp.supplier_product_id 
    AND isi.status = 'selected'
    AND isi.selection_id IN (SELECT selection_id FROM core.inventory_selection WHERE status = 'active')
WHERE sp.is_active = true;

-- SERVE: NXT SOH - Authoritative view of selected items only
CREATE OR REPLACE VIEW serve.v_nxt_soh AS
SELECT 
    sp.supplier_id,
    s.name as supplier_name,
    sp.supplier_product_id,
    sp.supplier_sku,
    sp.name_from_supplier as product_name,
    soh.location_id,
    sl.name as location_name,
    soh.qty as qty_on_hand,
    soh.unit_cost,
    soh.total_value,
    ph.currency,
    soh.as_of_ts,
    sel.selection_id,
    sel.selection_name
FROM core.inventory_selection sel
JOIN core.inventory_selected_item isi ON isi.selection_id = sel.selection_id
JOIN core.supplier_product sp ON sp.supplier_product_id = isi.supplier_product_id
JOIN core.supplier s ON s.supplier_id = sp.supplier_id
LEFT JOIN core.stock_on_hand soh ON soh.supplier_product_id = sp.supplier_product_id
LEFT JOIN core.stock_location sl ON sl.location_id = soh.location_id
LEFT JOIN core.price_history ph ON ph.supplier_product_id = sp.supplier_product_id AND ph.is_current = true
WHERE sel.status = 'active' 
    AND isi.status = 'selected'
    AND sp.is_active = true;

\echo '✓ SERVE schema views created/verified'

-- ============================================================================
-- TRIGGERS FOR AUTOMATIC TIMESTAMP UPDATES
-- ============================================================================

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to tables with updated_at columns
DROP TRIGGER IF EXISTS update_spp_pricelist_upload_updated_at ON spp.pricelist_upload;
CREATE TRIGGER update_spp_pricelist_upload_updated_at
    BEFORE UPDATE ON spp.pricelist_upload
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_core_supplier_updated_at ON core.supplier;
CREATE TRIGGER update_core_supplier_updated_at
    BEFORE UPDATE ON core.supplier
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_core_category_updated_at ON core.category;
CREATE TRIGGER update_core_category_updated_at
    BEFORE UPDATE ON core.category
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_core_product_updated_at ON core.product;
CREATE TRIGGER update_core_product_updated_at
    BEFORE UPDATE ON core.product
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_core_supplier_product_updated_at ON core.supplier_product;
CREATE TRIGGER update_core_supplier_product_updated_at
    BEFORE UPDATE ON core.supplier_product
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_core_inventory_selection_updated_at ON core.inventory_selection;
CREATE TRIGGER update_core_inventory_selection_updated_at
    BEFORE UPDATE ON core.inventory_selection
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_core_inventory_selected_item_updated_at ON core.inventory_selected_item;
CREATE TRIGGER update_core_inventory_selected_item_updated_at
    BEFORE UPDATE ON core.inventory_selected_item
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_core_stock_location_updated_at ON core.stock_location;
CREATE TRIGGER update_core_stock_location_updated_at
    BEFORE UPDATE ON core.stock_location
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

\echo '✓ Triggers created/verified'

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant permissions to application user (adjust as needed)
-- GRANT USAGE ON SCHEMA spp, core, serve TO app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA spp, core, serve TO app_user;
-- GRANT SELECT ON ALL SEQUENCES IN SCHEMA spp, core, serve TO app_user;
-- GRANT SELECT ON ALL VIEWS IN SCHEMA serve TO app_user;

\echo '✅ Schema creation completed successfully!'
\echo 'All required schemas, tables, views, indexes, and triggers are now in place.'
\echo ''
\echo 'Next steps:'
\echo '1. Run: psql $NEON_SPP_DATABASE_URL -f database/scripts/purge_all_inventory_data.sql'
\echo '2. Run: npx tsx scripts/import_master_dataset.ts'
\echo '3. Run: npx tsx scripts/create_default_selection.ts'
\echo '4. Run: npx tsx scripts/seed_stock_on_hand.ts'
