-- =====================================================
-- ENHANCED INVENTORY MANAGEMENT SYSTEM
-- =====================================================
-- Migration: 0011_enhanced_inventory_system.sql
-- Description: Comprehensive inventory management with supplier integration
-- Supports XLSX converter fields: supplier_name, brand, category, sku, description, price, vat_rate, stock_qty
-- Includes: stock movements, pricelist versioning, audit trails, performance indexes

-- =====================================================
-- ENHANCED ENUMS
-- =====================================================

-- Enhanced supplier status with performance tracking states
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'supplier_performance_tier') THEN
        CREATE TYPE supplier_performance_tier AS ENUM (
            'platinum',     -- Exceptional performance
            'gold',         -- Above average performance
            'silver',       -- Average performance
            'bronze',       -- Below average performance
            'unrated'       -- New supplier, no history
        );
    END IF;
END $$;

-- Stock movement types for comprehensive tracking
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'stock_movement_type') THEN
        CREATE TYPE stock_movement_type AS ENUM (
            'purchase_receipt',     -- Stock received from supplier
            'sale_shipment',        -- Stock sold to customer
            'transfer_in',          -- Stock transferred in from another location
            'transfer_out',         -- Stock transferred out to another location
            'adjustment_positive',  -- Manual positive adjustment
            'adjustment_negative',  -- Manual negative adjustment
            'damaged',              -- Stock marked as damaged
            'expired',              -- Stock marked as expired
            'returned',             -- Stock returned from customer
            'stolen',               -- Stock reported stolen
            'cycle_count',          -- Cycle count adjustment
            'manufacturing_use',    -- Used in manufacturing
            'sample',               -- Given as sample
            'promotion'             -- Promotional giveaway
        );
    END IF;
END $$;

-- Price change reasons for audit trail
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'price_change_reason') THEN
        CREATE TYPE price_change_reason AS ENUM (
            'cost_increase',        -- Supplier cost increase
            'cost_decrease',        -- Supplier cost decrease
            'market_adjustment',    -- Market-based price adjustment
            'promotion',            -- Promotional pricing
            'currency_change',      -- Currency exchange rate change
            'bulk_discount',        -- Volume-based pricing
            'seasonal',             -- Seasonal price change
            'competitive',          -- Competitive pricing adjustment
            'manual',               -- Manual override
            'automated'             -- System-generated adjustment
        );
    END IF;
END $$;

-- VAT rate types for tax compliance
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vat_rate_type') THEN
        CREATE TYPE vat_rate_type AS ENUM (
            'standard',     -- Standard VAT rate (15% in South Africa)
            'zero',         -- Zero-rated items
            'exempt',       -- VAT-exempt items
            'reduced',      -- Reduced VAT rate (special cases)
            'custom'        -- Custom rate for specific scenarios
        );
    END IF;
END $$;

-- =====================================================
-- CORE INVENTORY TABLES
-- =====================================================

-- Brands table for product categorization
CREATE TABLE IF NOT EXISTS brand (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    logo_url text,
    website text,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    CONSTRAINT brand_name_org_unique UNIQUE(org_id, name),
    CONSTRAINT brand_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 100),
    CONSTRAINT brand_logo_url_format CHECK (logo_url IS NULL OR logo_url ~ '^https?://.*'),
    CONSTRAINT brand_website_format CHECK (website IS NULL OR website ~ '^https?://.*')
);

-- Enhanced suppliers table with performance tracking
ALTER TABLE supplier ADD COLUMN IF NOT EXISTS performance_tier supplier_performance_tier DEFAULT 'unrated';
ALTER TABLE supplier ADD COLUMN IF NOT EXISTS performance_score numeric(5,2) DEFAULT 0.00;
ALTER TABLE supplier ADD COLUMN IF NOT EXISTS on_time_delivery_rate numeric(5,2) DEFAULT 0.00;
ALTER TABLE supplier ADD COLUMN IF NOT EXISTS quality_rating numeric(3,2) DEFAULT 0.00;
ALTER TABLE supplier ADD COLUMN IF NOT EXISTS last_evaluation_date date;
ALTER TABLE supplier ADD COLUMN IF NOT EXISTS preferred_supplier boolean DEFAULT false;
ALTER TABLE supplier ADD COLUMN IF NOT EXISTS minimum_order_value numeric(10,2);
ALTER TABLE supplier ADD COLUMN IF NOT EXISTS currency_code text DEFAULT 'ZAR';
ALTER TABLE supplier ADD COLUMN IF NOT EXISTS tax_number text;
ALTER TABLE supplier ADD COLUMN IF NOT EXISTS bank_details jsonb DEFAULT '{}';

