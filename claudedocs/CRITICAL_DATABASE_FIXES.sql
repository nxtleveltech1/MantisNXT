-- MantisNXT Platform - Critical Database Schema Fixes
-- Generated: 2025-09-23
-- Purpose: Fix missing columns and constraints identified in UI validation

-- =================================================================
-- CRITICAL FIXES FOR IMMEDIATE DEPLOYMENT
-- =================================================================

-- 1. Fix Users Table - Add missing role column
-- -----------------------------------------------------------------
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user';
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

-- Update existing users with default roles
UPDATE users SET role = 'admin' WHERE email LIKE '%admin%';
UPDATE users SET role = 'manager' WHERE email LIKE '%manager%';
UPDATE users SET role = 'buyer' WHERE email LIKE '%buyer%';

-- 2. Fix Suppliers Table - Add missing supplier_code column
-- -----------------------------------------------------------------
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS supplier_code VARCHAR(50);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS company_name VARCHAR(255);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';

-- Generate supplier codes for existing suppliers
UPDATE suppliers SET supplier_code = 'SUP-' || LPAD(id::text, 3, '0') WHERE supplier_code IS NULL;

-- 3. Fix Inventory Items Table - Add missing product_name column
-- -----------------------------------------------------------------
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS product_name VARCHAR(255);
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS sku VARCHAR(100);
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS unit_price DECIMAL(10,2);
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS category VARCHAR(100);

-- 4. Add Stock Movements Table if missing
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stock_movements (
    id SERIAL PRIMARY KEY,
    inventory_item_id INTEGER REFERENCES inventory_items(id),
    movement_type VARCHAR(50) NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2),
    total_value DECIMAL(12,2),
    reference_number VARCHAR(100),
    movement_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Create missing indexes for performance
-- -----------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS idx_suppliers_supplier_code ON suppliers (supplier_code);
CREATE INDEX IF NOT EXISTS idx_inventory_items_sku ON inventory_items (sku);
CREATE INDEX IF NOT EXISTS idx_inventory_items_product_name ON inventory_items (product_name);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);
CREATE INDEX IF NOT EXISTS idx_stock_movements_inventory_item ON stock_movements (inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON stock_movements (movement_date);

-- 6. Add constraints for data integrity
-- -----------------------------------------------------------------
-- Make supplier_code unique after populating
ALTER TABLE suppliers ADD CONSTRAINT unique_supplier_code UNIQUE (supplier_code);

-- Add not null constraints where appropriate
ALTER TABLE suppliers ALTER COLUMN supplier_code SET NOT NULL;
ALTER TABLE users ALTER COLUMN role SET NOT NULL;

-- 7. Create sample data for testing
-- -----------------------------------------------------------------
-- Insert sample supplier if none exist
INSERT INTO suppliers (supplier_code, company_name, contact_email, status, created_at)
SELECT 'DELL001', 'Dell Technologies', 'procurement@dell.com', 'active', CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM suppliers WHERE supplier_code = 'DELL001');

-- Insert sample inventory items
INSERT INTO inventory_items (product_name, sku, unit_price, description, category, created_at)
SELECT 'Dell Laptop', 'DELL-LAP-001', 15999.00, 'Dell Inspiron 15 3000 Laptop', 'Technology', CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM inventory_items WHERE sku = 'DELL-LAP-001');

INSERT INTO inventory_items (product_name, sku, unit_price, description, category, created_at)
SELECT 'Office Chairs', 'OFF-CHR-001', 2499.00, 'Ergonomic Office Chair', 'Furniture', CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM inventory_items WHERE sku = 'OFF-CHR-001');

-- Insert sample stock movements
INSERT INTO stock_movements (inventory_item_id, movement_type, quantity, unit_price, total_value, reference_number)
SELECT
    i.id,
    'PURCHASE',
    10,
    i.unit_price,
    10 * i.unit_price,
    'PO-2024-001'
FROM inventory_items i
WHERE i.sku = 'DELL-LAP-001'
AND NOT EXISTS (SELECT 1 FROM stock_movements WHERE reference_number = 'PO-2024-001');

-- 8. Create triggers for updated_at timestamps
-- -----------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = CURRENT_TIMESTAMP;
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_inventory_items_updated_at BEFORE UPDATE ON inventory_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_stock_movements_updated_at BEFORE UPDATE ON stock_movements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 9. Verify schema fixes
-- -----------------------------------------------------------------
-- Check if all critical columns exist
DO $$
DECLARE
    missing_columns TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Check users.role
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_name = 'users' AND column_name = 'role') THEN
        missing_columns := array_append(missing_columns, 'users.role');
    END IF;

    -- Check suppliers.supplier_code
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_name = 'suppliers' AND column_name = 'supplier_code') THEN
        missing_columns := array_append(missing_columns, 'suppliers.supplier_code');
    END IF;

    -- Check inventory_items.product_name
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_name = 'inventory_items' AND column_name = 'product_name') THEN
        missing_columns := array_append(missing_columns, 'inventory_items.product_name');
    END IF;

    IF array_length(missing_columns, 1) > 0 THEN
        RAISE NOTICE 'Still missing columns: %', array_to_string(missing_columns, ', ');
    ELSE
        RAISE NOTICE 'All critical columns have been successfully added!';
    END IF;
END $$;

-- =================================================================
-- VERIFICATION QUERIES
-- =================================================================

-- Verify suppliers table structure
SELECT 'Suppliers Table Structure:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'suppliers'
ORDER BY ordinal_position;

-- Verify inventory_items table structure
SELECT 'Inventory Items Table Structure:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'inventory_items'
ORDER BY ordinal_position;

-- Verify users table structure
SELECT 'Users Table Structure:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- Check sample data was inserted
SELECT 'Sample Data Verification:' as info;
SELECT COUNT(*) as supplier_count FROM suppliers;
SELECT COUNT(*) as inventory_count FROM inventory_items;
SELECT COUNT(*) as stock_movements_count FROM stock_movements;

-- =================================================================
-- SUCCESS MESSAGE
-- =================================================================
SELECT '✅ CRITICAL DATABASE FIXES COMPLETED SUCCESSFULLY!' as status;
SELECT 'Run validation suite again to verify all issues are resolved.' as next_step;