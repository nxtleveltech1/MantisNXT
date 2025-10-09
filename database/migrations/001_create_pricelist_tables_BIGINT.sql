-- ============================================================================
-- Migration 001: Create Pricelist Tables (BIGINT Edition)
-- ============================================================================
-- Description: Creates supplier_pricelists and pricelist_items tables
-- ADR Reference: ADR-1 (Migration File Rewrite - BIGINT Strategy)
-- Schema: Uses core schema with BIGINT identity columns matching production
-- Author: Aster (Full-Stack Architect)
-- Date: 2025-10-09
-- ============================================================================

BEGIN;

-- ============================================================================
-- SECTION 1: CREATE SUPPLIER_PRICELISTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS core.supplier_pricelists (
    pricelist_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    supplier_id BIGINT NOT NULL,

    -- Pricelist identification
    name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Effective date range
    effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    effective_to TIMESTAMPTZ,

    -- Pricing details
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',

    -- Status and versioning
    is_active BOOLEAN NOT NULL DEFAULT true,
    version VARCHAR(50) NOT NULL DEFAULT '1.0',

    -- Approval workflow
    approval_status VARCHAR(50) NOT NULL DEFAULT 'pending'
        CHECK (approval_status IN ('pending', 'approved', 'rejected')),
    approved_by VARCHAR(255),
    approved_at TIMESTAMPTZ,

    -- Audit fields
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,

    -- Foreign key constraint
    CONSTRAINT fk_supplier_pricelists_supplier_id
        FOREIGN KEY (supplier_id)
        REFERENCES core.supplier(supplier_id)
        ON DELETE CASCADE
);

-- ============================================================================
-- SECTION 2: CREATE PRICELIST_ITEMS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS core.pricelist_items (
    pricelist_item_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    pricelist_id BIGINT NOT NULL,

    -- Product identification
    sku VARCHAR(255) NOT NULL,
    supplier_sku VARCHAR(255),

    -- Pricing
    unit_price DECIMAL(18,4) NOT NULL CHECK (unit_price >= 0),

    -- Quantity constraints
    minimum_quantity INTEGER DEFAULT 1 CHECK (minimum_quantity > 0),
    maximum_quantity INTEGER,

    -- Lead time
    lead_time_days INTEGER DEFAULT 7 CHECK (lead_time_days >= 0),

    -- Additional details
    notes TEXT,

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Foreign key constraint
    CONSTRAINT fk_pricelist_items_pricelist_id
        FOREIGN KEY (pricelist_id)
        REFERENCES core.supplier_pricelists(pricelist_id)
        ON DELETE CASCADE,

    -- Unique constraint: prevent duplicate SKUs per pricelist
    CONSTRAINT unique_pricelist_sku
        UNIQUE(pricelist_id, sku)
);

-- ============================================================================
-- SECTION 3: CREATE INDEXES
-- ============================================================================

-- Supplier pricelists indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_pricelist_name
    ON core.supplier_pricelists(supplier_id, name)
    WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_supplier_pricelists_supplier_id
    ON core.supplier_pricelists(supplier_id);

CREATE INDEX IF NOT EXISTS idx_supplier_pricelists_effective_dates
    ON core.supplier_pricelists(effective_from, effective_to);

CREATE INDEX IF NOT EXISTS idx_supplier_pricelists_active
    ON core.supplier_pricelists(is_active)
    WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_supplier_pricelists_approval
    ON core.supplier_pricelists(approval_status);

-- Pricelist items indexes
CREATE INDEX IF NOT EXISTS idx_pricelist_items_pricelist_id
    ON core.pricelist_items(pricelist_id);

CREATE INDEX IF NOT EXISTS idx_pricelist_items_sku
    ON core.pricelist_items(sku);

CREATE INDEX IF NOT EXISTS idx_pricelist_items_supplier_sku
    ON core.pricelist_items(supplier_sku)
    WHERE supplier_sku IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pricelist_items_price
    ON core.pricelist_items(unit_price);

-- ============================================================================
-- SECTION 4: CREATE TRIGGERS
-- ============================================================================

-- Trigger function for updating timestamps (reuse if exists)
CREATE OR REPLACE FUNCTION core.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
DROP TRIGGER IF EXISTS update_supplier_pricelists_updated_at ON core.supplier_pricelists;
CREATE TRIGGER update_supplier_pricelists_updated_at
    BEFORE UPDATE ON core.supplier_pricelists
    FOR EACH ROW
    EXECUTE FUNCTION core.update_updated_at_column();

DROP TRIGGER IF EXISTS update_pricelist_items_updated_at ON core.pricelist_items;
CREATE TRIGGER update_pricelist_items_updated_at
    BEFORE UPDATE ON core.pricelist_items
    FOR EACH ROW
    EXECUTE FUNCTION core.update_updated_at_column();

-- ============================================================================
-- SECTION 5: COMMENTS
-- ============================================================================

COMMENT ON TABLE core.supplier_pricelists IS
    'Supplier pricing lists with versioning and approval workflow';

COMMENT ON TABLE core.pricelist_items IS
    'Individual items within supplier pricelists with pricing and quantity information';

COMMENT ON COLUMN core.supplier_pricelists.pricelist_id IS
    'Primary key (BIGINT identity)';

COMMENT ON COLUMN core.pricelist_items.pricelist_item_id IS
    'Primary key (BIGINT identity)';

-- ============================================================================
-- VALIDATION
-- ============================================================================

DO $$
DECLARE
    v_pricelists_exists BOOLEAN;
    v_items_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'core' AND table_name = 'supplier_pricelists'
    ) INTO v_pricelists_exists;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'core' AND table_name = 'pricelist_items'
    ) INTO v_items_exists;

    RAISE NOTICE 'Supplier pricelists table exists: %', v_pricelists_exists;
    RAISE NOTICE 'Pricelist items table exists: %', v_items_exists;

    IF NOT v_pricelists_exists OR NOT v_items_exists THEN
        RAISE EXCEPTION 'Migration 001 FAILED: Tables not created!';
    END IF;

    RAISE NOTICE 'Migration 001 completed successfully (BIGINT strategy)';
END $$;

COMMIT;

-- ============================================================================
-- END OF MIGRATION 001
-- ============================================================================