-- Add constraints for new supplier fields
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'supplier_performance_score_range') THEN
        ALTER TABLE supplier ADD CONSTRAINT supplier_performance_score_range
        CHECK (performance_score >= 0 AND performance_score <= 100);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'supplier_delivery_rate_range') THEN
        ALTER TABLE supplier ADD CONSTRAINT supplier_delivery_rate_range
        CHECK (on_time_delivery_rate >= 0 AND on_time_delivery_rate <= 100);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'supplier_quality_rating_range') THEN
        ALTER TABLE supplier ADD CONSTRAINT supplier_quality_rating_range
        CHECK (quality_rating >= 0 AND quality_rating <= 5);
    END IF;
END $$;

-- Enhanced inventory items table with brand support
ALTER TABLE inventory_item ADD COLUMN IF NOT EXISTS brand_id uuid REFERENCES brand(id) ON DELETE SET NULL;
ALTER TABLE inventory_item ADD COLUMN IF NOT EXISTS weight_kg numeric(8,3);
ALTER TABLE inventory_item ADD COLUMN IF NOT EXISTS dimensions_json jsonb DEFAULT '{}';
ALTER TABLE inventory_item ADD COLUMN IF NOT EXISTS batch_tracking boolean DEFAULT false;
ALTER TABLE inventory_item ADD COLUMN IF NOT EXISTS expiry_tracking boolean DEFAULT false;
ALTER TABLE inventory_item ADD COLUMN IF NOT EXISTS serial_tracking boolean DEFAULT false;
ALTER TABLE inventory_item ADD COLUMN IF NOT EXISTS default_vat_rate_type vat_rate_type DEFAULT 'standard';
ALTER TABLE inventory_item ADD COLUMN IF NOT EXISTS default_vat_rate numeric(5,2) DEFAULT 15.00;
ALTER TABLE inventory_item ADD COLUMN IF NOT EXISTS cost_price numeric(10,2) DEFAULT 0.00;
ALTER TABLE inventory_item ADD COLUMN IF NOT EXISTS markup_percentage numeric(5,2) DEFAULT 0.00;
ALTER TABLE inventory_item ADD COLUMN IF NOT EXISTS alternative_skus text[] DEFAULT '{}';
ALTER TABLE inventory_item ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

-- Add constraints for enhanced inventory fields
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inventory_weight_positive') THEN
        ALTER TABLE inventory_item ADD CONSTRAINT inventory_weight_positive
        CHECK (weight_kg IS NULL OR weight_kg >= 0);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inventory_vat_rate_range') THEN
        ALTER TABLE inventory_item ADD CONSTRAINT inventory_vat_rate_range
        CHECK (default_vat_rate >= 0 AND default_vat_rate <= 100);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inventory_cost_price_positive') THEN
        ALTER TABLE inventory_item ADD CONSTRAINT inventory_cost_price_positive
        CHECK (cost_price >= 0);
    END IF;
END $$;

