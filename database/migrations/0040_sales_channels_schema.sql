-- ============================================================================
-- MantisNXT Database Migration - Sales Channels Module
-- ============================================================================
-- Migration: 0040
-- Description: Create sales channels tables for multi-channel product distribution
-- Author: System
-- Date: 2025-01-XX
-- Target: Neon Primary Database
-- ============================================================================

BEGIN;

-- ============================================================================
-- SECTION 1: CREATE SALES CHANNEL TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS core.sales_channel (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL,
    channel_type VARCHAR(50) NOT NULL CHECK (channel_type IN ('woocommerce', 'whatsapp', 'facebook', 'instagram', 'tiktok')),
    name VARCHAR(200) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    sync_method VARCHAR(20) NOT NULL DEFAULT 'polling' CHECK (sync_method IN ('webhook', 'polling', 'both')),
    sync_interval_minutes INTEGER DEFAULT 15 CHECK (sync_interval_minutes > 0),
    webhook_url VARCHAR(500),
    webhook_secret VARCHAR(255),
    api_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    stock_allocation_type VARCHAR(20) NOT NULL DEFAULT 'virtual' CHECK (stock_allocation_type IN ('reserved', 'virtual', 'both')),
    auto_sync_products BOOLEAN DEFAULT false,
    auto_sync_orders BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMPTZ,
    last_order_sync_at TIMESTAMPTZ,
    sync_status VARCHAR(20) DEFAULT 'idle' CHECK (sync_status IN ('idle', 'syncing', 'error')),
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);

