-- Minimal CORE + SERVE schema initializer for IS-SOH database
-- Contains canonical master data and operational inventory tables used by the app

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SCHEMA IF NOT EXISTS core;
CREATE SCHEMA IF NOT EXISTS serve;

-- CORE: Supplier master
CREATE TABLE IF NOT EXISTS core.supplier (
    supplier_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    code VARCHAR(50),
    active BOOLEAN NOT NULL DEFAULT true,
    default_currency VARCHAR(3) NOT NULL,
    payment_terms VARCHAR(100),
    contact_info JSONB,
    tax_number VARCHAR(50),
    -- Extended supplier attributes
    tier VARCHAR(20) CHECK (tier IN ('strategic', 'preferred', 'approved', 'conditional')),
    lead_time INTEGER DEFAULT 0,
    minimum_order_value NUMERIC(15,2),
    preferred_supplier BOOLEAN DEFAULT false,
    base_discount_percent NUMERIC(5,2) DEFAULT 0,
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- CORE: Category taxonomy
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

-- CORE: Internal product catalog
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

-- CORE: Price history (SCD2 style)
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

-- CORE: Inventory selection
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

-- CORE: Selected items
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

-- CORE: Stock movements (transaction log)
CREATE TABLE IF NOT EXISTS core.stock_movement (
    movement_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID REFERENCES core.stock_location(location_id),
    supplier_product_id UUID NOT NULL REFERENCES core.supplier_product(supplier_product_id) ON DELETE CASCADE,
    movement_type VARCHAR(20) NOT NULL,
    qty INTEGER NOT NULL,
    reference_doc VARCHAR(200),
    notes TEXT,
    movement_ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(200),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

