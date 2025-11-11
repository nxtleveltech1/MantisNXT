-- 0033_create_stock_locations.sql
-- Create stock_location table for inventory location management
-- Supports internal warehouses, supplier locations, and consignment storage

BEGIN;

-- Create location type enum
CREATE TYPE core.stock_location_type AS ENUM ('internal', 'supplier', 'consignment');

-- Create stock_location table
CREATE TABLE IF NOT EXISTS core.stock_location (
    location_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Organization (multi-tenancy)
    org_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',

    -- Basic information
    name VARCHAR(200) NOT NULL,
    type core.stock_location_type NOT NULL,

    -- Supplier reference (required for type='supplier')
    supplier_id UUID NULL REFERENCES core.supplier(supplier_id) ON DELETE SET NULL,

    -- Location details
    address TEXT NULL,

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Status
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT unique_location_name_per_org UNIQUE (org_id, name),
    CONSTRAINT supplier_required_for_supplier_type
        CHECK (type != 'supplier' OR supplier_id IS NOT NULL)
);

-- Create indexes for common queries
CREATE INDEX idx_stock_location_org_id ON core.stock_location(org_id);
CREATE INDEX idx_stock_location_type ON core.stock_location(type);
CREATE INDEX idx_stock_location_active ON core.stock_location(is_active);
CREATE INDEX idx_stock_location_supplier_id ON core.stock_location(supplier_id) WHERE supplier_id IS NOT NULL;
CREATE INDEX idx_stock_location_org_active ON core.stock_location(org_id, is_active);

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION core.touch_stock_location_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_touch_stock_location_updated_at
    BEFORE UPDATE ON core.stock_location
    FOR EACH ROW
    EXECUTE FUNCTION core.touch_stock_location_updated_at();

-- Insert default locations for existing organizations
INSERT INTO core.stock_location (org_id, name, type, is_active)
SELECT
    id as org_id,
    'Main Warehouse' as name,
    'internal' as type,
    TRUE as is_active
FROM organization
WHERE NOT EXISTS (
    SELECT 1 FROM core.stock_location WHERE org_id = organization.id
)
ON CONFLICT (org_id, name) DO NOTHING;

COMMIT;
