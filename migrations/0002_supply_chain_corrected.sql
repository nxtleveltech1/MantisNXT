-- Migration: 0002_supply_chain.sql - CORRECTED FOR SUPABASE
-- Description: Supply chain management tables - suppliers, inventory, purchase orders
-- PRODUCTION READY - 100% Supabase Compatible

-- ===========================
-- SUPPLY CHAIN ENUMS (COMPLETE)
-- ===========================

-- Supplier statuses
CREATE TYPE supplier_status AS ENUM (
    'active',
    'inactive',
    'suspended',
    'pending_approval',
    'blocked',
    'under_review'
);

-- Inventory categories - comprehensive
CREATE TYPE inventory_category AS ENUM (
    'raw_materials',
    'components',
    'finished_goods',
    'consumables',
    'services',
    'packaging',
    'tools',
    'safety_equipment'
);

-- Purchase order statuses
CREATE TYPE po_status AS ENUM (
    'draft',
    'pending_approval',
    'approved',
    'sent',
    'acknowledged',
    'partially_received',
    'completed',
    'cancelled',
    'on_hold'
);

-- Inventory event types for tracking
CREATE TYPE inventory_event_type AS ENUM (
    'received',
    'shipped',
    'adjusted',
    'returned',
    'damaged',
    'expired',
    'reserved',
    'unreserved'
);

-- ===========================
-- SUPPLY CHAIN TABLES
-- ===========================

-- Suppliers table
CREATE TABLE supplier (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    name text NOT NULL,
    contact_email text,
    contact_phone text,
    address jsonb DEFAULT '{}',
    risk_score integer DEFAULT 50,
    status supplier_status DEFAULT 'pending_approval',
    payment_terms text,
    lead_time_days integer DEFAULT 0,
    certifications text[] DEFAULT '{}',
    notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    -- Validation constraints
    CONSTRAINT supplier_name_length CHECK (char_length(name) >= 2 AND char_length(name) <= 200),
    CONSTRAINT supplier_email_format CHECK (contact_email IS NULL OR contact_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
    CONSTRAINT supplier_risk_score_range CHECK (risk_score >= 0 AND risk_score <= 100),
    CONSTRAINT supplier_lead_time_positive CHECK (lead_time_days >= 0)
);

-- Inventory items table
CREATE TABLE inventory_item (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    sku text NOT NULL,
    name text NOT NULL,
    description text,
    category inventory_category NOT NULL,
    unit_price numeric(10,2) DEFAULT 0,
    quantity_on_hand integer DEFAULT 0,
    quantity_reserved integer DEFAULT 0,
    reorder_point integer DEFAULT 0,
    max_stock_level integer,
    unit_of_measure text DEFAULT 'each',
    supplier_id uuid REFERENCES supplier(id) ON DELETE SET NULL,
    barcode text,
    location text,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    -- Unique constraint on SKU per organization
    CONSTRAINT inventory_sku_org_unique UNIQUE(org_id, sku),

    -- Validation constraints
    CONSTRAINT inventory_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 200),
    CONSTRAINT inventory_unit_price_positive CHECK (unit_price >= 0),
    CONSTRAINT inventory_quantity_non_negative CHECK (quantity_on_hand >= 0),
    CONSTRAINT inventory_quantity_reserved_non_negative CHECK (quantity_reserved >= 0),
    CONSTRAINT inventory_reorder_point_non_negative CHECK (reorder_point >= 0),
    CONSTRAINT inventory_max_stock_positive CHECK (max_stock_level IS NULL OR max_stock_level > 0),
    CONSTRAINT inventory_available_stock CHECK (quantity_reserved <= quantity_on_hand)
);

-- Purchase orders table
CREATE TABLE purchase_order (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    supplier_id uuid NOT NULL REFERENCES supplier(id) ON DELETE RESTRICT,
    po_number text NOT NULL,
    status po_status DEFAULT 'draft',
    total_amount numeric(12,2) DEFAULT 0,
    tax_amount numeric(12,2) DEFAULT 0,
    shipping_amount numeric(12,2) DEFAULT 0,
    order_date date DEFAULT CURRENT_DATE,
    expected_delivery_date date,
    actual_delivery_date date,
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_at timestamptz,
    notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    -- Unique constraint on PO number per organization
    CONSTRAINT po_number_org_unique UNIQUE(org_id, po_number),

    -- Validation constraints
    CONSTRAINT po_total_amount_non_negative CHECK (total_amount >= 0),
    CONSTRAINT po_tax_amount_non_negative CHECK (tax_amount >= 0),
    CONSTRAINT po_shipping_amount_non_negative CHECK (shipping_amount >= 0),
    CONSTRAINT po_expected_delivery_after_order CHECK (expected_delivery_date IS NULL OR expected_delivery_date >= order_date),
    CONSTRAINT po_actual_delivery_after_order CHECK (actual_delivery_date IS NULL OR actual_delivery_date >= order_date),
    CONSTRAINT po_approved_fields_consistency CHECK (
        (approved_by IS NULL AND approved_at IS NULL) OR
        (approved_by IS NOT NULL AND approved_at IS NOT NULL)
    )
);