-- Stock movements table for comprehensive tracking
CREATE TABLE IF NOT EXISTS stock_movement (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    inventory_item_id uuid NOT NULL REFERENCES inventory_item(id) ON DELETE RESTRICT,
    movement_type stock_movement_type NOT NULL,
    quantity_change integer NOT NULL,
    quantity_before integer NOT NULL DEFAULT 0,
    quantity_after integer NOT NULL DEFAULT 0,
    unit_cost numeric(10,2),
    total_cost numeric(12,2),
    reference_number text,
    reference_table text,
    reference_id uuid,
    batch_number text,
    expiry_date date,
    serial_number text,
    location_from text,
    location_to text,
    notes text,
    movement_date timestamptz DEFAULT now(),
    created_by uuid REFERENCES auth.users_extended(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now(),

    CONSTRAINT stock_movement_quantity_not_zero CHECK (quantity_change != 0),
    CONSTRAINT stock_movement_quantities_valid CHECK (
        quantity_after = quantity_before + quantity_change
    ),
    CONSTRAINT stock_movement_cost_positive CHECK (unit_cost IS NULL OR unit_cost >= 0),
    CONSTRAINT stock_movement_total_cost_positive CHECK (total_cost IS NULL OR total_cost >= 0),
    CONSTRAINT stock_movement_reference_valid CHECK (
        (reference_table IS NULL AND reference_id IS NULL) OR
        (reference_table IS NOT NULL AND reference_id IS NOT NULL)
    )
);

-- Price lists for versioned pricing
CREATE TABLE IF NOT EXISTS price_list (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    currency_code text NOT NULL DEFAULT 'ZAR',
    is_default boolean DEFAULT false,
    effective_from date NOT NULL DEFAULT CURRENT_DATE,
    effective_until date,
    created_by uuid NOT NULL REFERENCES auth.users_extended(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    CONSTRAINT price_list_name_org_unique UNIQUE(org_id, name),
    CONSTRAINT price_list_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 100),
    CONSTRAINT price_list_effective_dates CHECK (
        effective_until IS NULL OR effective_until >= effective_from
    ),
    CONSTRAINT price_list_currency_format CHECK (currency_code ~ '^[A-Z]{3}$')
);

-- Price list items with versioning
CREATE TABLE IF NOT EXISTS price_list_item (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    price_list_id uuid NOT NULL REFERENCES price_list(id) ON DELETE CASCADE,
    inventory_item_id uuid NOT NULL REFERENCES inventory_item(id) ON DELETE CASCADE,
    price numeric(10,2) NOT NULL,
    vat_rate_type vat_rate_type NOT NULL DEFAULT 'standard',
    vat_rate numeric(5,2) NOT NULL DEFAULT 15.00,
    min_quantity integer DEFAULT 1,
    max_quantity integer,
    effective_from timestamptz NOT NULL DEFAULT now(),
    effective_until timestamptz,
    created_by uuid NOT NULL REFERENCES auth.users_extended(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),

    CONSTRAINT price_list_item_unique UNIQUE(price_list_id, inventory_item_id, effective_from),
    CONSTRAINT price_list_item_price_positive CHECK (price > 0),
    CONSTRAINT price_list_item_vat_rate_range CHECK (vat_rate >= 0 AND vat_rate <= 100),
    CONSTRAINT price_list_item_quantities_valid CHECK (
        max_quantity IS NULL OR max_quantity >= min_quantity
    ),
    CONSTRAINT price_list_item_min_quantity_positive CHECK (min_quantity > 0),
    CONSTRAINT price_list_item_effective_dates CHECK (
        effective_until IS NULL OR effective_until > effective_from
    )
);

-- Price change history for audit trail
CREATE TABLE IF NOT EXISTS price_change_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_item_id uuid NOT NULL REFERENCES inventory_item(id) ON DELETE CASCADE,
    price_list_id uuid REFERENCES price_list(id) ON DELETE SET NULL,
    old_price numeric(10,2),
    new_price numeric(10,2) NOT NULL,
    old_vat_rate numeric(5,2),
    new_vat_rate numeric(5,2) NOT NULL,
    change_reason price_change_reason NOT NULL,
    change_percentage numeric(6,3),
    effective_date timestamptz NOT NULL DEFAULT now(),
    notes text,
    changed_by uuid NOT NULL REFERENCES auth.users_extended(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),

    CONSTRAINT price_change_prices_positive CHECK (
        (old_price IS NULL OR old_price >= 0) AND new_price > 0
    ),
    CONSTRAINT price_change_vat_rates_valid CHECK (
        (old_vat_rate IS NULL OR old_vat_rate >= 0) AND
        new_vat_rate >= 0 AND new_vat_rate <= 100
    )
);