CREATE INDEX IF NOT EXISTS idx_sales_channel_org ON core.sales_channel(org_id);
CREATE INDEX IF NOT EXISTS idx_sales_channel_type ON core.sales_channel(channel_type);
CREATE INDEX IF NOT EXISTS idx_sales_channel_active ON core.sales_channel(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_sales_channel_sync_status ON core.sales_channel(sync_status);

COMMENT ON TABLE core.sales_channel IS 'Stores sales channel configuration and connection details';
COMMENT ON COLUMN core.sales_channel.channel_type IS 'Type of sales channel: woocommerce, whatsapp, facebook, instagram, tiktok';
COMMENT ON COLUMN core.sales_channel.sync_method IS 'Method for syncing orders: webhook, polling, or both';
COMMENT ON COLUMN core.sales_channel.stock_allocation_type IS 'Type of stock allocation: reserved (dedicated), virtual (soft), or both';

-- ============================================================================
-- SECTION 2: CREATE CHANNEL PRODUCT TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS core.channel_product (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel_id UUID NOT NULL REFERENCES core.sales_channel(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES core.product(product_id) ON DELETE CASCADE,
    org_id UUID NOT NULL,
    channel_product_id VARCHAR(255),
    channel_sku VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT true,
    sync_enabled BOOLEAN NOT NULL DEFAULT true,
    price_override DECIMAL(15,4),
    title_override VARCHAR(500),
    description_override TEXT,
    image_urls TEXT[],
    channel_category VARCHAR(200),
    tags TEXT[],
    metadata JSONB DEFAULT '{}'::jsonb,
    last_synced_at TIMESTAMPTZ,
    sync_status VARCHAR(20) DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'error')),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_channel_product UNIQUE (channel_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_channel_product_channel ON core.channel_product(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_product_product ON core.channel_product(product_id);
CREATE INDEX IF NOT EXISTS idx_channel_product_org ON core.channel_product(org_id);
CREATE INDEX IF NOT EXISTS idx_channel_product_active ON core.channel_product(channel_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_channel_product_sync_status ON core.channel_product(sync_status);
CREATE UNIQUE INDEX IF NOT EXISTS uk_channel_external_id ON core.channel_product(channel_id, channel_product_id) WHERE channel_product_id IS NOT NULL;

COMMENT ON TABLE core.channel_product IS 'Maps products to sales channels with channel-specific settings';
COMMENT ON COLUMN core.channel_product.channel_product_id IS 'External product ID in the channel platform';

-- ============================================================================
-- SECTION 3: CREATE CHANNEL STOCK ALLOCATION TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS core.channel_stock_allocation (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel_id UUID NOT NULL REFERENCES core.sales_channel(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES core.product(product_id) ON DELETE CASCADE,
    location_id UUID REFERENCES core.stock_location(location_id) ON DELETE SET NULL,
    org_id UUID NOT NULL,
    allocation_type VARCHAR(20) NOT NULL CHECK (allocation_type IN ('reserved', 'virtual')),
    allocated_quantity INTEGER NOT NULL DEFAULT 0 CHECK (allocated_quantity >= 0),
    reserved_quantity INTEGER NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
    available_quantity INTEGER GENERATED ALWAYS AS (
        CASE 
            WHEN allocation_type = 'reserved' THEN reserved_quantity
            ELSE allocated_quantity
        END
    ) STORED,
    min_stock_level INTEGER DEFAULT 0 CHECK (min_stock_level >= 0),
    max_stock_level INTEGER CHECK (max_stock_level IS NULL OR max_stock_level >= 0),
    auto_replenish BOOLEAN DEFAULT false,
    last_allocated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_channel_stock UNIQUE (channel_id, product_id, location_id)
);

CREATE INDEX IF NOT EXISTS idx_channel_stock_channel ON core.channel_stock_allocation(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_stock_product ON core.channel_stock_allocation(product_id);
CREATE INDEX IF NOT EXISTS idx_channel_stock_location ON core.channel_stock_allocation(location_id);
CREATE INDEX IF NOT EXISTS idx_channel_stock_org ON core.channel_stock_allocation(org_id);
CREATE INDEX IF NOT EXISTS idx_channel_stock_type ON core.channel_stock_allocation(allocation_type);

COMMENT ON TABLE core.channel_stock_allocation IS 'Manages stock allocation per channel (reserved or virtual)';
COMMENT ON COLUMN core.channel_stock_allocation.allocation_type IS 'Type: reserved (dedicated stock) or virtual (soft allocation)';
COMMENT ON COLUMN core.channel_stock_allocation.location_id IS 'NULL means all locations';

-- ============================================================================
-- SECTION 4: CREATE CHANNEL ORDER TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS core.channel_order (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel_id UUID NOT NULL REFERENCES core.sales_channel(id) ON DELETE RESTRICT,
    org_id UUID NOT NULL,
    external_order_id VARCHAR(255) NOT NULL,
    sales_order_id UUID,
    customer_id UUID,
    order_status VARCHAR(50) NOT NULL,
    internal_status VARCHAR(50),
    order_number VARCHAR(100),
    currency VARCHAR(10) DEFAULT 'ZAR',
    subtotal DECIMAL(15,4),
    tax_amount DECIMAL(15,4),
    shipping_amount DECIMAL(15,4),
    discount_amount DECIMAL(15,4),
    total_amount DECIMAL(15,4) NOT NULL CHECK (total_amount >= 0),
    payment_status VARCHAR(50),
    payment_method VARCHAR(100),
    shipping_method VARCHAR(100),
    billing_address JSONB DEFAULT '{}'::jsonb,
    shipping_address JSONB DEFAULT '{}'::jsonb,
    customer_info JSONB DEFAULT '{}'::jsonb,
    order_metadata JSONB DEFAULT '{}'::jsonb,
    synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0 CHECK (retry_count >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_channel_external_order UNIQUE (channel_id, external_order_id)
);

CREATE INDEX IF NOT EXISTS idx_channel_order_channel ON core.channel_order(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_order_sales_order ON core.channel_order(sales_order_id) WHERE sales_order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_channel_order_customer ON core.channel_order(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_channel_order_org ON core.channel_order(org_id);
CREATE INDEX IF NOT EXISTS idx_channel_order_status ON core.channel_order(order_status, internal_status);
CREATE INDEX IF NOT EXISTS idx_channel_order_synced ON core.channel_order(synced_at);
CREATE INDEX IF NOT EXISTS idx_channel_order_external_id ON core.channel_order(external_order_id);

COMMENT ON TABLE core.channel_order IS 'Stores orders received from external sales channels';
COMMENT ON COLUMN core.channel_order.external_order_id IS 'Order ID from external channel platform';
COMMENT ON COLUMN core.channel_order.sales_order_id IS 'Linked internal sales order (created when processed)';

-- ============================================================================
-- SECTION 5: CREATE CHANNEL ORDER ITEM TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS core.channel_order_item (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel_order_id UUID NOT NULL REFERENCES core.channel_order(id) ON DELETE CASCADE,
    channel_product_id VARCHAR(255),
    product_id UUID REFERENCES core.product(product_id) ON DELETE SET NULL,
    sku VARCHAR(100),
    name VARCHAR(500) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(15,4) NOT NULL CHECK (unit_price >= 0),
    subtotal DECIMAL(15,4) NOT NULL CHECK (subtotal >= 0),
    tax_amount DECIMAL(15,4) DEFAULT 0 CHECK (tax_amount >= 0),
    total DECIMAL(15,4) NOT NULL CHECK (total >= 0),
    variant_info JSONB DEFAULT '{}'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_channel_order_item_order ON core.channel_order_item(channel_order_id);
CREATE INDEX IF NOT EXISTS idx_channel_order_item_product ON core.channel_order_item(product_id) WHERE product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_channel_order_item_sku ON core.channel_order_item(sku) WHERE sku IS NOT NULL;

COMMENT ON TABLE core.channel_order_item IS 'Stores order line items from channel orders';

-- ============================================================================
-- SECTION 6: CREATE CHANNEL SYNC LOG TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS core.channel_sync_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel_id UUID NOT NULL REFERENCES core.sales_channel(id) ON DELETE CASCADE,
    sync_type VARCHAR(20) NOT NULL CHECK (sync_type IN ('products', 'orders', 'inventory')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'error', 'partial')),
    items_processed INTEGER DEFAULT 0 CHECK (items_processed >= 0),
    items_succeeded INTEGER DEFAULT 0 CHECK (items_succeeded >= 0),
    items_failed INTEGER DEFAULT 0 CHECK (items_failed >= 0),
    error_message TEXT,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_channel_sync_log_channel ON core.channel_sync_log(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_sync_log_type ON core.channel_sync_log(sync_type, started_at);
CREATE INDEX IF NOT EXISTS idx_channel_sync_log_status ON core.channel_sync_log(status);
CREATE INDEX IF NOT EXISTS idx_channel_sync_log_started ON core.channel_sync_log(started_at DESC);

COMMENT ON TABLE core.channel_sync_log IS 'Audit log for channel sync operations';

-- ============================================================================
-- SECTION 7: CREATE UPDATE TIMESTAMP TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION core.update_sales_channel_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sales_channel_update_timestamp ON core.sales_channel;
CREATE TRIGGER sales_channel_update_timestamp
BEFORE UPDATE ON core.sales_channel
FOR EACH ROW
EXECUTE FUNCTION core.update_sales_channel_timestamp();

DROP TRIGGER IF EXISTS channel_product_update_timestamp ON core.channel_product;
CREATE TRIGGER channel_product_update_timestamp
BEFORE UPDATE ON core.channel_product
FOR EACH ROW
EXECUTE FUNCTION core.update_sales_channel_timestamp();

DROP TRIGGER IF EXISTS channel_stock_allocation_update_timestamp ON core.channel_stock_allocation;
CREATE TRIGGER channel_stock_allocation_update_timestamp
BEFORE UPDATE ON core.channel_stock_allocation
FOR EACH ROW
EXECUTE FUNCTION core.update_sales_channel_timestamp();

DROP TRIGGER IF EXISTS channel_order_update_timestamp ON core.channel_order;
CREATE TRIGGER channel_order_update_timestamp
BEFORE UPDATE ON core.channel_order
FOR EACH ROW
EXECUTE FUNCTION core.update_sales_channel_timestamp();

COMMENT ON FUNCTION core.update_sales_channel_timestamp() IS 'Updates updated_at timestamp for sales channel tables';

COMMIT;

-- ============================================================================
-- Migration Complete
-- ============================================================================
