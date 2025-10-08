-- Create supplier pricelists and items tables
-- This migration adds the pricelist functionality to the database

-- Create supplier_pricelists table
CREATE TABLE IF NOT EXISTS supplier_pricelists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    effective_from TIMESTAMP NOT NULL DEFAULT NOW(),
    effective_to TIMESTAMP,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    is_active BOOLEAN NOT NULL DEFAULT true,
    version VARCHAR(50) NOT NULL DEFAULT '1.0',
    approval_status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
    approved_by VARCHAR(255),
    approved_at TIMESTAMP,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP,

    -- Add unique constraint separately below
);

-- Create unique constraint for active pricelists
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_pricelist_name
ON supplier_pricelists(supplier_id, name) WHERE is_active = true;

-- Create pricelist_items table
CREATE TABLE IF NOT EXISTS pricelist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pricelist_id UUID NOT NULL REFERENCES supplier_pricelists(id) ON DELETE CASCADE,
    sku VARCHAR(255) NOT NULL,
    supplier_sku VARCHAR(255),
    unit_price DECIMAL(15,4) NOT NULL CHECK (unit_price >= 0),
    minimum_quantity INTEGER DEFAULT 1 CHECK (minimum_quantity > 0),
    maximum_quantity INTEGER,
    lead_time_days INTEGER DEFAULT 7 CHECK (lead_time_days >= 0),
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

    -- Ensure no duplicate SKUs per pricelist
    UNIQUE(pricelist_id, sku)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_supplier_pricelists_supplier_id ON supplier_pricelists(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_pricelists_effective_dates ON supplier_pricelists(effective_from, effective_to);
CREATE INDEX IF NOT EXISTS idx_supplier_pricelists_active ON supplier_pricelists(is_active);
CREATE INDEX IF NOT EXISTS idx_supplier_pricelists_approval ON supplier_pricelists(approval_status);

CREATE INDEX IF NOT EXISTS idx_pricelist_items_pricelist_id ON pricelist_items(pricelist_id);
CREATE INDEX IF NOT EXISTS idx_pricelist_items_sku ON pricelist_items(sku);
CREATE INDEX IF NOT EXISTS idx_pricelist_items_supplier_sku ON pricelist_items(supplier_sku);
CREATE INDEX IF NOT EXISTS idx_pricelist_items_price ON pricelist_items(unit_price);

-- Create triggers to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_supplier_pricelists_updated_at
    BEFORE UPDATE ON supplier_pricelists
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pricelist_items_updated_at
    BEFORE UPDATE ON pricelist_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for testing
INSERT INTO supplier_pricelists (
    supplier_id, name, description, effective_from, effective_to,
    currency, is_active, version, approval_status, approved_by,
    approved_at, created_by
) VALUES (
    (SELECT id FROM suppliers WHERE name LIKE '%Alpha%' LIMIT 1),
    'Q4 2024 Standard Pricing',
    'Standard pricing for Q4 2024 with volume discounts',
    '2024-10-01',
    '2024-12-31',
    'USD',
    true,
    '1.0',
    'approved',
    'procurement@company.com',
    NOW(),
    'system@company.com'
) ON CONFLICT DO NOTHING;

-- Insert sample pricelist items
INSERT INTO pricelist_items (
    pricelist_id, sku, supplier_sku, unit_price, minimum_quantity,
    maximum_quantity, lead_time_days, notes
) SELECT
    p.id,
    'ALPHA-GTR-001',
    'GTR-ACOU-001',
    899.99,
    1,
    10,
    14,
    'Acoustic guitar with solid spruce top'
FROM supplier_pricelists p
WHERE p.name = 'Q4 2024 Standard Pricing'
ON CONFLICT DO NOTHING;

INSERT INTO pricelist_items (
    pricelist_id, sku, supplier_sku, unit_price, minimum_quantity,
    maximum_quantity, lead_time_days, notes
) SELECT
    p.id,
    'ALPHA-AMP-001',
    'AMP-TUBE-50W',
    1299.99,
    1,
    5,
    21,
    '50W tube amplifier with vintage tone'
FROM supplier_pricelists p
WHERE p.name = 'Q4 2024 Standard Pricing'
ON CONFLICT DO NOTHING;

COMMENT ON TABLE supplier_pricelists IS 'Stores supplier pricing lists with versioning and approval workflow';
COMMENT ON TABLE pricelist_items IS 'Individual items within supplier pricelists with pricing and quantity information';