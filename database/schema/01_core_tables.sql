-- ===============================================
-- INVENTORY MANAGEMENT SYSTEM - CORE SCHEMA
-- Performance-optimized with strategic indexing
-- ===============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- =================
-- CORE ENTITIES
-- =================

-- Products master table
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(500) NOT NULL,
    description TEXT,
    category_id UUID NOT NULL,
    brand_id UUID,
    unit_of_measure VARCHAR(20) NOT NULL DEFAULT 'EACH',
    base_cost DECIMAL(15,4),
    sale_price DECIMAL(15,4),
    weight_kg DECIMAL(10,3),
    dimensions_cm VARCHAR(50), -- "LxWxH"
    barcode VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_serialized BOOLEAN NOT NULL DEFAULT false,
    reorder_level INTEGER DEFAULT 0,
    max_stock_level INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL,
    updated_by UUID NOT NULL
);

-- Categories with hierarchical structure
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    parent_id UUID REFERENCES categories(id),
    path TEXT NOT NULL, -- Materialized path for fast hierarchy queries
    level INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Brands/Manufacturers
CREATE TABLE brands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL UNIQUE,
    code VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =================
-- INVENTORY TRACKING
-- =================

-- Real-time inventory balances (one record per product-location)
CREATE TABLE inventory_balances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id),
    location_id UUID NOT NULL REFERENCES locations(id),
    quantity_on_hand INTEGER NOT NULL DEFAULT 0,
    quantity_allocated INTEGER NOT NULL DEFAULT 0,
    quantity_available INTEGER GENERATED ALWAYS AS (quantity_on_hand - quantity_allocated) STORED,
    last_counted_at TIMESTAMPTZ,
    last_movement_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(product_id, location_id)
);

-- Inventory movements (all transactions)
CREATE TABLE inventory_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id),
    location_id UUID NOT NULL REFERENCES locations(id),
    movement_type VARCHAR(20) NOT NULL, -- IN, OUT, ADJUSTMENT, TRANSFER
    reference_type VARCHAR(30), -- PURCHASE, SALE, ADJUSTMENT, TRANSFER, etc.
    reference_id UUID,
    quantity INTEGER NOT NULL,
    unit_cost DECIMAL(15,4),
    reason VARCHAR(500),
    batch_number VARCHAR(100),
    expiry_date DATE,
    serial_numbers TEXT[], -- Array for serialized items
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL
);

-- Locations/Warehouses
CREATE TABLE locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'WAREHOUSE', -- WAREHOUSE, STORE, VIRTUAL
    address TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =================
-- BATCH/LOT TRACKING
-- =================

-- Batch/Lot tracking for products
CREATE TABLE product_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id),
    batch_number VARCHAR(100) NOT NULL,
    expiry_date DATE,
    manufacture_date DATE,
    supplier_id UUID,
    quantity_received INTEGER NOT NULL,
    quantity_remaining INTEGER NOT NULL,
    unit_cost DECIMAL(15,4),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(product_id, batch_number)
);

-- =================
-- AUDIT & HISTORY
-- =================

-- Product price history
CREATE TABLE product_price_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id),
    price_type VARCHAR(20) NOT NULL, -- COST, SALE
    old_price DECIMAL(15,4),
    new_price DECIMAL(15,4) NOT NULL,
    effective_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reason VARCHAR(500),
    created_by UUID NOT NULL
);

-- Stock adjustment audit
CREATE TABLE stock_adjustments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id),
    location_id UUID NOT NULL REFERENCES locations(id),
    adjustment_type VARCHAR(20) NOT NULL, -- COUNT, SHRINKAGE, DAMAGE, EXPIRED
    old_quantity INTEGER NOT NULL,
    new_quantity INTEGER NOT NULL,
    variance INTEGER GENERATED ALWAYS AS (new_quantity - old_quantity) STORED,
    reason VARCHAR(500),
    reference_document VARCHAR(200),
    approved_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL
);

-- =================
-- FOREIGN KEY CONSTRAINTS
-- =================

ALTER TABLE products ADD CONSTRAINT fk_products_category
    FOREIGN KEY (category_id) REFERENCES categories(id);

ALTER TABLE products ADD CONSTRAINT fk_products_brand
    FOREIGN KEY (brand_id) REFERENCES brands(id);

-- =================
-- CHECK CONSTRAINTS
-- =================

ALTER TABLE inventory_balances ADD CONSTRAINT chk_quantities_non_negative
    CHECK (quantity_on_hand >= 0 AND quantity_allocated >= 0);

ALTER TABLE inventory_movements ADD CONSTRAINT chk_movement_type
    CHECK (movement_type IN ('IN', 'OUT', 'ADJUSTMENT', 'TRANSFER'));

ALTER TABLE product_batches ADD CONSTRAINT chk_batch_quantities
    CHECK (quantity_received >= 0 AND quantity_remaining >= 0 AND quantity_remaining <= quantity_received);

-- =================
-- TRIGGERS FOR DATA CONSISTENCY
-- =================

-- Update inventory balances on movements
CREATE OR REPLACE FUNCTION update_inventory_balance()
RETURNS TRIGGER AS $$
BEGIN
    -- Update or insert inventory balance
    INSERT INTO inventory_balances (product_id, location_id, quantity_on_hand, last_movement_at)
    VALUES (NEW.product_id, NEW.location_id, NEW.quantity, NEW.created_at)
    ON CONFLICT (product_id, location_id)
    DO UPDATE SET
        quantity_on_hand = inventory_balances.quantity_on_hand + NEW.quantity,
        last_movement_at = NEW.created_at,
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_inventory_balance
    AFTER INSERT ON inventory_movements
    FOR EACH ROW EXECUTE FUNCTION update_inventory_balance();

-- Update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();