-- Supplier product mapping for multi-supplier support
CREATE TABLE IF NOT EXISTS supplier_product (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id uuid NOT NULL REFERENCES supplier(id) ON DELETE CASCADE,
    inventory_item_id uuid NOT NULL REFERENCES inventory_item(id) ON DELETE CASCADE,
    supplier_sku text,
    supplier_name text,
    supplier_description text,
    cost_price numeric(10,2) NOT NULL,
    currency_code text NOT NULL DEFAULT 'ZAR',
    lead_time_days integer DEFAULT 0,
    minimum_order_quantity integer DEFAULT 1,
    pack_size integer DEFAULT 1,
    last_cost_update_date date DEFAULT CURRENT_DATE,
    is_preferred boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    CONSTRAINT supplier_product_unique UNIQUE(supplier_id, inventory_item_id),
    CONSTRAINT supplier_product_cost_positive CHECK (cost_price > 0),
    CONSTRAINT supplier_product_lead_time_positive CHECK (lead_time_days >= 0),
    CONSTRAINT supplier_product_moq_positive CHECK (minimum_order_quantity > 0),
    CONSTRAINT supplier_product_pack_size_positive CHECK (pack_size > 0),
    CONSTRAINT supplier_product_currency_format CHECK (currency_code ~ '^[A-Z]{3}$')
);

