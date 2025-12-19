-- Migration: 0228_logistics_module.sql
-- Description: Logistics Management Module - Courier Providers, Deliveries, Cost Quotes, Tracking

BEGIN;

-- Delivery status enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'delivery_status') THEN
        CREATE TYPE delivery_status AS ENUM (
            'pending',
            'confirmed',
            'picked_up',
            'in_transit',
            'out_for_delivery',
            'delivered',
            'failed',
            'cancelled',
            'returned'
        );
    END IF;
END$$;

-- Service tier enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'delivery_service_tier') THEN
        CREATE TYPE delivery_service_tier AS ENUM ('standard', 'express', 'urgent');
    END IF;
END$$;

-- Courier provider status enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'courier_provider_status') THEN
        CREATE TYPE courier_provider_status AS ENUM ('active', 'inactive', 'suspended');
    END IF;
END$$;

-- Courier Providers table
CREATE TABLE IF NOT EXISTS courier_providers (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    name text NOT NULL,
    code text NOT NULL, -- e.g., 'postnet', 'fastway', 'courierguy', 'dhl'
    status courier_provider_status DEFAULT 'active',
    api_endpoint text,
    api_credentials jsonb DEFAULT '{}', -- Encrypted credentials
    is_default boolean DEFAULT false,
    supports_tracking boolean DEFAULT true,
    supports_quotes boolean DEFAULT true,
    metadata jsonb DEFAULT '{}',
    created_by uuid REFERENCES auth.users_extended(id) ON DELETE SET NULL,
    updated_by uuid REFERENCES auth.users_extended(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    CONSTRAINT courier_providers_code_org_unique UNIQUE(org_id, code)
);

-- Delivery Service Tiers table
CREATE TABLE IF NOT EXISTS delivery_service_tiers (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    tier delivery_service_tier NOT NULL,
    name text NOT NULL,
    description text,
    estimated_days_min integer,
    estimated_days_max integer,
    estimated_hours_min integer,
    estimated_hours_max integer,
    is_active boolean DEFAULT true,
    metadata jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    CONSTRAINT delivery_service_tiers_tier_org_unique UNIQUE(org_id, tier)
);

-- Deliveries table
CREATE TABLE IF NOT EXISTS deliveries (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    delivery_number text NOT NULL,
    status delivery_status DEFAULT 'pending',
    
    -- Links to quotations/sales orders
    quotation_id uuid REFERENCES quotations(id) ON DELETE SET NULL,
    sales_order_id uuid REFERENCES sales_orders(id) ON DELETE SET NULL,
    
    -- Customer information
    customer_id uuid REFERENCES customer(id) ON DELETE SET NULL,
    customer_name text,
    customer_phone text,
    customer_email text,
    
    -- Addresses
    pickup_address jsonb DEFAULT '{}',
    pickup_contact_name text,
    pickup_contact_phone text,
    pickup_lat numeric(10, 8),
    pickup_lng numeric(11, 8),
    
    delivery_address jsonb NOT NULL DEFAULT '{}',
    delivery_contact_name text,
    delivery_contact_phone text,
    delivery_lat numeric(10, 8),
    delivery_lng numeric(11, 8),
    
    -- Courier provider and service
    courier_provider_id uuid REFERENCES courier_providers(id) ON DELETE SET NULL,
    service_tier_id uuid REFERENCES delivery_service_tiers(id) ON DELETE SET NULL,
    tracking_number text,
    
    -- Package information
    package_type text,
    weight_kg numeric(8, 3),
    dimensions_length_cm numeric(8, 2),
    dimensions_width_cm numeric(8, 2),
    dimensions_height_cm numeric(8, 2),
    declared_value numeric(12, 2),
    
    -- Package options
    requires_signature boolean DEFAULT false,
    is_fragile boolean DEFAULT false,
    is_insured boolean DEFAULT false,
    special_instructions text,
    
    -- Cost information
    cost_quoted numeric(12, 2),
    cost_actual numeric(12, 2),
    currency text DEFAULT 'ZAR',
    
    -- Dates
    requested_pickup_date date,
    requested_delivery_date date,
    actual_pickup_date timestamptz,
    actual_delivery_date timestamptz,
    estimated_delivery_date timestamptz,
    
    -- Dropshipping
    is_dropshipping boolean DEFAULT false,
    supplier_id uuid REFERENCES supplier(id) ON DELETE SET NULL,
    supplier_shipping_address jsonb DEFAULT '{}',
    
    -- Metadata
    metadata jsonb DEFAULT '{}',
    created_by uuid REFERENCES auth.users_extended(id) ON DELETE SET NULL,
    updated_by uuid REFERENCES auth.users_extended(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    CONSTRAINT deliveries_delivery_number_org_unique UNIQUE(org_id, delivery_number),
    CONSTRAINT deliveries_weight_positive CHECK (weight_kg IS NULL OR weight_kg > 0),
    CONSTRAINT deliveries_cost_quoted_non_negative CHECK (cost_quoted IS NULL OR cost_quoted >= 0),
    CONSTRAINT deliveries_cost_actual_non_negative CHECK (cost_actual IS NULL OR cost_actual >= 0)
);

-- Delivery Items table (links deliveries to specific products/items)
CREATE TABLE IF NOT EXISTS delivery_items (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    delivery_id uuid NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
    quotation_item_id uuid REFERENCES quotation_items(id) ON DELETE SET NULL,
    sales_order_item_id uuid REFERENCES sales_order_items(id) ON DELETE SET NULL,
    product_id uuid,
    product_name text NOT NULL,
    sku text,
    quantity numeric(12, 3) NOT NULL DEFAULT 1,
    unit_weight_kg numeric(8, 3),
    metadata jsonb DEFAULT '{}',
    
    CONSTRAINT delivery_items_quantity_positive CHECK (quantity > 0)
);

-- Delivery Cost Quotes table (stores quotes from multiple providers)
CREATE TABLE IF NOT EXISTS delivery_cost_quotes (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    delivery_id uuid REFERENCES deliveries(id) ON DELETE CASCADE,
    quotation_id uuid REFERENCES quotations(id) ON DELETE CASCADE,
    sales_order_id uuid REFERENCES sales_orders(id) ON DELETE CASCADE,
    
    courier_provider_id uuid NOT NULL REFERENCES courier_providers(id) ON DELETE CASCADE,
    service_tier_id uuid REFERENCES delivery_service_tiers(id) ON DELETE SET NULL,
    
    cost numeric(12, 2) NOT NULL,
    currency text DEFAULT 'ZAR',
    estimated_delivery_days integer,
    estimated_delivery_date date,
    
    -- Quote details
    base_cost numeric(12, 2),
    fuel_surcharge numeric(12, 2),
    insurance_cost numeric(12, 2),
    other_fees numeric(12, 2),
    
    is_selected boolean DEFAULT false,
    expires_at timestamptz,
    
    metadata jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now(),
    
    CONSTRAINT delivery_cost_quotes_cost_non_negative CHECK (cost >= 0)
);

-- Delivery Status History table
CREATE TABLE IF NOT EXISTS delivery_status_history (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    delivery_id uuid NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
    status delivery_status NOT NULL,
    location_lat numeric(10, 8),
    location_lng numeric(11, 8),
    location_address text,
    notes text,
    courier_name text,
    courier_phone text,
    timestamp timestamptz DEFAULT now(),
    created_by uuid REFERENCES auth.users_extended(id) ON DELETE SET NULL,
    metadata jsonb DEFAULT '{}'
);

-- Delivery Inventory Allocations junction table
CREATE TABLE IF NOT EXISTS delivery_inventory_allocations (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    delivery_id uuid NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
    inventory_allocation_id uuid NOT NULL REFERENCES inventory_allocations(id) ON DELETE CASCADE,
    quantity numeric(12, 3) NOT NULL,
    created_at timestamptz DEFAULT now(),
    
    CONSTRAINT delivery_inventory_allocations_quantity_positive CHECK (quantity > 0),
    CONSTRAINT delivery_inventory_allocations_unique UNIQUE(delivery_id, inventory_allocation_id)
);

-- Quotation Delivery Options table
CREATE TABLE IF NOT EXISTS quotation_delivery_options (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    quotation_id uuid NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
    delivery_address jsonb NOT NULL DEFAULT '{}',
    delivery_contact_name text,
    delivery_contact_phone text,
    service_tier_id uuid REFERENCES delivery_service_tiers(id) ON DELETE SET NULL,
    preferred_courier_provider_id uuid REFERENCES courier_providers(id) ON DELETE SET NULL,
    selected_cost_quote_id uuid REFERENCES delivery_cost_quotes(id) ON DELETE SET NULL,
    special_instructions text,
    metadata jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    CONSTRAINT quotation_delivery_options_quotation_unique UNIQUE(quotation_id)
);

-- Sales Order Delivery Options table
CREATE TABLE IF NOT EXISTS sales_order_delivery_options (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    sales_order_id uuid NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
    delivery_address jsonb NOT NULL DEFAULT '{}',
    delivery_contact_name text,
    delivery_contact_phone text,
    service_tier_id uuid REFERENCES delivery_service_tiers(id) ON DELETE SET NULL,
    courier_provider_id uuid REFERENCES courier_providers(id) ON DELETE SET NULL,
    delivery_id uuid REFERENCES deliveries(id) ON DELETE SET NULL,
    special_instructions text,
    metadata jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    CONSTRAINT sales_order_delivery_options_sales_order_unique UNIQUE(sales_order_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_deliveries_org_id ON deliveries(org_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries(status);
CREATE INDEX IF NOT EXISTS idx_deliveries_quotation_id ON deliveries(quotation_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_sales_order_id ON deliveries(sales_order_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_customer_id ON deliveries(customer_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_courier_provider_id ON deliveries(courier_provider_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_tracking_number ON deliveries(tracking_number);
CREATE INDEX IF NOT EXISTS idx_deliveries_delivery_number ON deliveries(delivery_number);

CREATE INDEX IF NOT EXISTS idx_delivery_items_delivery_id ON delivery_items(delivery_id);
CREATE INDEX IF NOT EXISTS idx_delivery_items_product_id ON delivery_items(product_id);

CREATE INDEX IF NOT EXISTS idx_delivery_cost_quotes_delivery_id ON delivery_cost_quotes(delivery_id);
CREATE INDEX IF NOT EXISTS idx_delivery_cost_quotes_quotation_id ON delivery_cost_quotes(quotation_id);
CREATE INDEX IF NOT EXISTS idx_delivery_cost_quotes_sales_order_id ON delivery_cost_quotes(sales_order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_cost_quotes_courier_provider_id ON delivery_cost_quotes(courier_provider_id);
CREATE INDEX IF NOT EXISTS idx_delivery_cost_quotes_selected ON delivery_cost_quotes(is_selected) WHERE is_selected = true;

CREATE INDEX IF NOT EXISTS idx_delivery_status_history_delivery_id ON delivery_status_history(delivery_id);
CREATE INDEX IF NOT EXISTS idx_delivery_status_history_status ON delivery_status_history(status);
CREATE INDEX IF NOT EXISTS idx_delivery_status_history_timestamp ON delivery_status_history(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_courier_providers_org_id ON courier_providers(org_id);
CREATE INDEX IF NOT EXISTS idx_courier_providers_status ON courier_providers(status);
CREATE INDEX IF NOT EXISTS idx_courier_providers_code ON courier_providers(code);

CREATE INDEX IF NOT EXISTS idx_delivery_service_tiers_org_id ON delivery_service_tiers(org_id);
CREATE INDEX IF NOT EXISTS idx_delivery_service_tiers_tier ON delivery_service_tiers(tier);

-- Trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_delivery_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_deliveries_updated_at
    BEFORE UPDATE ON deliveries
    FOR EACH ROW
    EXECUTE FUNCTION update_delivery_updated_at();

CREATE TRIGGER update_courier_providers_updated_at
    BEFORE UPDATE ON courier_providers
    FOR EACH ROW
    EXECUTE FUNCTION update_delivery_updated_at();

CREATE TRIGGER update_delivery_service_tiers_updated_at
    BEFORE UPDATE ON delivery_service_tiers
    FOR EACH ROW
    EXECUTE FUNCTION update_delivery_updated_at();

CREATE TRIGGER update_quotation_delivery_options_updated_at
    BEFORE UPDATE ON quotation_delivery_options
    FOR EACH ROW
    EXECUTE FUNCTION update_delivery_updated_at();

CREATE TRIGGER update_sales_order_delivery_options_updated_at
    BEFORE UPDATE ON sales_order_delivery_options
    FOR EACH ROW
    EXECUTE FUNCTION update_delivery_updated_at();

-- Function to generate delivery number
CREATE OR REPLACE FUNCTION generate_delivery_number(p_org_id uuid)
RETURNS text AS $$
DECLARE
    v_prefix text := 'DEL';
    v_year text := to_char(now(), 'YYYY');
    v_sequence integer;
BEGIN
    -- Get next sequence number for this org and year
    SELECT COALESCE(MAX(CAST(SUBSTRING(delivery_number FROM '(\d+)$') AS integer)), 0) + 1
    INTO v_sequence
    FROM deliveries
    WHERE org_id = p_org_id
      AND delivery_number LIKE v_prefix || '-' || v_year || '-%';
    
    RETURN v_prefix || '-' || v_year || '-' || LPAD(v_sequence::text, 6, '0');
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- Record migration
INSERT INTO schema_migrations (migration_name)
VALUES ('0228_logistics_module')
ON CONFLICT (migration_name) DO NOTHING;



