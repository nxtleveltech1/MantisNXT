-- Create supplier pricelists and items tables
-- Simple version without complex inserts

-- Create supplier_pricelists table
CREATE TABLE IF NOT EXISTS supplier_pricelists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    effective_from TIMESTAMP NOT NULL DEFAULT NOW(),
    effective_to TIMESTAMP,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    is_active BOOLEAN NOT NULL DEFAULT true,
    version VARCHAR(50) NOT NULL DEFAULT '1.0',
    approval_status VARCHAR(50) NOT NULL DEFAULT 'pending',
    approved_by VARCHAR(255),
    approved_at TIMESTAMP,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP
);

-- Create unique constraint for active pricelists
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_pricelist_name
ON supplier_pricelists(supplier_id, name) WHERE is_active = true;

-- Create pricelist_items table
CREATE TABLE IF NOT EXISTS pricelist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pricelist_id UUID NOT NULL,
    sku VARCHAR(255) NOT NULL,
    supplier_sku VARCHAR(255),
    unit_price DECIMAL(15,4) NOT NULL CHECK (unit_price >= 0),
    minimum_quantity INTEGER DEFAULT 1 CHECK (minimum_quantity > 0),
    maximum_quantity INTEGER,
    lead_time_days INTEGER DEFAULT 7 CHECK (lead_time_days >= 0),
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Add foreign key constraints
ALTER TABLE supplier_pricelists
ADD CONSTRAINT fk_supplier_pricelists_supplier_id
FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE;

ALTER TABLE pricelist_items
ADD CONSTRAINT fk_pricelist_items_pricelist_id
FOREIGN KEY (pricelist_id) REFERENCES supplier_pricelists(id) ON DELETE CASCADE;

-- Create unique constraint on pricelist items
ALTER TABLE pricelist_items
ADD CONSTRAINT unique_pricelist_sku
UNIQUE(pricelist_id, sku);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_supplier_pricelists_supplier_id ON supplier_pricelists(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_pricelists_effective_dates ON supplier_pricelists(effective_from, effective_to);
CREATE INDEX IF NOT EXISTS idx_supplier_pricelists_active ON supplier_pricelists(is_active);
CREATE INDEX IF NOT EXISTS idx_supplier_pricelists_approval ON supplier_pricelists(approval_status);

CREATE INDEX IF NOT EXISTS idx_pricelist_items_pricelist_id ON pricelist_items(pricelist_id);
CREATE INDEX IF NOT EXISTS idx_pricelist_items_sku ON pricelist_items(sku);
CREATE INDEX IF NOT EXISTS idx_pricelist_items_supplier_sku ON pricelist_items(supplier_sku);
CREATE INDEX IF NOT EXISTS idx_pricelist_items_price ON pricelist_items(unit_price);

-- Create trigger function for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to update timestamps
DROP TRIGGER IF EXISTS update_supplier_pricelists_updated_at ON supplier_pricelists;
CREATE TRIGGER update_supplier_pricelists_updated_at
    BEFORE UPDATE ON supplier_pricelists
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_pricelist_items_updated_at ON pricelist_items;
CREATE TRIGGER update_pricelist_items_updated_at
    BEFORE UPDATE ON pricelist_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();