-- Stock levels table for location-based inventory
CREATE TABLE IF NOT EXISTS stock_level (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    inventory_item_id uuid NOT NULL REFERENCES inventory_item(id) ON DELETE CASCADE,
    location_code text NOT NULL,
    location_name text NOT NULL,
    quantity_on_hand integer NOT NULL DEFAULT 0,
    quantity_reserved integer NOT NULL DEFAULT 0,
    quantity_available integer GENERATED ALWAYS AS (quantity_on_hand - quantity_reserved) STORED,
    reorder_point integer DEFAULT 0,
    max_stock_level integer,
    last_counted_date date,
    last_counted_by uuid REFERENCES auth.users_extended(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    CONSTRAINT stock_level_location_item_unique UNIQUE(org_id, inventory_item_id, location_code),
    CONSTRAINT stock_level_quantities_non_negative CHECK (
        quantity_on_hand >= 0 AND quantity_reserved >= 0
    ),
    CONSTRAINT stock_level_reserved_not_exceed_on_hand CHECK (
        quantity_reserved <= quantity_on_hand
    ),
    CONSTRAINT stock_level_reorder_point_non_negative CHECK (reorder_point >= 0),
    CONSTRAINT stock_level_max_stock_positive CHECK (
        max_stock_level IS NULL OR max_stock_level > 0
    )
);

-- =====================================================
-- PERFORMANCE INDEXES
-- =====================================================

-- Brand indexes
CREATE INDEX IF NOT EXISTS idx_brand_org_id ON brand(org_id);
CREATE INDEX IF NOT EXISTS idx_brand_active ON brand(org_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_brand_name_search ON brand USING gin(to_tsvector('english', name));

-- Enhanced supplier indexes
CREATE INDEX IF NOT EXISTS idx_supplier_performance_tier ON supplier(performance_tier);
CREATE INDEX IF NOT EXISTS idx_supplier_preferred ON supplier(org_id, preferred_supplier) WHERE preferred_supplier = true;
CREATE INDEX IF NOT EXISTS idx_supplier_performance_score ON supplier(performance_score DESC);
CREATE INDEX IF NOT EXISTS idx_supplier_currency ON supplier(currency_code);

-- Enhanced inventory item indexes
CREATE INDEX IF NOT EXISTS idx_inventory_item_brand ON inventory_item(brand_id) WHERE brand_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_item_vat_rate ON inventory_item(default_vat_rate_type);
CREATE INDEX IF NOT EXISTS idx_inventory_item_batch_tracking ON inventory_item(org_id, batch_tracking) WHERE batch_tracking = true;
CREATE INDEX IF NOT EXISTS idx_inventory_item_expiry_tracking ON inventory_item(org_id, expiry_tracking) WHERE expiry_tracking = true;
CREATE INDEX IF NOT EXISTS idx_inventory_item_serial_tracking ON inventory_item(org_id, serial_tracking) WHERE serial_tracking = true;
CREATE INDEX IF NOT EXISTS idx_inventory_item_cost_price ON inventory_item(cost_price DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_item_tags ON inventory_item USING gin(tags);

-- Stock movement indexes
CREATE INDEX IF NOT EXISTS idx_stock_movement_org_date ON stock_movement(org_id, movement_date DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movement_item_date ON stock_movement(inventory_item_id, movement_date DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movement_type ON stock_movement(movement_type);
CREATE INDEX IF NOT EXISTS idx_stock_movement_reference ON stock_movement(reference_table, reference_id) WHERE reference_table IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stock_movement_batch ON stock_movement(batch_number) WHERE batch_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stock_movement_serial ON stock_movement(serial_number) WHERE serial_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stock_movement_created_by ON stock_movement(created_by) WHERE created_by IS NOT NULL;

-- Price list indexes
CREATE INDEX IF NOT EXISTS idx_price_list_org_id ON price_list(org_id);
CREATE INDEX IF NOT EXISTS idx_price_list_default ON price_list(org_id, is_default) WHERE is_default = true;
CREATE INDEX IF NOT EXISTS idx_price_list_effective ON price_list(effective_from, effective_until);
CREATE INDEX IF NOT EXISTS idx_price_list_currency ON price_list(currency_code);

-- Price list item indexes
CREATE INDEX IF NOT EXISTS idx_price_list_item_list ON price_list_item(price_list_id);
CREATE INDEX IF NOT EXISTS idx_price_list_item_inventory ON price_list_item(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_price_list_item_effective ON price_list_item(effective_from, effective_until);
CREATE INDEX IF NOT EXISTS idx_price_list_item_current ON price_list_item(price_list_id, inventory_item_id)
    WHERE effective_until IS NULL OR effective_until > now();

-- Price change history indexes
CREATE INDEX IF NOT EXISTS idx_price_change_item_date ON price_change_history(inventory_item_id, effective_date DESC);
CREATE INDEX IF NOT EXISTS idx_price_change_reason ON price_change_history(change_reason);
CREATE INDEX IF NOT EXISTS idx_price_change_changed_by ON price_change_history(changed_by);

-- Supplier product indexes
CREATE INDEX IF NOT EXISTS idx_supplier_product_supplier ON supplier_product(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_product_item ON supplier_product(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_supplier_product_preferred ON supplier_product(inventory_item_id, is_preferred) WHERE is_preferred = true;
CREATE INDEX IF NOT EXISTS idx_supplier_product_active ON supplier_product(supplier_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_supplier_product_cost_update ON supplier_product(last_cost_update_date DESC);

-- Stock level indexes
CREATE INDEX IF NOT EXISTS idx_stock_level_org_location ON stock_level(org_id, location_code);
CREATE INDEX IF NOT EXISTS idx_stock_level_item_location ON stock_level(inventory_item_id, location_code);
CREATE INDEX IF NOT EXISTS idx_stock_level_low_stock ON stock_level(org_id)
    WHERE quantity_on_hand <= reorder_point;
CREATE INDEX IF NOT EXISTS idx_stock_level_zero_stock ON stock_level(org_id)
    WHERE quantity_on_hand = 0;
CREATE INDEX IF NOT EXISTS idx_stock_level_last_counted ON stock_level(last_counted_date) WHERE last_counted_date IS NOT NULL;

-- =====================================================
-- TRIGGER FUNCTIONS
-- =====================================================

-- Function to update stock levels when movements occur
CREATE OR REPLACE FUNCTION update_stock_levels_from_movement()
RETURNS TRIGGER AS $$
BEGIN
    -- Update inventory_item total quantities
    UPDATE inventory_item
    SET
        quantity_on_hand = quantity_on_hand + NEW.quantity_change,
        updated_at = now()
    WHERE id = NEW.inventory_item_id;

    -- Update location-specific stock levels if location is specified
    IF NEW.location_to IS NOT NULL THEN
        INSERT INTO stock_level (org_id, inventory_item_id, location_code, location_name, quantity_on_hand)
        SELECT NEW.org_id, NEW.inventory_item_id, NEW.location_to, NEW.location_to, NEW.quantity_change
        ON CONFLICT (org_id, inventory_item_id, location_code)
        DO UPDATE SET
            quantity_on_hand = stock_level.quantity_on_hand + NEW.quantity_change,
            updated_at = now();
    END IF;

    IF NEW.location_from IS NOT NULL AND NEW.location_from != NEW.location_to THEN
        UPDATE stock_level
        SET
            quantity_on_hand = quantity_on_hand - ABS(NEW.quantity_change),
            updated_at = now()
        WHERE org_id = NEW.org_id
        AND inventory_item_id = NEW.inventory_item_id
        AND location_code = NEW.location_from;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to validate stock movement quantities
CREATE OR REPLACE FUNCTION validate_stock_movement()
RETURNS TRIGGER AS $$
DECLARE
    current_quantity integer;
BEGIN
    -- Get current quantity
    SELECT quantity_on_hand INTO current_quantity
    FROM inventory_item
    WHERE id = NEW.inventory_item_id;

    -- Set quantity_before if not provided
    IF NEW.quantity_before = 0 THEN
        NEW.quantity_before := COALESCE(current_quantity, 0);
    END IF;

    -- Calculate quantity_after
    NEW.quantity_after := NEW.quantity_before + NEW.quantity_change;

    -- Validate that we don't go negative (except for adjustments)
    IF NEW.quantity_after < 0 AND NEW.movement_type NOT IN ('adjustment_negative', 'damaged', 'expired', 'stolen') THEN
        RAISE EXCEPTION 'Insufficient stock. Current: %, Requested: %', current_quantity, ABS(NEW.quantity_change);
    END IF;

    -- Calculate total cost if unit cost is provided
    IF NEW.unit_cost IS NOT NULL THEN
        NEW.total_cost := ABS(NEW.quantity_change) * NEW.unit_cost;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to track price changes
CREATE OR REPLACE FUNCTION track_price_changes()
RETURNS TRIGGER AS $$
DECLARE
    old_price numeric(10,2);
    old_vat_rate numeric(5,2);
    change_pct numeric(6,3);
BEGIN
    -- Only track if price actually changed
    IF OLD.unit_price != NEW.unit_price OR OLD.default_vat_rate != NEW.default_vat_rate THEN
        old_price := OLD.unit_price;
        old_vat_rate := OLD.default_vat_rate;

        -- Calculate percentage change
        IF old_price > 0 THEN
            change_pct := ((NEW.unit_price - old_price) / old_price) * 100;
        END IF;

        INSERT INTO price_change_history (
            inventory_item_id,
            old_price,
            new_price,
            old_vat_rate,
            new_vat_rate,
            change_reason,
            change_percentage,
            changed_by
        ) VALUES (
            NEW.id,
            old_price,
            NEW.unit_price,
            old_vat_rate,
            NEW.default_vat_rate,
            'manual', -- Default reason, can be updated
            change_pct,
            auth.uid()
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update supplier performance metrics
CREATE OR REPLACE FUNCTION update_supplier_performance()
RETURNS TRIGGER AS $$
DECLARE
    supplier_id_val uuid;
    total_orders integer;
    on_time_orders integer;
    delivery_rate numeric(5,2);
    avg_quality numeric(3,2);
    performance_score numeric(5,2);
    performance_tier supplier_performance_tier;
BEGIN
    -- Get supplier ID from the purchase order
    SELECT supplier_id INTO supplier_id_val
    FROM purchase_order
    WHERE id = NEW.purchase_order_id;

    -- Calculate on-time delivery rate
    SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE actual_delivery_date <= expected_delivery_date) as on_time
    INTO total_orders, on_time_orders
    FROM purchase_order
    WHERE supplier_id = supplier_id_val
    AND status = 'completed'
    AND actual_delivery_date IS NOT NULL
    AND expected_delivery_date IS NOT NULL;

    IF total_orders > 0 THEN
        delivery_rate := (on_time_orders::numeric / total_orders::numeric) * 100;

        -- Simple performance scoring (can be enhanced)
        performance_score := delivery_rate;

        -- Determine performance tier
        CASE
            WHEN performance_score >= 95 THEN performance_tier := 'platinum';
            WHEN performance_score >= 85 THEN performance_tier := 'gold';
            WHEN performance_score >= 70 THEN performance_tier := 'silver';
            WHEN performance_score >= 50 THEN performance_tier := 'bronze';
            ELSE performance_tier := 'unrated';
        END CASE;

        -- Update supplier performance metrics
        UPDATE supplier
        SET
            on_time_delivery_rate = delivery_rate,
            performance_score = performance_score,
            performance_tier = performance_tier,
            last_evaluation_date = CURRENT_DATE,
            updated_at = now()
        WHERE id = supplier_id_val;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- APPLY TRIGGERS
-- =====================================================

-- Updated timestamp triggers for new tables
CREATE TRIGGER update_brand_updated_at
    BEFORE UPDATE ON brand
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_price_list_updated_at
    BEFORE UPDATE ON price_list
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_supplier_product_updated_at
    BEFORE UPDATE ON supplier_product
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stock_level_updated_at
    BEFORE UPDATE ON stock_level
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Audit triggers for new tables
CREATE TRIGGER audit_brand
    AFTER INSERT OR UPDATE OR DELETE ON brand
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_stock_movement
    AFTER INSERT OR UPDATE OR DELETE ON stock_movement
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_price_list
    AFTER INSERT OR UPDATE OR DELETE ON price_list
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_price_list_item
    AFTER INSERT OR UPDATE OR DELETE ON price_list_item
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_supplier_product
    AFTER INSERT OR UPDATE OR DELETE ON supplier_product
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_stock_level
    AFTER INSERT OR UPDATE OR DELETE ON stock_level
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Business logic triggers
CREATE TRIGGER validate_stock_movement_trigger
    BEFORE INSERT ON stock_movement
    FOR EACH ROW EXECUTE FUNCTION validate_stock_movement();

CREATE TRIGGER update_stock_levels_trigger
    AFTER INSERT ON stock_movement
    FOR EACH ROW EXECUTE FUNCTION update_stock_levels_from_movement();

CREATE TRIGGER track_price_changes_trigger
    AFTER UPDATE ON inventory_item
    FOR EACH ROW EXECUTE FUNCTION track_price_changes();

-- Supplier performance tracking (when purchase orders are completed)
CREATE TRIGGER update_supplier_performance_trigger
    AFTER UPDATE ON purchase_order_item
    FOR EACH ROW
    WHEN (OLD.quantity_received != NEW.quantity_received)
    EXECUTE FUNCTION update_supplier_performance();

-- =====================================================
-- UTILITY VIEWS FOR XLSX CONVERTER SUPPORT
-- =====================================================

-- View for XLSX export/import compatibility
CREATE OR REPLACE VIEW inventory_xlsx_view AS
SELECT
    i.id,
    i.org_id,
    s.name as supplier_name,
    b.name as brand,
    i.category::text as category,
    i.sku,
    i.name as description,
    i.unit_price as price,
    i.default_vat_rate as vat_rate,
    i.quantity_on_hand as stock_qty,
    i.barcode,
    i.unit_of_measure,
    i.location,
    i.is_active,
    i.created_at,
    i.updated_at
FROM inventory_item i
LEFT JOIN supplier s ON i.supplier_id = s.id
LEFT JOIN brand b ON i.brand_id = b.id
WHERE i.is_active = true;

-- View for supplier performance dashboard
CREATE OR REPLACE VIEW supplier_performance_view AS
SELECT
    s.id,
    s.org_id,
    s.name,
    s.performance_tier,
    s.performance_score,
    s.on_time_delivery_rate,
    s.quality_rating,
    s.preferred_supplier,
    COUNT(po.id) as total_orders,
    COUNT(po.id) FILTER (WHERE po.status = 'completed') as completed_orders,
    AVG(po.total_amount) as avg_order_value,
    SUM(po.total_amount) FILTER (WHERE po.status = 'completed') as total_spend,
    s.last_evaluation_date,
    s.created_at
FROM supplier s
LEFT JOIN purchase_order po ON s.id = po.supplier_id
GROUP BY s.id, s.org_id, s.name, s.performance_tier, s.performance_score,
         s.on_time_delivery_rate, s.quality_rating, s.preferred_supplier,
         s.last_evaluation_date, s.created_at;

-- View for low stock alerts
CREATE OR REPLACE VIEW low_stock_alert_view AS
SELECT
    i.id,
    i.org_id,
    i.sku,
    i.name,
    i.quantity_on_hand,
    i.reorder_point,
    i.max_stock_level,
    s.name as supplier_name,
    sp.cost_price as supplier_cost,
    sp.lead_time_days,
    sp.minimum_order_quantity,
    b.name as brand_name,
    i.category,
    (i.reorder_point - i.quantity_on_hand) as quantity_needed
FROM inventory_item i
LEFT JOIN supplier_product sp ON i.id = sp.inventory_item_id AND sp.is_preferred = true
LEFT JOIN supplier s ON sp.supplier_id = s.id
LEFT JOIN brand b ON i.brand_id = b.id
WHERE i.is_active = true
AND i.quantity_on_hand <= i.reorder_point;

-- View for stock movement summary
CREATE OR REPLACE VIEW stock_movement_summary_view AS
SELECT
    sm.id,
    sm.org_id,
    i.sku,
    i.name as item_name,
    sm.movement_type,
    sm.quantity_change,
    sm.quantity_before,
    sm.quantity_after,
    sm.unit_cost,
    sm.total_cost,
    sm.reference_number,
    sm.location_from,
    sm.location_to,
    sm.movement_date,
    u.display_name as created_by_name
FROM stock_movement sm
JOIN inventory_item i ON sm.inventory_item_id = i.id
LEFT JOIN profile u ON sm.created_by = u.id
ORDER BY sm.movement_date DESC;

-- =====================================================
-- SAMPLE DATA FUNCTIONS
-- =====================================================

-- Function to populate sample brands
CREATE OR REPLACE FUNCTION insert_sample_brands(org_uuid uuid)
RETURNS void AS $$
BEGIN
    INSERT INTO brand (org_id, name, description) VALUES
    (org_uuid, 'Generic', 'Generic/unbranded products'),
    (org_uuid, 'Premium Brand', 'High-quality premium products'),
    (org_uuid, 'Budget Line', 'Cost-effective budget products'),
    (org_uuid, 'Professional', 'Professional-grade products'),
    (org_uuid, 'Industrial', 'Heavy-duty industrial products');
END;
$$ LANGUAGE plpgsql;

-- Function to create default price list
CREATE OR REPLACE FUNCTION create_default_price_list(org_uuid uuid, user_uuid uuid)
RETURNS uuid AS $$
DECLARE
    price_list_id uuid;
BEGIN
    INSERT INTO price_list (org_id, name, description, is_default, created_by)
    VALUES (org_uuid, 'Standard Price List', 'Default price list for all products', true, user_uuid)
    RETURNING id INTO price_list_id;

    RETURN price_list_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE 'Enhanced Inventory Management System migration completed successfully!';
    RAISE NOTICE 'Features included:';
    RAISE NOTICE '- Brand management with logo support';
    RAISE NOTICE '- Enhanced supplier performance tracking';
    RAISE NOTICE '- Comprehensive stock movement tracking';
    RAISE NOTICE '- Versioned price lists with VAT support';
    RAISE NOTICE '- Multi-location stock levels';
    RAISE NOTICE '- XLSX converter compatibility views';
    RAISE NOTICE '- Full audit trail for all operations';
    RAISE NOTICE 'XLSX Fields Supported: supplier_name, brand, category, sku, description, price, vat_rate, stock_qty';
END;
$$;

INSERT INTO schema_migrations (migration_name)
VALUES ('0011_enhanced_inventory_system')
ON CONFLICT (migration_name) DO NOTHING;