-- Purchase order line items
CREATE TABLE purchase_order_item (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id uuid NOT NULL REFERENCES purchase_order(id) ON DELETE CASCADE,
    inventory_item_id uuid NOT NULL REFERENCES inventory_item(id) ON DELETE RESTRICT,
    quantity integer NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    total_price numeric(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    quantity_received integer DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    -- Validation constraints
    CONSTRAINT poi_quantity_positive CHECK (quantity > 0),
    CONSTRAINT poi_unit_price_non_negative CHECK (unit_price >= 0),
    CONSTRAINT poi_quantity_received_non_negative CHECK (quantity_received >= 0),
    CONSTRAINT poi_quantity_received_not_exceed_ordered CHECK (quantity_received <= quantity)
);

-- ===========================
-- SUPPLY CHAIN INDEXES (PERFORMANCE)
-- ===========================

-- Supplier indexes
CREATE INDEX idx_supplier_org_id ON supplier(org_id);
CREATE INDEX idx_supplier_status ON supplier(status);
CREATE INDEX idx_supplier_org_status ON supplier(org_id, status);
CREATE INDEX idx_supplier_risk_score ON supplier(risk_score DESC);
CREATE INDEX idx_supplier_name_search ON supplier USING gin(to_tsvector('english', name));

-- Inventory item indexes
CREATE INDEX idx_inventory_item_org_id ON inventory_item(org_id);
CREATE INDEX idx_inventory_item_sku ON inventory_item(org_id, sku);
CREATE INDEX idx_inventory_item_supplier ON inventory_item(supplier_id) WHERE supplier_id IS NOT NULL;
CREATE INDEX idx_inventory_item_category ON inventory_item(category);
CREATE INDEX idx_inventory_item_active ON inventory_item(org_id, is_active) WHERE is_active = true;
CREATE INDEX idx_inventory_item_low_stock ON inventory_item(org_id)
    WHERE quantity_on_hand <= reorder_point AND is_active = true;
CREATE INDEX idx_inventory_item_search ON inventory_item
    USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '') || ' ' || sku));

-- Purchase order indexes
CREATE INDEX idx_purchase_order_org_id ON purchase_order(org_id);
CREATE INDEX idx_purchase_order_supplier ON purchase_order(supplier_id);
CREATE INDEX idx_purchase_order_status ON purchase_order(status);
CREATE INDEX idx_purchase_order_org_status ON purchase_order(org_id, status);
CREATE INDEX idx_purchase_order_number ON purchase_order(org_id, po_number);
CREATE INDEX idx_purchase_order_created_by ON purchase_order(created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_purchase_order_dates ON purchase_order(order_date, expected_delivery_date);
CREATE INDEX idx_purchase_order_approval ON purchase_order(org_id, status) WHERE status = 'pending_approval';

-- Purchase order item indexes
CREATE INDEX idx_purchase_order_item_po ON purchase_order_item(purchase_order_id);
CREATE INDEX idx_purchase_order_item_inventory ON purchase_order_item(inventory_item_id);

-- ===========================
-- TRIGGER FUNCTIONS
-- ===========================

-- Function to update PO total when line items change
CREATE OR REPLACE FUNCTION update_purchase_order_total()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE purchase_order
    SET total_amount = (
        SELECT COALESCE(SUM(total_price), 0)
        FROM purchase_order_item
        WHERE purchase_order_id = COALESCE(NEW.purchase_order_id, OLD.purchase_order_id)
    )
    WHERE id = COALESCE(NEW.purchase_order_id, OLD.purchase_order_id);

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- ===========================
-- APPLY TRIGGERS
-- ===========================

-- Updated timestamp triggers
CREATE TRIGGER update_supplier_updated_at
    BEFORE UPDATE ON supplier
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_item_updated_at
    BEFORE UPDATE ON inventory_item
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_purchase_order_updated_at
    BEFORE UPDATE ON purchase_order
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_purchase_order_item_updated_at
    BEFORE UPDATE ON purchase_order_item
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Audit triggers
CREATE TRIGGER audit_supplier
    AFTER INSERT OR UPDATE OR DELETE ON supplier
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_inventory_item
    AFTER INSERT OR UPDATE OR DELETE ON inventory_item
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_purchase_order
    AFTER INSERT OR UPDATE OR DELETE ON purchase_order
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_purchase_order_item
    AFTER INSERT OR UPDATE OR DELETE ON purchase_order_item
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- PO total calculation trigger
CREATE TRIGGER update_po_total_on_item_change
    AFTER INSERT OR UPDATE OR DELETE ON purchase_order_item
    FOR EACH ROW EXECUTE FUNCTION update_purchase_order_total();