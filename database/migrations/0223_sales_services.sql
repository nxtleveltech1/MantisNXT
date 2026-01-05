-- Migration: 0223_sales_services.sql
-- Description: Sales Services module - Quotations, Sales Orders (manual), Proforma Invoices, Invoices

BEGIN;

-- Document status enums
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'quotation_status') THEN
        CREATE TYPE quotation_status AS ENUM ('draft', 'sent', 'accepted', 'rejected', 'expired', 'converted');
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sales_order_status') THEN
        CREATE TYPE sales_order_status AS ENUM ('draft', 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'completed');
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'proforma_invoice_status') THEN
        CREATE TYPE proforma_invoice_status AS ENUM ('draft', 'sent', 'paid', 'cancelled', 'converted');
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoice_status') THEN
        CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'paid', 'partially_paid', 'overdue', 'cancelled', 'refunded');
    END IF;
END$$;

-- Extend sales_orders table to support manual creation (make connector_id nullable)
ALTER TABLE sales_orders 
    ALTER COLUMN connector_id DROP NOT NULL,
    DROP CONSTRAINT IF EXISTS sales_orders_connector_id_external_id_key;

-- Add manual creation support columns to sales_orders (quotation_id FK added after quotations table is created)
ALTER TABLE sales_orders
    ADD COLUMN IF NOT EXISTS document_number text,
    ADD COLUMN IF NOT EXISTS status_enum sales_order_status DEFAULT 'draft',
    ADD COLUMN IF NOT EXISTS quotation_id uuid,
    ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users_extended(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users_extended(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS notes text,
    ADD COLUMN IF NOT EXISTS valid_until date,
    ADD COLUMN IF NOT EXISTS reference_number text;

-- Quotations table
CREATE TABLE IF NOT EXISTS quotations (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    customer_id uuid NOT NULL REFERENCES customer(id) ON DELETE CASCADE,
    document_number text NOT NULL,
    status quotation_status DEFAULT 'draft',
    currency text DEFAULT 'USD',
    subtotal numeric(12,2) DEFAULT 0,
    total_tax numeric(12,2) DEFAULT 0,
    total numeric(12,2) DEFAULT 0,
    valid_until date,
    reference_number text,
    notes text,
    billing_address jsonb DEFAULT '{}',
    shipping_address jsonb DEFAULT '{}',
    metadata jsonb DEFAULT '{}',
    created_by uuid REFERENCES auth.users_extended(id) ON DELETE SET NULL,
    updated_by uuid REFERENCES auth.users_extended(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    CONSTRAINT quotations_document_number_org_unique UNIQUE(org_id, document_number),
    CONSTRAINT quotations_total_non_negative CHECK (total >= 0),
    CONSTRAINT quotations_subtotal_non_negative CHECK (subtotal >= 0),
    CONSTRAINT quotations_tax_non_negative CHECK (total_tax >= 0)
);

-- Quotation items table
CREATE TABLE IF NOT EXISTS quotation_items (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    quotation_id uuid NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
    product_id uuid,
    supplier_product_id uuid,
    sku text,
    name text NOT NULL,
    description text,
    quantity numeric(12,3) NOT NULL DEFAULT 1,
    unit_price numeric(12,2) NOT NULL,
    tax_rate numeric(5,4) DEFAULT 0,
    tax_amount numeric(12,2) DEFAULT 0,
    subtotal numeric(12,2) NOT NULL,
    total numeric(12,2) NOT NULL,
    line_number integer,
    metadata jsonb DEFAULT '{}',
    
    CONSTRAINT quotation_items_quantity_positive CHECK (quantity > 0),
    CONSTRAINT quotation_items_unit_price_non_negative CHECK (unit_price >= 0),
    CONSTRAINT quotation_items_subtotal_non_negative CHECK (subtotal >= 0),
    CONSTRAINT quotation_items_total_non_negative CHECK (total >= 0)
);

-- Proforma invoices table
CREATE TABLE IF NOT EXISTS proforma_invoices (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    customer_id uuid NOT NULL REFERENCES customer(id) ON DELETE CASCADE,
    sales_order_id uuid REFERENCES sales_orders(id) ON DELETE SET NULL,
    document_number text NOT NULL,
    status proforma_invoice_status DEFAULT 'draft',
    currency text DEFAULT 'USD',
    subtotal numeric(12,2) DEFAULT 0,
    total_tax numeric(12,2) DEFAULT 0,
    total numeric(12,2) DEFAULT 0,
    reference_number text,
    notes text,
    billing_address jsonb DEFAULT '{}',
    shipping_address jsonb DEFAULT '{}',
    metadata jsonb DEFAULT '{}',
    created_by uuid REFERENCES auth.users_extended(id) ON DELETE SET NULL,
    updated_by uuid REFERENCES auth.users_extended(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    CONSTRAINT proforma_invoices_document_number_org_unique UNIQUE(org_id, document_number),
    CONSTRAINT proforma_invoices_total_non_negative CHECK (total >= 0),
    CONSTRAINT proforma_invoices_subtotal_non_negative CHECK (subtotal >= 0),
    CONSTRAINT proforma_invoices_tax_non_negative CHECK (total_tax >= 0)
);

-- Proforma invoice items table
CREATE TABLE IF NOT EXISTS proforma_invoice_items (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    proforma_invoice_id uuid NOT NULL REFERENCES proforma_invoices(id) ON DELETE CASCADE,
    product_id uuid,
    supplier_product_id uuid,
    sku text,
    name text NOT NULL,
    description text,
    quantity numeric(12,3) NOT NULL DEFAULT 1,
    unit_price numeric(12,2) NOT NULL,
    tax_rate numeric(5,4) DEFAULT 0,
    tax_amount numeric(12,2) DEFAULT 0,
    subtotal numeric(12,2) NOT NULL,
    total numeric(12,2) NOT NULL,
    line_number integer,
    metadata jsonb DEFAULT '{}',
    
    CONSTRAINT proforma_invoice_items_quantity_positive CHECK (quantity > 0),
    CONSTRAINT proforma_invoice_items_unit_price_non_negative CHECK (unit_price >= 0),
    CONSTRAINT proforma_invoice_items_subtotal_non_negative CHECK (subtotal >= 0),
    CONSTRAINT proforma_invoice_items_total_non_negative CHECK (total >= 0)
);

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    customer_id uuid NOT NULL REFERENCES customer(id) ON DELETE CASCADE,
    sales_order_id uuid REFERENCES sales_orders(id) ON DELETE SET NULL,
    proforma_invoice_id uuid REFERENCES proforma_invoices(id) ON DELETE SET NULL,
    document_number text NOT NULL,
    status invoice_status DEFAULT 'draft',
    currency text DEFAULT 'USD',
    subtotal numeric(12,2) DEFAULT 0,
    total_tax numeric(12,2) DEFAULT 0,
    total numeric(12,2) DEFAULT 0,
    amount_paid numeric(12,2) DEFAULT 0,
    amount_due numeric(12,2) DEFAULT 0,
    due_date date,
    paid_at timestamptz,
    reference_number text,
    notes text,
    billing_address jsonb DEFAULT '{}',
    shipping_address jsonb DEFAULT '{}',
    metadata jsonb DEFAULT '{}',
    created_by uuid REFERENCES auth.users_extended(id) ON DELETE SET NULL,
    updated_by uuid REFERENCES auth.users_extended(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    CONSTRAINT invoices_document_number_org_unique UNIQUE(org_id, document_number),
    CONSTRAINT invoices_total_non_negative CHECK (total >= 0),
    CONSTRAINT invoices_subtotal_non_negative CHECK (subtotal >= 0),
    CONSTRAINT invoices_tax_non_negative CHECK (total_tax >= 0),
    CONSTRAINT invoices_amount_paid_non_negative CHECK (amount_paid >= 0),
    CONSTRAINT invoices_amount_due_non_negative CHECK (amount_due >= 0),
    CONSTRAINT invoices_amount_due_calculation CHECK (amount_due = total - amount_paid)
);

-- Invoice items table
CREATE TABLE IF NOT EXISTS invoice_items (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    product_id uuid,
    supplier_product_id uuid,
    sku text,
    name text NOT NULL,
    description text,
    quantity numeric(12,3) NOT NULL DEFAULT 1,
    unit_price numeric(12,2) NOT NULL,
    tax_rate numeric(5,4) DEFAULT 0,
    tax_amount numeric(12,2) DEFAULT 0,
    subtotal numeric(12,2) NOT NULL,
    total numeric(12,2) NOT NULL,
    line_number integer,
    metadata jsonb DEFAULT '{}',
    
    CONSTRAINT invoice_items_quantity_positive CHECK (quantity > 0),
    CONSTRAINT invoice_items_unit_price_non_negative CHECK (unit_price >= 0),
    CONSTRAINT invoice_items_subtotal_non_negative CHECK (subtotal >= 0),
    CONSTRAINT invoice_items_total_non_negative CHECK (total >= 0)
);

-- Indexes for quotations
CREATE INDEX IF NOT EXISTS idx_quotations_org ON quotations(org_id);
CREATE INDEX IF NOT EXISTS idx_quotations_customer ON quotations(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status);
CREATE INDEX IF NOT EXISTS idx_quotations_document_number ON quotations(document_number);
CREATE INDEX IF NOT EXISTS idx_quotations_created_at ON quotations(created_at);
CREATE INDEX IF NOT EXISTS idx_quotation_items_quotation ON quotation_items(quotation_id);
CREATE INDEX IF NOT EXISTS idx_quotation_items_product ON quotation_items(product_id);
CREATE INDEX IF NOT EXISTS idx_quotation_items_sku ON quotation_items(sku);

-- Indexes for proforma invoices
CREATE INDEX IF NOT EXISTS idx_proforma_invoices_org ON proforma_invoices(org_id);
CREATE INDEX IF NOT EXISTS idx_proforma_invoices_customer ON proforma_invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_proforma_invoices_sales_order ON proforma_invoices(sales_order_id);
CREATE INDEX IF NOT EXISTS idx_proforma_invoices_status ON proforma_invoices(status);
CREATE INDEX IF NOT EXISTS idx_proforma_invoices_document_number ON proforma_invoices(document_number);
CREATE INDEX IF NOT EXISTS idx_proforma_invoices_created_at ON proforma_invoices(created_at);
CREATE INDEX IF NOT EXISTS idx_proforma_invoice_items_proforma ON proforma_invoice_items(proforma_invoice_id);
CREATE INDEX IF NOT EXISTS idx_proforma_invoice_items_product ON proforma_invoice_items(product_id);
CREATE INDEX IF NOT EXISTS idx_proforma_invoice_items_sku ON proforma_invoice_items(sku);

-- Indexes for invoices
CREATE INDEX IF NOT EXISTS idx_invoices_org ON invoices(org_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_sales_order ON invoices(sales_order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_proforma ON invoices(proforma_invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_document_number ON invoices(document_number);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_product ON invoice_items(product_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_sku ON invoice_items(sku);

-- Add foreign key constraint for quotation_id after quotations table exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'sales_orders_quotation_id_fkey'
    ) THEN
        ALTER TABLE sales_orders
        ADD CONSTRAINT sales_orders_quotation_id_fkey 
        FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE SET NULL;
    END IF;
END$$;

-- Indexes for extended sales_orders
CREATE INDEX IF NOT EXISTS idx_sales_orders_quotation ON sales_orders(quotation_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_document_number ON sales_orders(document_number);
CREATE INDEX IF NOT EXISTS idx_sales_orders_status_enum ON sales_orders(status_enum);

-- Function to generate year-prefixed document numbers
CREATE OR REPLACE FUNCTION generate_document_number(
    p_org_id uuid,
    p_prefix text,
    p_table_name text
) RETURNS text AS $$
DECLARE
    v_year text;
    v_next_num integer;
    v_document_number text;
BEGIN
    v_year := TO_CHAR(CURRENT_DATE, 'YYYY');
    
    -- Get next sequence number for this org, prefix, and year
    SELECT COALESCE(MAX(CAST(substring(document_number FROM '\d+$') AS integer)), 0) + 1
    INTO v_next_num
    FROM (
        SELECT document_number FROM quotations WHERE org_id = p_org_id AND document_number LIKE p_prefix || '-' || v_year || '-%'
        UNION ALL
        SELECT document_number FROM sales_orders WHERE org_id = p_org_id AND document_number LIKE p_prefix || '-' || v_year || '-%'
        UNION ALL
        SELECT document_number FROM proforma_invoices WHERE org_id = p_org_id AND document_number LIKE p_prefix || '-' || v_year || '-%'
        UNION ALL
        SELECT document_number FROM invoices WHERE org_id = p_org_id AND document_number LIKE p_prefix || '-' || v_year || '-%'
    ) all_docs
    WHERE document_number ~ ('^' || p_prefix || '-' || v_year || '-\d+$');
    
    v_document_number := p_prefix || '-' || v_year || '-' || LPAD(v_next_num::text, 4, '0');
    
    RETURN v_document_number;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate quotation totals
CREATE OR REPLACE FUNCTION calculate_quotation_totals(p_quotation_id uuid)
RETURNS void AS $$
DECLARE
    v_subtotal numeric(12,2);
    v_total_tax numeric(12,2);
    v_total numeric(12,2);
BEGIN
    SELECT 
        COALESCE(SUM(subtotal), 0),
        COALESCE(SUM(tax_amount), 0),
        COALESCE(SUM(total), 0)
    INTO v_subtotal, v_total_tax, v_total
    FROM quotation_items
    WHERE quotation_id = p_quotation_id;
    
    UPDATE quotations
    SET 
        subtotal = v_subtotal,
        total_tax = v_total_tax,
        total = v_total,
        updated_at = now()
    WHERE id = p_quotation_id;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate proforma invoice totals
CREATE OR REPLACE FUNCTION calculate_proforma_invoice_totals(p_proforma_invoice_id uuid)
RETURNS void AS $$
DECLARE
    v_subtotal numeric(12,2);
    v_total_tax numeric(12,2);
    v_total numeric(12,2);
BEGIN
    SELECT 
        COALESCE(SUM(subtotal), 0),
        COALESCE(SUM(tax_amount), 0),
        COALESCE(SUM(total), 0)
    INTO v_subtotal, v_total_tax, v_total
    FROM proforma_invoice_items
    WHERE proforma_invoice_id = p_proforma_invoice_id;
    
    UPDATE proforma_invoices
    SET 
        subtotal = v_subtotal,
        total_tax = v_total_tax,
        total = v_total,
        updated_at = now()
    WHERE id = p_proforma_invoice_id;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate invoice totals
CREATE OR REPLACE FUNCTION calculate_invoice_totals(p_invoice_id uuid)
RETURNS void AS $$
DECLARE
    v_subtotal numeric(12,2);
    v_total_tax numeric(12,2);
    v_total numeric(12,2);
    v_amount_due numeric(12,2);
BEGIN
    SELECT 
        COALESCE(SUM(subtotal), 0),
        COALESCE(SUM(tax_amount), 0),
        COALESCE(SUM(total), 0)
    INTO v_subtotal, v_total_tax, v_total
    FROM invoice_items
    WHERE invoice_id = p_invoice_id;
    
    SELECT COALESCE(amount_paid, 0) INTO v_amount_due FROM invoices WHERE id = p_invoice_id;
    v_amount_due := v_total - v_amount_due;
    
    UPDATE invoices
    SET 
        subtotal = v_subtotal,
        total_tax = v_total_tax,
        total = v_total,
        amount_due = v_amount_due,
        updated_at = now()
    WHERE id = p_invoice_id;
END;
$$ LANGUAGE plpgsql;

-- Triggers to auto-calculate totals when items change
CREATE OR REPLACE FUNCTION trigger_calculate_quotation_totals()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM calculate_quotation_totals(COALESCE(NEW.quotation_id, OLD.quotation_id));
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trigger_calculate_proforma_invoice_totals()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM calculate_proforma_invoice_totals(COALESCE(NEW.proforma_invoice_id, OLD.proforma_invoice_id));
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trigger_calculate_invoice_totals()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM calculate_invoice_totals(COALESCE(NEW.invoice_id, OLD.invoice_id));
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS calculate_quotation_totals_trigger ON quotation_items;
DROP TRIGGER IF EXISTS calculate_proforma_invoice_totals_trigger ON proforma_invoice_items;
DROP TRIGGER IF EXISTS calculate_invoice_totals_trigger ON invoice_items;

-- Create triggers
CREATE TRIGGER calculate_quotation_totals_trigger
    AFTER INSERT OR UPDATE OR DELETE ON quotation_items
    FOR EACH ROW EXECUTE FUNCTION trigger_calculate_quotation_totals();

CREATE TRIGGER calculate_proforma_invoice_totals_trigger
    AFTER INSERT OR UPDATE OR DELETE ON proforma_invoice_items
    FOR EACH ROW EXECUTE FUNCTION trigger_calculate_proforma_invoice_totals();

CREATE TRIGGER calculate_invoice_totals_trigger
    AFTER INSERT OR UPDATE OR DELETE ON invoice_items
    FOR EACH ROW EXECUTE FUNCTION trigger_calculate_invoice_totals();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_quotations_updated_at ON quotations;
CREATE TRIGGER update_quotations_updated_at 
    BEFORE UPDATE ON quotations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_proforma_invoices_updated_at ON proforma_invoices;
CREATE TRIGGER update_proforma_invoices_updated_at 
    BEFORE UPDATE ON proforma_invoices 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices;
CREATE TRIGGER update_invoices_updated_at 
    BEFORE UPDATE ON invoices 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to convert quotation to sales order
CREATE OR REPLACE FUNCTION convert_quotation_to_sales_order(
    p_quotation_id uuid,
    p_created_by uuid
) RETURNS uuid AS $$
DECLARE
    v_quotation quotations%ROWTYPE;
    v_sales_order_id uuid;
    v_document_number text;
    v_item quotation_items%ROWTYPE;
BEGIN
    -- Get quotation
    SELECT * INTO v_quotation FROM quotations WHERE id = p_quotation_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Quotation not found: %', p_quotation_id;
    END IF;
    
    IF v_quotation.status NOT IN ('draft', 'sent', 'accepted') THEN
        RAISE EXCEPTION 'Quotation status (%) does not allow conversion', v_quotation.status;
    END IF;
    
    -- Generate sales order document number
    v_document_number := generate_document_number(v_quotation.org_id, 'SO', 'sales_orders');
    
    -- Create sales order
    INSERT INTO sales_orders (
        org_id,
        customer_id,
        document_number,
        status_enum,
        quotation_id,
        currency,
        total,
        total_tax,
        billing,
        shipping,
        created_by,
        created_at,
        modified_at,
        metadata
    ) VALUES (
        v_quotation.org_id,
        v_quotation.customer_id,
        v_document_number,
        'draft',
        p_quotation_id,
        v_quotation.currency,
        v_quotation.total,
        v_quotation.total_tax,
        v_quotation.billing_address,
        v_quotation.shipping_address,
        p_created_by,
        now(),
        now(),
        jsonb_build_object('converted_from_quotation', p_quotation_id)
    ) RETURNING id INTO v_sales_order_id;
    
    -- Copy items
    FOR v_item IN SELECT * FROM quotation_items WHERE quotation_id = p_quotation_id ORDER BY line_number, id
    LOOP
        INSERT INTO sales_order_items (
            sales_order_id,
            product_id,
            sku,
            name,
            quantity,
            price,
            subtotal,
            total,
            tax,
            metadata
        ) VALUES (
            v_sales_order_id,
            v_item.product_id,
            v_item.sku,
            v_item.name,
            v_item.quantity,
            v_item.unit_price,
            v_item.subtotal,
            v_item.total,
            v_item.tax_amount,
            v_item.metadata
        );
    END LOOP;
    
    -- Update quotation status
    UPDATE quotations SET status = 'converted', updated_at = now() WHERE id = p_quotation_id;
    
    RETURN v_sales_order_id;
END;
$$ LANGUAGE plpgsql;

-- Function to convert sales order to proforma invoice
CREATE OR REPLACE FUNCTION convert_sales_order_to_proforma_invoice(
    p_sales_order_id uuid,
    p_created_by uuid
) RETURNS uuid AS $$
DECLARE
    v_sales_order sales_orders%ROWTYPE;
    v_proforma_invoice_id uuid;
    v_document_number text;
    v_item sales_order_items%ROWTYPE;
BEGIN
    -- Get sales order
    SELECT * INTO v_sales_order FROM sales_orders WHERE id = p_sales_order_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Sales order not found: %', p_sales_order_id;
    END IF;
    
    IF v_sales_order.status_enum NOT IN ('draft', 'pending', 'confirmed') THEN
        RAISE EXCEPTION 'Sales order status (%) does not allow conversion', v_sales_order.status_enum;
    END IF;
    
    -- Generate proforma invoice document number
    v_document_number := generate_document_number(v_sales_order.org_id, 'PFI', 'proforma_invoices');
    
    -- Create proforma invoice
    INSERT INTO proforma_invoices (
        org_id,
        customer_id,
        sales_order_id,
        document_number,
        status,
        currency,
        subtotal,
        total_tax,
        total,
        billing_address,
        shipping_address,
        created_by,
        metadata
    ) VALUES (
        v_sales_order.org_id,
        v_sales_order.customer_id,
        p_sales_order_id,
        v_document_number,
        'draft',
        COALESCE(v_sales_order.currency, 'USD'),
        (SELECT COALESCE(SUM(subtotal), 0) FROM sales_order_items WHERE sales_order_id = p_sales_order_id),
        COALESCE(v_sales_order.total_tax, 0),
        COALESCE(v_sales_order.total, 0),
        COALESCE(v_sales_order.billing, '{}'::jsonb),
        COALESCE(v_sales_order.shipping, '{}'::jsonb),
        p_created_by,
        jsonb_build_object('converted_from_sales_order', p_sales_order_id)
    ) RETURNING id INTO v_proforma_invoice_id;
    
    -- Copy items
    FOR v_item IN SELECT * FROM sales_order_items WHERE sales_order_id = p_sales_order_id ORDER BY id
    LOOP
        INSERT INTO proforma_invoice_items (
            proforma_invoice_id,
            product_id,
            sku,
            name,
            quantity,
            unit_price,
            subtotal,
            total,
            tax_amount,
            metadata
        ) VALUES (
            v_proforma_invoice_id,
            v_item.product_id,
            v_item.sku,
            v_item.name,
            v_item.quantity,
            v_item.price,
            v_item.subtotal,
            v_item.total,
            COALESCE(v_item.tax, 0),
            v_item.metadata
        );
    END LOOP;
    
    -- Recalculate totals
    PERFORM calculate_proforma_invoice_totals(v_proforma_invoice_id);
    
    RETURN v_proforma_invoice_id;
END;
$$ LANGUAGE plpgsql;

-- Function to convert proforma invoice to invoice
CREATE OR REPLACE FUNCTION convert_proforma_invoice_to_invoice(
    p_proforma_invoice_id uuid,
    p_created_by uuid,
    p_due_date date DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
    v_proforma proforma_invoices%ROWTYPE;
    v_invoice_id uuid;
    v_document_number text;
    v_item proforma_invoice_items%ROWTYPE;
BEGIN
    -- Get proforma invoice
    SELECT * INTO v_proforma FROM proforma_invoices WHERE id = p_proforma_invoice_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Proforma invoice not found: %', p_proforma_invoice_id;
    END IF;
    
    IF v_proforma.status NOT IN ('draft', 'sent') THEN
        RAISE EXCEPTION 'Proforma invoice status (%) does not allow conversion', v_proforma.status;
    END IF;
    
    -- Generate invoice document number
    v_document_number := generate_document_number(v_proforma.org_id, 'INV', 'invoices');
    
    -- Calculate due date (default 30 days from now if not provided)
    IF p_due_date IS NULL THEN
        p_due_date := CURRENT_DATE + INTERVAL '30 days';
    END IF;
    
    -- Create invoice
    INSERT INTO invoices (
        org_id,
        customer_id,
        sales_order_id,
        proforma_invoice_id,
        document_number,
        status,
        currency,
        subtotal,
        total_tax,
        total,
        amount_due,
        due_date,
        billing_address,
        shipping_address,
        created_by,
        metadata
    ) VALUES (
        v_proforma.org_id,
        v_proforma.customer_id,
        v_proforma.sales_order_id,
        p_proforma_invoice_id,
        v_document_number,
        'draft',
        v_proforma.currency,
        v_proforma.subtotal,
        v_proforma.total_tax,
        v_proforma.total,
        v_proforma.total,
        p_due_date,
        v_proforma.billing_address,
        v_proforma.shipping_address,
        p_created_by,
        jsonb_build_object('converted_from_proforma_invoice', p_proforma_invoice_id)
    ) RETURNING id INTO v_invoice_id;
    
    -- Copy items
    FOR v_item IN SELECT * FROM proforma_invoice_items WHERE proforma_invoice_id = p_proforma_invoice_id ORDER BY line_number, id
    LOOP
        INSERT INTO invoice_items (
            invoice_id,
            product_id,
            sku,
            name,
            quantity,
            unit_price,
            subtotal,
            total,
            tax_amount,
            metadata
        ) VALUES (
            v_invoice_id,
            v_item.product_id,
            v_item.sku,
            v_item.name,
            v_item.quantity,
            v_item.unit_price,
            v_item.subtotal,
            v_item.total,
            v_item.tax_amount,
            v_item.metadata
        );
    END LOOP;
    
    -- Recalculate totals
    PERFORM calculate_invoice_totals(v_invoice_id);
    
    -- Update proforma invoice status
    UPDATE proforma_invoices SET status = 'converted', updated_at = now() WHERE id = p_proforma_invoice_id;
    
    RETURN v_invoice_id;
END;
$$ LANGUAGE plpgsql;

-- RLS Policies (if RLS is enabled)
-- Note: These assume RLS is set up for organization-scoped access
-- Adjust based on your actual RLS setup

-- Insert migration record
INSERT INTO schema_migrations (migration_name)
VALUES ('0223_sales_services')
ON CONFLICT (migration_name) DO NOTHING;

COMMIT;

