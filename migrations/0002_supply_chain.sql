-- Migration: 0002_supply_chain.sql
-- Description: Supply chain management tables - suppliers, inventory, purchase orders
-- up

-- Supply chain enums
CREATE TYPE supplier_status AS ENUM ('active', 'inactive', 'suspended', 'pending_approval');
CREATE TYPE inventory_category AS ENUM ('raw_materials', 'components', 'finished_goods', 'consumables', 'services');
CREATE TYPE po_status AS ENUM ('draft', 'pending_approval', 'approved', 'sent', 'partially_received', 'completed', 'cancelled');

-- Suppliers table
CREATE TABLE supplier (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    name text NOT NULL,
    contact_email text,
    contact_phone text,
    address jsonb DEFAULT '{}',
    risk_score integer DEFAULT 50,
    status supplier_status DEFAULT 'pending_approval',
    payment_terms text,
    lead_time_days integer DEFAULT 0,
    certifications text[],
    notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    CONSTRAINT supplier_name_length CHECK (char_length(name) >= 2 AND char_length(name) <= 200),
    CONSTRAINT supplier_email_format CHECK (contact_email IS NULL OR contact_email ~ '^[^@]+@[^@]+\.[^@]+$'),
    CONSTRAINT supplier_risk_score_range CHECK (risk_score >= 0 AND risk_score <= 100),
    CONSTRAINT supplier_lead_time_positive CHECK (lead_time_days >= 0)
);

-- Inventory items table
CREATE TABLE inventory_item (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    sku text NOT NULL,
    name text NOT NULL,
    description text,
    category inventory_category NOT NULL,
    unit_price numeric(10,2) DEFAULT 0,
    quantity_on_hand integer DEFAULT 0,
    reorder_point integer DEFAULT 0,
    max_stock_level integer,
    unit_of_measure text DEFAULT 'each',
    supplier_id uuid REFERENCES supplier(id) ON DELETE SET NULL,
    barcode text,
    location text,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    CONSTRAINT inventory_sku_org_unique UNIQUE(org_id, sku),
    CONSTRAINT inventory_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 200),
    CONSTRAINT inventory_unit_price_positive CHECK (unit_price >= 0),
    CONSTRAINT inventory_quantity_non_negative CHECK (quantity_on_hand >= 0),
    CONSTRAINT inventory_reorder_point_non_negative CHECK (reorder_point >= 0),
    CONSTRAINT inventory_max_stock_positive CHECK (max_stock_level IS NULL OR max_stock_level > 0)
);

-- Purchase orders table
CREATE TABLE purchase_order (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
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

    CONSTRAINT po_number_org_unique UNIQUE(org_id, po_number),
    CONSTRAINT po_total_amount_non_negative CHECK (total_amount >= 0),
    CONSTRAINT po_tax_amount_non_negative CHECK (tax_amount >= 0),
    CONSTRAINT po_shipping_amount_non_negative CHECK (shipping_amount >= 0),
    CONSTRAINT po_expected_delivery_after_order CHECK (expected_delivery_date IS NULL OR expected_delivery_date >= order_date),
    CONSTRAINT po_actual_delivery_after_order CHECK (actual_delivery_date IS NULL OR actual_delivery_date >= order_date)
);

-- Purchase order line items
CREATE TABLE purchase_order_item (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_order_id uuid NOT NULL REFERENCES purchase_order(id) ON DELETE CASCADE,
    inventory_item_id uuid NOT NULL REFERENCES inventory_item(id) ON DELETE RESTRICT,
    quantity integer NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    total_price numeric(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    quantity_received integer DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    CONSTRAINT poi_quantity_positive CHECK (quantity > 0),
    CONSTRAINT poi_unit_price_non_negative CHECK (unit_price >= 0),
    CONSTRAINT poi_quantity_received_non_negative CHECK (quantity_received >= 0),
    CONSTRAINT poi_quantity_received_not_exceed_ordered CHECK (quantity_received <= quantity)
);

-- Triggers for updated_at
CREATE TRIGGER update_supplier_updated_at BEFORE UPDATE ON supplier FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_inventory_item_updated_at BEFORE UPDATE ON inventory_item FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_purchase_order_updated_at BEFORE UPDATE ON purchase_order FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_purchase_order_item_updated_at BEFORE UPDATE ON purchase_order_item FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Audit triggers
CREATE TRIGGER audit_supplier AFTER INSERT OR UPDATE OR DELETE ON supplier FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER audit_inventory_item AFTER INSERT OR UPDATE OR DELETE ON inventory_item FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER audit_purchase_order AFTER INSERT OR UPDATE OR DELETE ON purchase_order FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER audit_purchase_order_item AFTER INSERT OR UPDATE OR DELETE ON purchase_order_item FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

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

-- Trigger to automatically update PO totals
CREATE TRIGGER update_po_total_on_item_change
    AFTER INSERT OR UPDATE OR DELETE ON purchase_order_item
    FOR EACH ROW EXECUTE FUNCTION update_purchase_order_total();

-- down

DROP TRIGGER IF EXISTS update_po_total_on_item_change ON purchase_order_item;
DROP FUNCTION IF EXISTS update_purchase_order_total();
DROP TRIGGER IF EXISTS audit_purchase_order_item ON purchase_order_item;
DROP TRIGGER IF EXISTS audit_purchase_order ON purchase_order;
DROP TRIGGER IF EXISTS audit_inventory_item ON inventory_item;
DROP TRIGGER IF EXISTS audit_supplier ON supplier;
DROP TRIGGER IF EXISTS update_purchase_order_item_updated_at ON purchase_order_item;
DROP TRIGGER IF EXISTS update_purchase_order_updated_at ON purchase_order;
DROP TRIGGER IF EXISTS update_inventory_item_updated_at ON inventory_item;
DROP TRIGGER IF EXISTS update_supplier_updated_at ON supplier;
DROP TABLE IF EXISTS purchase_order_item;
DROP TABLE IF EXISTS purchase_order;
DROP TABLE IF EXISTS inventory_item;
DROP TABLE IF EXISTS supplier;
DROP TYPE IF EXISTS po_status;
DROP TYPE IF EXISTS inventory_category;
DROP TYPE IF EXISTS supplier_status;