-- ============================================================================
-- Migration: 0232_av_rentals_repairs_schemas.sql
-- Date: 2025-01-27
-- Description: Create AV Equipment Rentals and Repairs Workshop schemas
-- ============================================================================

BEGIN;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create schemas
CREATE SCHEMA IF NOT EXISTS rentals;
CREATE SCHEMA IF NOT EXISTS repairs;

-- ============================================================================
-- RENTALS SCHEMA
-- ============================================================================

-- Equipment Master Catalog
CREATE TABLE IF NOT EXISTS rentals.equipment (
    equipment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(500) NOT NULL,
    equipment_type VARCHAR(50) NOT NULL, -- camera, microphone, speaker, lighting, projector, etc.
    category_id UUID REFERENCES core.category(category_id),
    brand VARCHAR(200),
    model VARCHAR(200),
    serial_number VARCHAR(200) UNIQUE,
    barcode VARCHAR(100),
    rfid_tag VARCHAR(100),
    purchase_date DATE,
    purchase_cost DECIMAL(15,2),
    current_value DECIMAL(15,2),
    replacement_value DECIMAL(15,2),
    condition_status VARCHAR(20) NOT NULL DEFAULT 'excellent' CHECK (condition_status IN ('excellent', 'good', 'fair', 'poor', 'damaged')),
    condition_notes TEXT,
    availability_status VARCHAR(20) NOT NULL DEFAULT 'available' CHECK (availability_status IN ('available', 'rented', 'maintenance', 'retired')),
    current_location_id UUID REFERENCES core.stock_location(location_id),
    rental_rate_daily DECIMAL(15,2),
    rental_rate_weekly DECIMAL(15,2),
    rental_rate_monthly DECIMAL(15,2),
    security_deposit DECIMAL(15,2),
    insurance_required BOOLEAN DEFAULT false,
    insurance_coverage_amount DECIMAL(15,2),
    technical_specs JSONB DEFAULT '{}',
    compatibility_info JSONB DEFAULT '{}',
    calibration_date DATE,
    calibration_certificate_url TEXT,
    last_maintenance_date DATE,
    next_maintenance_due DATE,
    maintenance_schedule_days INTEGER,
    warranty_expiry DATE,
    requires_certification BOOLEAN DEFAULT false,
    certification_type VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Equipment Packages (Bundled Kits)
CREATE TABLE IF NOT EXISTS rentals.equipment_packages (
    package_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    package_type VARCHAR(50), -- basic_av_kit, professional_kit, event_package, etc.
    rental_rate_daily DECIMAL(15,2),
    rental_rate_weekly DECIMAL(15,2),
    rental_rate_monthly DECIMAL(15,2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Package Items Mapping
CREATE TABLE IF NOT EXISTS rentals.package_items (
    package_item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id UUID NOT NULL REFERENCES rentals.equipment_packages(package_id) ON DELETE CASCADE,
    equipment_id UUID NOT NULL REFERENCES rentals.equipment(equipment_id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 1 CHECK (quantity > 0),
    is_required BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    UNIQUE(package_id, equipment_id)
);

-- Reservations (Rental Bookings)
CREATE TABLE IF NOT EXISTS rentals.reservations (
    reservation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reservation_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID NOT NULL REFERENCES customer(id) ON DELETE RESTRICT,
    event_name VARCHAR(500),
    event_type VARCHAR(100), -- corporate, wedding, concert, conference, etc.
    event_date_start DATE,
    event_date_end DATE,
    rental_start_date DATE NOT NULL,
    rental_end_date DATE NOT NULL,
    pickup_date DATE,
    return_date DATE,
    pickup_location_id UUID REFERENCES core.stock_location(location_id),
    delivery_address TEXT,
    delivery_required BOOLEAN DEFAULT false,
    delivery_cost DECIMAL(15,2) DEFAULT 0,
    setup_required BOOLEAN DEFAULT false,
    setup_cost DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'picked_up', 'active', 'returned', 'cancelled')),
    total_equipment_value DECIMAL(15,2) DEFAULT 0,
    security_deposit_amount DECIMAL(15,2) DEFAULT 0,
    security_deposit_paid DECIMAL(15,2) DEFAULT 0,
    security_deposit_returned DECIMAL(15,2) DEFAULT 0,
    insurance_coverage_amount DECIMAL(15,2) DEFAULT 0,
    insurance_provider VARCHAR(200),
    insurance_policy_number VARCHAR(100),
    notes TEXT,
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT rental_dates_valid CHECK (rental_end_date >= rental_start_date),
    CONSTRAINT event_dates_valid CHECK (event_date_end IS NULL OR event_date_start IS NULL OR event_date_end >= event_date_start)
);

-- Reservation Items (Equipment in Reservations)
CREATE TABLE IF NOT EXISTS rentals.reservation_items (
    reservation_item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reservation_id UUID NOT NULL REFERENCES rentals.reservations(reservation_id) ON DELETE CASCADE,
    equipment_id UUID NOT NULL REFERENCES rentals.equipment(equipment_id) ON DELETE RESTRICT,
    package_id UUID REFERENCES rentals.equipment_packages(package_id),
    quantity INTEGER DEFAULT 1 CHECK (quantity > 0),
    rental_rate DECIMAL(15,2) NOT NULL,
    rental_period_days INTEGER NOT NULL,
    line_total DECIMAL(15,2) NOT NULL,
    condition_at_pickup VARCHAR(20) CHECK (condition_at_pickup IN ('excellent', 'good', 'fair', 'poor', 'damaged')),
    condition_at_return VARCHAR(20) CHECK (condition_at_return IN ('excellent', 'good', 'fair', 'poor', 'damaged')),
    damage_assessed BOOLEAN DEFAULT false,
    damage_cost DECIMAL(15,2) DEFAULT 0,
    damage_notes TEXT
);

-- Rental Agreements
CREATE TABLE IF NOT EXISTS rentals.rental_agreements (
    agreement_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reservation_id UUID NOT NULL REFERENCES rentals.reservations(reservation_id) ON DELETE CASCADE,
    agreement_number VARCHAR(50) UNIQUE NOT NULL,
    agreement_type VARCHAR(50) DEFAULT 'standard', -- standard, extended, custom
    terms_and_conditions TEXT,
    liability_waiver TEXT,
    customer_signature TEXT, -- base64 encoded or URL
    customer_signed_at TIMESTAMPTZ,
    staff_signature TEXT,
    staff_signed_at TIMESTAMPTZ,
    signed_by UUID,
    agreement_pdf_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Equipment Checkout (Pickup/Delivery Tracking)
CREATE TABLE IF NOT EXISTS rentals.equipment_checkout (
    checkout_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reservation_id UUID NOT NULL REFERENCES rentals.reservations(reservation_id) ON DELETE CASCADE,
    checkout_type VARCHAR(20) NOT NULL CHECK (checkout_type IN ('pickup', 'delivery')),
    scheduled_datetime TIMESTAMPTZ,
    actual_datetime TIMESTAMPTZ,
    checked_out_by UUID,
    verified_by UUID,
    equipment_condition_notes TEXT,
    photos_before TEXT[], -- URLs to photos
    delivery_driver VARCHAR(200),
    delivery_vehicle VARCHAR(100),
    delivery_tracking_number VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Equipment Checkin (Return Tracking)
CREATE TABLE IF NOT EXISTS rentals.equipment_checkin (
    checkin_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reservation_id UUID NOT NULL REFERENCES rentals.reservations(reservation_id) ON DELETE CASCADE,
    checkin_type VARCHAR(20) NOT NULL CHECK (checkin_type IN ('return', 'pickup')),
    scheduled_datetime TIMESTAMPTZ,
    actual_datetime TIMESTAMPTZ,
    checked_in_by UUID,
    verified_by UUID,
    equipment_condition_notes TEXT,
    photos_after TEXT[], -- URLs to photos
    damage_reported BOOLEAN DEFAULT false,
    missing_items TEXT[],
    cleaning_required BOOLEAN DEFAULT false,
    maintenance_required BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Damage Reports
CREATE TABLE IF NOT EXISTS rentals.damage_reports (
    damage_report_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reservation_id UUID NOT NULL REFERENCES rentals.reservations(reservation_id) ON DELETE CASCADE,
    equipment_id UUID NOT NULL REFERENCES rentals.equipment(equipment_id) ON DELETE RESTRICT,
    reported_by UUID NOT NULL,
    reported_at TIMESTAMPTZ DEFAULT NOW(),
    damage_type VARCHAR(50) CHECK (damage_type IN ('physical_damage', 'missing_parts', 'malfunction', 'cosmetic')),
    damage_description TEXT NOT NULL,
    severity VARCHAR(20) CHECK (severity IN ('minor', 'moderate', 'major', 'total_loss')),
    repair_cost_estimate DECIMAL(15,2),
    replacement_cost DECIMAL(15,2),
    photos TEXT[],
    assessed_by UUID,
    assessed_at TIMESTAMPTZ,
    final_cost DECIMAL(15,2),
    customer_liable BOOLEAN DEFAULT true,
    insurance_claim_filed BOOLEAN DEFAULT false,
    insurance_claim_number VARCHAR(100),
    status VARCHAR(20) DEFAULT 'reported' CHECK (status IN ('reported', 'assessed', 'invoiced', 'paid', 'closed')),
    notes TEXT
);

-- ============================================================================
-- REPAIRS SCHEMA
-- ============================================================================

-- Technicians (Workshop Staff)
CREATE TABLE IF NOT EXISTS repairs.technicians (
    technician_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    employee_number VARCHAR(50) UNIQUE,
    specializations TEXT[], -- camera_repair, audio_repair, lighting_repair, etc.
    certifications JSONB DEFAULT '[]',
    hourly_rate DECIMAL(10,2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Repair Orders (Work Orders)
CREATE TABLE IF NOT EXISTS repairs.repair_orders (
    repair_order_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repair_order_number VARCHAR(50) UNIQUE NOT NULL,
    equipment_id UUID REFERENCES rentals.equipment(equipment_id) ON DELETE RESTRICT,
    customer_id UUID REFERENCES customer(id) ON DELETE RESTRICT, -- if customer-owned equipment
    order_type VARCHAR(20) NOT NULL CHECK (order_type IN ('repair', 'maintenance', 'calibration', 'inspection')),
    priority VARCHAR(20) NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    status VARCHAR(20) NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'diagnosed', 'in_progress', 'waiting_parts', 'testing', 'completed', 'cancelled')),
    reported_issue TEXT NOT NULL,
    diagnosis TEXT,
    diagnosed_by UUID REFERENCES repairs.technicians(technician_id),
    diagnosed_at TIMESTAMPTZ,
    assigned_technician_id UUID REFERENCES repairs.technicians(technician_id),
    estimated_completion_date DATE,
    actual_start_date DATE,
    actual_completion_date DATE,
    labor_hours DECIMAL(10,2) DEFAULT 0,
    labor_cost DECIMAL(15,2) DEFAULT 0,
    parts_cost DECIMAL(15,2) DEFAULT 0,
    total_cost DECIMAL(15,2) DEFAULT 0,
    warranty_covered BOOLEAN DEFAULT false,
    warranty_type VARCHAR(50), -- manufacturer, extended, none
    warranty_expiry DATE,
    customer_quote_approved BOOLEAN,
    customer_quote_approved_at TIMESTAMPTZ,
    invoice_id UUID, -- Will reference financial.invoices when that schema exists
    notes TEXT,
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Repair Order Items (Parts Used)
CREATE TABLE IF NOT EXISTS repairs.repair_order_items (
    repair_item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repair_order_id UUID NOT NULL REFERENCES repairs.repair_orders(repair_order_id) ON DELETE CASCADE,
    part_id UUID REFERENCES core.product(product_id) ON DELETE RESTRICT,
    part_name VARCHAR(500),
    quantity DECIMAL(10,3) NOT NULL CHECK (quantity > 0),
    unit_cost DECIMAL(15,4),
    line_total DECIMAL(15,2),
    notes TEXT
);

-- Repair Timeline (Status History)
CREATE TABLE IF NOT EXISTS repairs.repair_timeline (
    timeline_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repair_order_id UUID NOT NULL REFERENCES repairs.repair_orders(repair_order_id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL,
    notes TEXT,
    updated_by UUID,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Repair Tests (Quality Control Testing)
CREATE TABLE IF NOT EXISTS repairs.repair_tests (
    test_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repair_order_id UUID NOT NULL REFERENCES repairs.repair_orders(repair_order_id) ON DELETE CASCADE,
    test_type VARCHAR(50), -- functionality, calibration, stress_test, etc.
    test_name VARCHAR(200) NOT NULL,
    test_result VARCHAR(20) CHECK (test_result IN ('pass', 'fail', 'partial')),
    test_data JSONB DEFAULT '{}',
    tested_by UUID REFERENCES repairs.technicians(technician_id),
    tested_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT
);

-- Preventive Maintenance Schedule
CREATE TABLE IF NOT EXISTS repairs.preventive_maintenance (
    pm_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipment_id UUID NOT NULL REFERENCES rentals.equipment(equipment_id) ON DELETE CASCADE,
    pm_type VARCHAR(50) CHECK (pm_type IN ('scheduled', 'inspection', 'calibration', 'cleaning')),
    frequency_days INTEGER NOT NULL CHECK (frequency_days > 0),
    last_performed_date DATE,
    next_due_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PM Logs (PM History)
CREATE TABLE IF NOT EXISTS repairs.pm_logs (
    pm_log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pm_id UUID NOT NULL REFERENCES repairs.preventive_maintenance(pm_id) ON DELETE CASCADE,
    performed_date DATE NOT NULL,
    performed_by UUID REFERENCES repairs.technicians(technician_id),
    findings TEXT,
    actions_taken TEXT,
    parts_replaced TEXT[],
    cost DECIMAL(15,2) DEFAULT 0,
    next_due_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Parts Inventory (Workshop Parts Stock)
CREATE TABLE IF NOT EXISTS repairs.parts_inventory (
    part_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES core.product(product_id) ON DELETE RESTRICT,
    location_id UUID REFERENCES core.stock_location(location_id),
    quantity_on_hand INTEGER DEFAULT 0 CHECK (quantity_on_hand >= 0),
    quantity_reserved INTEGER DEFAULT 0 CHECK (quantity_reserved >= 0),
    quantity_available INTEGER GENERATED ALWAYS AS (quantity_on_hand - quantity_reserved) STORED,
    reorder_point INTEGER DEFAULT 0 CHECK (reorder_point >= 0),
    last_received_date DATE,
    last_used_date DATE,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id, location_id)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Rentals indexes
CREATE INDEX IF NOT EXISTS idx_rentals_equipment_sku ON rentals.equipment(sku);
CREATE INDEX IF NOT EXISTS idx_rentals_equipment_serial ON rentals.equipment(serial_number) WHERE serial_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rentals_equipment_type ON rentals.equipment(equipment_type);
CREATE INDEX IF NOT EXISTS idx_rentals_equipment_status ON rentals.equipment(availability_status);
CREATE INDEX IF NOT EXISTS idx_rentals_equipment_location ON rentals.equipment(current_location_id) WHERE current_location_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rentals_equipment_category ON rentals.equipment(category_id) WHERE category_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rentals_equipment_active ON rentals.equipment(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_rentals_packages_active ON rentals.equipment_packages(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_rentals_package_items_package ON rentals.package_items(package_id);
CREATE INDEX IF NOT EXISTS idx_rentals_package_items_equipment ON rentals.package_items(equipment_id);

CREATE INDEX IF NOT EXISTS idx_rentals_reservations_number ON rentals.reservations(reservation_number);
CREATE INDEX IF NOT EXISTS idx_rentals_reservations_customer ON rentals.reservations(customer_id);
CREATE INDEX IF NOT EXISTS idx_rentals_reservations_status ON rentals.reservations(status);
CREATE INDEX IF NOT EXISTS idx_rentals_reservations_dates ON rentals.reservations(rental_start_date, rental_end_date);
CREATE INDEX IF NOT EXISTS idx_rentals_reservations_event_dates ON rentals.reservations(event_date_start, event_date_end) WHERE event_date_start IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_rentals_reservation_items_reservation ON rentals.reservation_items(reservation_id);
CREATE INDEX IF NOT EXISTS idx_rentals_reservation_items_equipment ON rentals.reservation_items(equipment_id);

CREATE INDEX IF NOT EXISTS idx_rentals_agreements_reservation ON rentals.rental_agreements(reservation_id);
CREATE INDEX IF NOT EXISTS idx_rentals_agreements_number ON rentals.rental_agreements(agreement_number);

CREATE INDEX IF NOT EXISTS idx_rentals_checkout_reservation ON rentals.equipment_checkout(reservation_id);
CREATE INDEX IF NOT EXISTS idx_rentals_checkout_datetime ON rentals.equipment_checkout(scheduled_datetime) WHERE scheduled_datetime IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_rentals_checkin_reservation ON rentals.equipment_checkin(reservation_id);
CREATE INDEX IF NOT EXISTS idx_rentals_checkin_datetime ON rentals.equipment_checkin(scheduled_datetime) WHERE scheduled_datetime IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_rentals_damage_reservation ON rentals.damage_reports(reservation_id);
CREATE INDEX IF NOT EXISTS idx_rentals_damage_equipment ON rentals.damage_reports(equipment_id);
CREATE INDEX IF NOT EXISTS idx_rentals_damage_status ON rentals.damage_reports(status);

-- Repairs indexes
CREATE INDEX IF NOT EXISTS idx_repairs_technicians_user ON repairs.technicians(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_repairs_technicians_active ON repairs.technicians(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_repairs_technicians_employee ON repairs.technicians(employee_number) WHERE employee_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_repairs_orders_number ON repairs.repair_orders(repair_order_number);
CREATE INDEX IF NOT EXISTS idx_repairs_orders_equipment ON repairs.repair_orders(equipment_id) WHERE equipment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_repairs_orders_customer ON repairs.repair_orders(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_repairs_orders_status ON repairs.repair_orders(status);
CREATE INDEX IF NOT EXISTS idx_repairs_orders_priority ON repairs.repair_orders(priority);
CREATE INDEX IF NOT EXISTS idx_repairs_orders_technician ON repairs.repair_orders(assigned_technician_id) WHERE assigned_technician_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_repairs_orders_type ON repairs.repair_orders(order_type);
CREATE INDEX IF NOT EXISTS idx_repairs_orders_completion_date ON repairs.repair_orders(estimated_completion_date) WHERE estimated_completion_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_repairs_order_items_order ON repairs.repair_order_items(repair_order_id);
CREATE INDEX IF NOT EXISTS idx_repairs_order_items_part ON repairs.repair_order_items(part_id) WHERE part_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_repairs_timeline_order ON repairs.repair_timeline(repair_order_id);
CREATE INDEX IF NOT EXISTS idx_repairs_timeline_status ON repairs.repair_timeline(status);
CREATE INDEX IF NOT EXISTS idx_repairs_timeline_updated ON repairs.repair_timeline(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_repairs_tests_order ON repairs.repair_tests(repair_order_id);
CREATE INDEX IF NOT EXISTS idx_repairs_tests_result ON repairs.repair_tests(test_result) WHERE test_result IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_repairs_tests_type ON repairs.repair_tests(test_type) WHERE test_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_repairs_pm_equipment ON repairs.preventive_maintenance(equipment_id);
CREATE INDEX IF NOT EXISTS idx_repairs_pm_due_date ON repairs.preventive_maintenance(next_due_date) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_repairs_pm_active ON repairs.preventive_maintenance(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_repairs_pm_logs_pm ON repairs.pm_logs(pm_id);
CREATE INDEX IF NOT EXISTS idx_repairs_pm_logs_date ON repairs.pm_logs(performed_date DESC);

CREATE INDEX IF NOT EXISTS idx_repairs_parts_product ON repairs.parts_inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_repairs_parts_location ON repairs.parts_inventory(location_id) WHERE location_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_repairs_parts_available ON repairs.parts_inventory(quantity_available) WHERE quantity_available > 0;

-- ============================================================================
-- TRIGGERS FOR AUTOMATED UPDATES
-- ============================================================================

-- Update updated_at timestamp trigger
CREATE OR REPLACE FUNCTION rentals.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_rentals_equipment_updated_at
    BEFORE UPDATE ON rentals.equipment
    FOR EACH ROW EXECUTE FUNCTION rentals.update_updated_at();

CREATE TRIGGER trigger_rentals_reservations_updated_at
    BEFORE UPDATE ON rentals.reservations
    FOR EACH ROW EXECUTE FUNCTION rentals.update_updated_at();

CREATE OR REPLACE FUNCTION repairs.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_repairs_orders_updated_at
    BEFORE UPDATE ON repairs.repair_orders
    FOR EACH ROW EXECUTE FUNCTION repairs.update_updated_at();

CREATE TRIGGER trigger_repairs_parts_updated_at
    BEFORE UPDATE ON repairs.parts_inventory
    FOR EACH ROW EXECUTE FUNCTION repairs.update_updated_at();

-- Auto-create repair timeline entry on status change
CREATE OR REPLACE FUNCTION repairs.log_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO repairs.repair_timeline (repair_order_id, status, notes, updated_by)
        VALUES (NEW.repair_order_id, NEW.status, 
                COALESCE(NEW.notes, 'Status changed from ' || OLD.status || ' to ' || NEW.status),
                NEW.updated_by);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_repairs_orders_status_log
    AFTER UPDATE OF status ON repairs.repair_orders
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION repairs.log_status_change();

-- Auto-update equipment availability status when reservation status changes
CREATE OR REPLACE FUNCTION rentals.update_equipment_availability()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status IN ('picked_up', 'active') THEN
        UPDATE rentals.equipment
        SET availability_status = 'rented'
        WHERE equipment_id IN (
            SELECT equipment_id FROM rentals.reservation_items WHERE reservation_id = NEW.reservation_id
        );
    ELSIF NEW.status = 'returned' THEN
        UPDATE rentals.equipment
        SET availability_status = 'available'
        WHERE equipment_id IN (
            SELECT equipment_id FROM rentals.reservation_items WHERE reservation_id = NEW.reservation_id
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_rentals_reservations_equipment_status
    AFTER UPDATE OF status ON rentals.reservations
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION rentals.update_equipment_availability();

COMMIT;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

