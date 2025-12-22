-- ============================================================================
-- Migration: 0233_add_financial_aspects_rentals_repairs.sql
-- Date: 2025-01-27
-- Description: Add comprehensive financial aspects to Rentals and Repairs modules
-- ============================================================================

BEGIN;

-- ============================================================================
-- ENUMS FOR FINANCIAL STATUS
-- ============================================================================

-- Payment Status for Rentals and Repairs
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rental_payment_status') THEN
        CREATE TYPE rental_payment_status AS ENUM (
            'pending', 'deposit_paid', 'partially_paid', 'paid', 'overdue', 'refunded', 'cancelled'
        );
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'repair_payment_status') THEN
        CREATE TYPE repair_payment_status AS ENUM (
            'pending', 'quote_sent', 'quote_approved', 'deposit_paid', 'partially_paid', 'paid', 'overdue', 'warranty_covered', 'cancelled'
        );
    END IF;
END$$;

-- ============================================================================
-- RENTALS FINANCIAL ENHANCEMENTS
-- ============================================================================

-- Add financial fields to rentals.reservations
ALTER TABLE rentals.reservations
    ADD COLUMN IF NOT EXISTS ar_invoice_id UUID REFERENCES ar_customer_invoices(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS quote_id UUID, -- For future quotations table
    ADD COLUMN IF NOT EXISTS quote_number VARCHAR(50),
    ADD COLUMN IF NOT EXISTS quote_date DATE,
    ADD COLUMN IF NOT EXISTS quote_expiry_date DATE,
    ADD COLUMN IF NOT EXISTS quote_approved BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS quote_approved_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS quote_approved_by UUID,
    
    -- Financial Summary Fields
    ADD COLUMN IF NOT EXISTS subtotal DECIMAL(15,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5,4) DEFAULT 0.15, -- Default 15% VAT for South Africa
    ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(15,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_rental_amount DECIMAL(15,2) DEFAULT 0, -- Total before deposit
    ADD COLUMN IF NOT EXISTS total_amount_due DECIMAL(15,2) DEFAULT 0, -- Total including all charges
    
    -- Payment Tracking
    ADD COLUMN IF NOT EXISTS payment_status rental_payment_status DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(15,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS amount_due DECIMAL(15,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS payment_terms VARCHAR(50) DEFAULT 'Net 30',
    ADD COLUMN IF NOT EXISTS due_date DATE,
    ADD COLUMN IF NOT EXISTS first_payment_date TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS fully_paid_date TIMESTAMPTZ,
    
    -- Currency and Exchange Rate
    ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'ZAR',
    ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(10,6) DEFAULT 1.0,
    
    -- Additional Charges
    ADD COLUMN IF NOT EXISTS late_return_fee DECIMAL(15,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS cleaning_fee DECIMAL(15,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS other_charges DECIMAL(15,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS other_charges_description TEXT,
    
    -- Refund Tracking
    ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(15,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS refund_date TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS refund_reason TEXT;

-- Add indexes for financial queries
CREATE INDEX IF NOT EXISTS idx_rentals_reservations_invoice ON rentals.reservations(ar_invoice_id) WHERE ar_invoice_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rentals_reservations_payment_status ON rentals.reservations(payment_status);
CREATE INDEX IF NOT EXISTS idx_rentals_reservations_due_date ON rentals.reservations(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rentals_reservations_quote_number ON rentals.reservations(quote_number) WHERE quote_number IS NOT NULL;

-- Add financial fields to rentals.reservation_items
ALTER TABLE rentals.reservation_items
    ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5,4) DEFAULT 0.15,
    ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS discount_percentage DECIMAL(5,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(15,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS line_total_before_tax DECIMAL(15,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS line_total_after_tax DECIMAL(15,2) DEFAULT 0;

-- Update constraint to ensure line_total matches line_total_after_tax
ALTER TABLE rentals.reservation_items
    DROP CONSTRAINT IF EXISTS reservation_items_line_total_check;
    
ALTER TABLE rentals.reservation_items
    ADD CONSTRAINT reservation_items_line_total_check 
    CHECK (line_total = line_total_after_tax OR line_total_after_tax = 0);

-- ============================================================================
-- REPAIRS FINANCIAL ENHANCEMENTS
-- ============================================================================

-- Add financial fields to repairs.repair_orders
ALTER TABLE repairs.repair_orders
    -- Invoice Reference (replace the placeholder invoice_id)
    DROP COLUMN IF EXISTS invoice_id, -- Remove old placeholder
    ADD COLUMN IF NOT EXISTS ar_invoice_id UUID REFERENCES ar_customer_invoices(id) ON DELETE SET NULL,
    
    -- Quote/Estimate Fields
    ADD COLUMN IF NOT EXISTS quote_id UUID, -- For future quotations table
    ADD COLUMN IF NOT EXISTS quote_number VARCHAR(50),
    ADD COLUMN IF NOT EXISTS quote_date DATE,
    ADD COLUMN IF NOT EXISTS quote_expiry_date DATE,
    ADD COLUMN IF NOT EXISTS quote_sent_date TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS quote_approved BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS quote_approved_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS quote_approved_by UUID,
    
    -- Estimate vs Actual Costs
    ADD COLUMN IF NOT EXISTS estimated_labor_hours DECIMAL(10,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS estimated_labor_cost DECIMAL(15,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS estimated_parts_cost DECIMAL(15,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS estimated_total_cost DECIMAL(15,2) DEFAULT 0,
    
    -- Actual Costs (keeping existing fields but adding tax)
    ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5,4) DEFAULT 0.15, -- Default 15% VAT
    ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(15,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS subtotal DECIMAL(15,2) DEFAULT 0, -- labor_cost + parts_cost
    ADD COLUMN IF NOT EXISTS total_cost_before_tax DECIMAL(15,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_cost_after_tax DECIMAL(15,2) DEFAULT 0, -- Final total
    
    -- Payment Tracking
    ADD COLUMN IF NOT EXISTS payment_status repair_payment_status DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(15,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS amount_due DECIMAL(15,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS payment_terms VARCHAR(50) DEFAULT 'Net 30',
    ADD COLUMN IF NOT EXISTS due_date DATE,
    ADD COLUMN IF NOT EXISTS first_payment_date TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS fully_paid_date TIMESTAMPTZ,
    
    -- Currency and Exchange Rate
    ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'ZAR',
    ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(10,6) DEFAULT 1.0,
    
    -- Deposit/Payment Schedule
    ADD COLUMN IF NOT EXISTS deposit_required BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS deposit_amount DECIMAL(15,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS deposit_paid DECIMAL(15,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS deposit_paid_date TIMESTAMPTZ,
    
    -- Additional Charges
    ADD COLUMN IF NOT EXISTS diagnostic_fee DECIMAL(15,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS rush_fee DECIMAL(15,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS other_charges DECIMAL(15,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS other_charges_description TEXT,
    
    -- Refund Tracking
    ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(15,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS refund_date TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS refund_reason TEXT;

-- Update total_cost to reference total_cost_after_tax
-- Keep total_cost for backward compatibility, but it should match total_cost_after_tax
ALTER TABLE repairs.repair_orders
    DROP CONSTRAINT IF EXISTS repairs_total_cost_check;
    
ALTER TABLE repairs.repair_orders
    ADD CONSTRAINT repairs_total_cost_check 
    CHECK (total_cost = total_cost_after_tax OR total_cost_after_tax = 0);

-- Add indexes for financial queries
CREATE INDEX IF NOT EXISTS idx_repairs_orders_invoice ON repairs.repair_orders(ar_invoice_id) WHERE ar_invoice_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_repairs_orders_payment_status ON repairs.repair_orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_repairs_orders_due_date ON repairs.repair_orders(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_repairs_orders_quote_number ON repairs.repair_orders(quote_number) WHERE quote_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_repairs_orders_warranty ON repairs.repair_orders(warranty_covered) WHERE warranty_covered = true;

-- Add financial fields to repairs.repair_order_items
ALTER TABLE repairs.repair_order_items
    ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5,4) DEFAULT 0.15,
    ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS discount_percentage DECIMAL(5,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(15,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS line_total_before_tax DECIMAL(15,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS line_total_after_tax DECIMAL(15,2) DEFAULT 0;

-- Update constraint to ensure line_total matches line_total_after_tax
ALTER TABLE repairs.repair_order_items
    DROP CONSTRAINT IF EXISTS repair_order_items_line_total_check;
    
ALTER TABLE repairs.repair_order_items
    ADD CONSTRAINT repair_order_items_line_total_check 
    CHECK (line_total = line_total_after_tax OR line_total_after_tax = 0);

-- ============================================================================
-- FUNCTIONS FOR AUTOMATIC CALCULATIONS
-- ============================================================================

-- Function to calculate rental totals
CREATE OR REPLACE FUNCTION rentals.calculate_reservation_totals()
RETURNS TRIGGER AS $$
DECLARE
    v_subtotal DECIMAL(15,2);
    v_tax_amount DECIMAL(15,2);
    v_total DECIMAL(15,2);
BEGIN
    -- Calculate subtotal from reservation items
    SELECT COALESCE(SUM(line_total_after_tax), 0) INTO v_subtotal
    FROM rentals.reservation_items
    WHERE reservation_id = NEW.reservation_id;
    
    -- Add delivery and setup costs
    v_subtotal := v_subtotal + COALESCE(NEW.delivery_cost, 0) + COALESCE(NEW.setup_cost, 0);
    v_subtotal := v_subtotal + COALESCE(NEW.late_return_fee, 0) + COALESCE(NEW.cleaning_fee, 0) + COALESCE(NEW.other_charges, 0);
    
    -- Apply discount
    v_subtotal := v_subtotal - COALESCE(NEW.discount_amount, 0);
    
    -- Calculate tax
    v_tax_amount := v_subtotal * COALESCE(NEW.tax_rate, 0.15);
    
    -- Calculate total
    v_total := v_subtotal + v_tax_amount;
    
    -- Update fields
    NEW.subtotal := v_subtotal;
    NEW.tax_amount := v_tax_amount;
    NEW.total_rental_amount := v_subtotal;
    NEW.total_amount_due := v_total;
    NEW.amount_due := v_total - COALESCE(NEW.amount_paid, 0);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-calculate reservation totals
DROP TRIGGER IF EXISTS trigger_rentals_calculate_totals ON rentals.reservations;
CREATE TRIGGER trigger_rentals_calculate_totals
    BEFORE INSERT OR UPDATE ON rentals.reservations
    FOR EACH ROW
    EXECUTE FUNCTION rentals.calculate_reservation_totals();

-- Function to calculate repair order totals
CREATE OR REPLACE FUNCTION repairs.calculate_repair_order_totals()
RETURNS TRIGGER AS $$
DECLARE
    v_subtotal DECIMAL(15,2);
    v_tax_amount DECIMAL(15,2);
    v_total DECIMAL(15,2);
BEGIN
    -- Calculate subtotal (labor + parts + additional charges)
    v_subtotal := COALESCE(NEW.labor_cost, 0) + COALESCE(NEW.parts_cost, 0);
    v_subtotal := v_subtotal + COALESCE(NEW.diagnostic_fee, 0) + COALESCE(NEW.rush_fee, 0) + COALESCE(NEW.other_charges, 0);
    
    -- Apply discount
    v_subtotal := v_subtotal - COALESCE(NEW.discount_amount, 0);
    
    -- Calculate tax (only if not warranty covered)
    IF NEW.warranty_covered = true THEN
        v_tax_amount := 0;
    ELSE
        v_tax_amount := v_subtotal * COALESCE(NEW.tax_rate, 0.15);
    END IF;
    
    -- Calculate total
    v_total := v_subtotal + v_tax_amount;
    
    -- Update fields
    NEW.subtotal := v_subtotal;
    NEW.tax_amount := v_tax_amount;
    NEW.total_cost_before_tax := v_subtotal;
    NEW.total_cost_after_tax := v_total;
    NEW.total_cost := v_total; -- Backward compatibility
    NEW.amount_due := v_total - COALESCE(NEW.amount_paid, 0);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-calculate repair order totals
DROP TRIGGER IF EXISTS trigger_repairs_calculate_totals ON repairs.repair_orders;
CREATE TRIGGER trigger_repairs_calculate_totals
    BEFORE INSERT OR UPDATE ON repairs.repair_orders
    FOR EACH ROW
    EXECUTE FUNCTION repairs.calculate_repair_order_totals();

-- Function to calculate reservation item totals
CREATE OR REPLACE FUNCTION rentals.calculate_reservation_item_totals()
RETURNS TRIGGER AS $$
DECLARE
    v_line_total_before_tax DECIMAL(15,2);
    v_tax_amount DECIMAL(15,2);
    v_line_total_after_tax DECIMAL(15,2);
BEGIN
    -- Calculate line total before tax
    v_line_total_before_tax := NEW.rental_rate * NEW.rental_period_days * NEW.quantity;
    v_line_total_before_tax := v_line_total_before_tax - COALESCE(NEW.discount_amount, 0);
    
    -- Calculate tax
    v_tax_amount := v_line_total_before_tax * COALESCE(NEW.tax_rate, 0.15);
    
    -- Calculate line total after tax
    v_line_total_after_tax := v_line_total_before_tax + v_tax_amount;
    
    -- Update fields
    NEW.line_total_before_tax := v_line_total_before_tax;
    NEW.tax_amount := v_tax_amount;
    NEW.line_total_after_tax := v_line_total_after_tax;
    NEW.line_total := v_line_total_after_tax; -- Backward compatibility
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-calculate reservation item totals
DROP TRIGGER IF EXISTS trigger_rentals_calculate_item_totals ON rentals.reservation_items;
CREATE TRIGGER trigger_rentals_calculate_item_totals
    BEFORE INSERT OR UPDATE ON rentals.reservation_items
    FOR EACH ROW
    EXECUTE FUNCTION rentals.calculate_reservation_item_totals();

-- Function to calculate repair order item totals
CREATE OR REPLACE FUNCTION repairs.calculate_repair_order_item_totals()
RETURNS TRIGGER AS $$
DECLARE
    v_line_total_before_tax DECIMAL(15,2);
    v_tax_amount DECIMAL(15,2);
    v_line_total_after_tax DECIMAL(15,2);
BEGIN
    -- Calculate line total before tax
    v_line_total_before_tax := COALESCE(NEW.unit_cost, 0) * NEW.quantity;
    v_line_total_before_tax := v_line_total_before_tax - COALESCE(NEW.discount_amount, 0);
    
    -- Calculate tax
    v_tax_amount := v_line_total_before_tax * COALESCE(NEW.tax_rate, 0.15);
    
    -- Calculate line total after tax
    v_line_total_after_tax := v_line_total_before_tax + v_tax_amount;
    
    -- Update fields
    NEW.line_total_before_tax := v_line_total_before_tax;
    NEW.tax_amount := v_tax_amount;
    NEW.line_total_after_tax := v_line_total_after_tax;
    NEW.line_total := v_line_total_after_tax; -- Backward compatibility
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-calculate repair order item totals
DROP TRIGGER IF EXISTS trigger_repairs_calculate_item_totals ON repairs.repair_order_items;
CREATE TRIGGER trigger_repairs_calculate_item_totals
    BEFORE INSERT OR UPDATE ON repairs.repair_order_items
    FOR EACH ROW
    EXECUTE FUNCTION repairs.calculate_repair_order_item_totals();

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN rentals.reservations.ar_invoice_id IS 'Reference to AR customer invoice for this rental';
COMMENT ON COLUMN rentals.reservations.payment_status IS 'Current payment status of the rental';
COMMENT ON COLUMN rentals.reservations.tax_rate IS 'VAT rate (default 15% for South Africa)';
COMMENT ON COLUMN rentals.reservations.total_amount_due IS 'Total amount due including all charges and tax';

COMMENT ON COLUMN repairs.repair_orders.ar_invoice_id IS 'Reference to AR customer invoice for this repair';
COMMENT ON COLUMN repairs.repair_orders.payment_status IS 'Current payment status of the repair order';
COMMENT ON COLUMN repairs.repair_orders.tax_rate IS 'VAT rate (default 15% for South Africa)';
COMMENT ON COLUMN repairs.repair_orders.total_cost_after_tax IS 'Final total cost including tax (unless warranty covered)';
COMMENT ON COLUMN repairs.repair_orders.estimated_total_cost IS 'Initial estimate provided to customer';
COMMENT ON COLUMN repairs.repair_orders.total_cost IS 'Backward compatibility field - matches total_cost_after_tax';

COMMIT;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

