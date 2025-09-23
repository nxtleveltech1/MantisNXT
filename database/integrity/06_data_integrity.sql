-- ===============================================
-- DATA INTEGRITY AND CONSISTENCY RULES
-- Comprehensive constraints and business rules
-- ===============================================

-- =================
-- REFERENTIAL INTEGRITY CONSTRAINTS
-- =================

-- Ensure products have valid categories (cannot be orphaned)
ALTER TABLE products
ADD CONSTRAINT fk_products_category_required
FOREIGN KEY (category_id) REFERENCES categories(id)
ON DELETE RESTRICT;

-- Inventory balances must reference valid products and locations
ALTER TABLE inventory_balances
ADD CONSTRAINT fk_inventory_product_required
FOREIGN KEY (product_id) REFERENCES products(id)
ON DELETE CASCADE;

ALTER TABLE inventory_balances
ADD CONSTRAINT fk_inventory_location_required
FOREIGN KEY (location_id) REFERENCES locations(id)
ON DELETE RESTRICT;

-- Inventory movements must have valid references
ALTER TABLE inventory_movements
ADD CONSTRAINT fk_movements_product_required
FOREIGN KEY (product_id) REFERENCES products(id)
ON DELETE RESTRICT;

ALTER TABLE inventory_movements
ADD CONSTRAINT fk_movements_location_required
FOREIGN KEY (location_id) REFERENCES locations(id)
ON DELETE RESTRICT;

-- =================
-- BUSINESS LOGIC CONSTRAINTS
-- =================

-- Product constraints
ALTER TABLE products
ADD CONSTRAINT chk_products_sku_format
CHECK (sku ~ '^[A-Z0-9-_]+$' AND LENGTH(sku) BETWEEN 3 AND 100);

ALTER TABLE products
ADD CONSTRAINT chk_products_name_length
CHECK (LENGTH(TRIM(name)) >= 2);

ALTER TABLE products
ADD CONSTRAINT chk_products_prices_positive
CHECK (base_cost IS NULL OR base_cost >= 0);

ALTER TABLE products
ADD CONSTRAINT chk_products_sale_price_positive
CHECK (sale_price IS NULL OR sale_price >= 0);

ALTER TABLE products
ADD CONSTRAINT chk_products_weight_positive
CHECK (weight_kg IS NULL OR weight_kg >= 0);

ALTER TABLE products
ADD CONSTRAINT chk_products_reorder_level_positive
CHECK (reorder_level >= 0);

ALTER TABLE products
ADD CONSTRAINT chk_products_max_stock_reasonable
CHECK (max_stock_level IS NULL OR max_stock_level >= reorder_level);

-- Inventory balance constraints
ALTER TABLE inventory_balances
ADD CONSTRAINT chk_inventory_quantities_non_negative
CHECK (quantity_on_hand >= 0 AND quantity_allocated >= 0);

ALTER TABLE inventory_balances
ADD CONSTRAINT chk_inventory_allocated_not_exceed_onhand
CHECK (quantity_allocated <= quantity_on_hand);

-- Movement constraints
ALTER TABLE inventory_movements
ADD CONSTRAINT chk_movements_quantity_not_zero
CHECK (quantity != 0);

ALTER TABLE inventory_movements
ADD CONSTRAINT chk_movements_type_valid
CHECK (movement_type IN ('IN', 'OUT', 'ADJUSTMENT', 'TRANSFER', 'SALE', 'PURCHASE', 'RETURN'));

ALTER TABLE inventory_movements
ADD CONSTRAINT chk_movements_unit_cost_positive
CHECK (unit_cost IS NULL OR unit_cost >= 0);

-- Category hierarchy constraints
ALTER TABLE categories
ADD CONSTRAINT chk_categories_no_self_reference
CHECK (id != parent_id);

ALTER TABLE categories
ADD CONSTRAINT chk_categories_name_not_empty
CHECK (LENGTH(TRIM(name)) >= 1);

-- =================
-- ADVANCED BUSINESS RULES
-- =================

-- Function to prevent circular category references
CREATE OR REPLACE FUNCTION check_category_circular_reference()
RETURNS TRIGGER AS $$
DECLARE
    current_parent UUID;
    max_depth INTEGER := 10;
    depth_counter INTEGER := 0;
BEGIN
    -- Only check on updates to parent_id
    IF TG_OP = 'UPDATE' AND OLD.parent_id IS NOT DISTINCT FROM NEW.parent_id THEN
        RETURN NEW;
    END IF;

    current_parent := NEW.parent_id;

    -- Traverse up the hierarchy to check for circular references
    WHILE current_parent IS NOT NULL AND depth_counter < max_depth LOOP
        -- Check if we've reached the current category (circular reference)
        IF current_parent = NEW.id THEN
            RAISE EXCEPTION 'Circular reference detected in category hierarchy';
        END IF;

        -- Move up one level
        SELECT parent_id INTO current_parent
        FROM categories
        WHERE id = current_parent;

        depth_counter := depth_counter + 1;
    END LOOP;

    -- Check for maximum depth
    IF depth_counter >= max_depth THEN
        RAISE EXCEPTION 'Category hierarchy too deep (max % levels)', max_depth;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_category_circular_reference
    BEFORE INSERT OR UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION check_category_circular_reference();

-- Function to validate inventory movements don't cause negative balances
CREATE OR REPLACE FUNCTION validate_inventory_movement()
RETURNS TRIGGER AS $$
DECLARE
    current_balance INTEGER := 0;
    product_name TEXT;
    location_name TEXT;
BEGIN
    -- Get current balance
    SELECT COALESCE(quantity_on_hand, 0) INTO current_balance
    FROM inventory_balances
    WHERE product_id = NEW.product_id AND location_id = NEW.location_id;

    -- Check if OUT movement would cause negative balance
    IF NEW.movement_type IN ('OUT', 'SALE') AND NEW.quantity > 0 THEN
        IF current_balance < NEW.quantity THEN
            -- Get readable names for error message
            SELECT name INTO product_name FROM products WHERE id = NEW.product_id;
            SELECT name INTO location_name FROM locations WHERE id = NEW.location_id;

            RAISE EXCEPTION 'Insufficient inventory: Product "%" at location "%" has % units, but % units requested',
                product_name, location_name, current_balance, NEW.quantity;
        END IF;
    END IF;

    -- Convert OUT movements to negative quantities for consistency
    IF NEW.movement_type IN ('OUT', 'SALE') AND NEW.quantity > 0 THEN
        NEW.quantity := -NEW.quantity;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_inventory_movement
    BEFORE INSERT ON inventory_movements
    FOR EACH ROW EXECUTE FUNCTION validate_inventory_movement();

-- =================
-- DATA CONSISTENCY FUNCTIONS
-- =================

-- Function to reconcile inventory balances
CREATE OR REPLACE FUNCTION reconcile_inventory_balances()
RETURNS TABLE(
    product_sku TEXT,
    location_code TEXT,
    calculated_balance INTEGER,
    recorded_balance INTEGER,
    variance INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH calculated_balances AS (
        SELECT
            im.product_id,
            im.location_id,
            SUM(im.quantity) as calculated_quantity
        FROM inventory_movements im
        GROUP BY im.product_id, im.location_id
    ),
    variance_report AS (
        SELECT
            p.sku,
            l.code,
            COALESCE(cb.calculated_quantity, 0) as calculated_balance,
            COALESCE(ib.quantity_on_hand, 0) as recorded_balance,
            COALESCE(cb.calculated_quantity, 0) - COALESCE(ib.quantity_on_hand, 0) as variance
        FROM calculated_balances cb
        FULL OUTER JOIN inventory_balances ib ON cb.product_id = ib.product_id AND cb.location_id = ib.location_id
        JOIN products p ON COALESCE(cb.product_id, ib.product_id) = p.id
        JOIN locations l ON COALESCE(cb.location_id, ib.location_id) = l.id
        WHERE COALESCE(cb.calculated_quantity, 0) != COALESCE(ib.quantity_on_hand, 0)
    )
    SELECT * FROM variance_report ORDER BY ABS(variance) DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to fix inventory balance inconsistencies
CREATE OR REPLACE FUNCTION fix_inventory_inconsistencies()
RETURNS INTEGER AS $$
DECLARE
    fixed_count INTEGER := 0;
    inconsistency_record RECORD;
BEGIN
    FOR inconsistency_record IN
        SELECT * FROM reconcile_inventory_balances()
    LOOP
        -- Update the inventory balance to match calculated balance
        UPDATE inventory_balances
        SET quantity_on_hand = (
            SELECT COALESCE(SUM(quantity), 0)
            FROM inventory_movements im
            JOIN products p ON im.product_id = p.id
            JOIN locations l ON im.location_id = l.id
            WHERE p.sku = inconsistency_record.product_sku
            AND l.code = inconsistency_record.location_code
        ),
        updated_at = NOW()
        WHERE product_id = (SELECT id FROM products WHERE sku = inconsistency_record.product_sku)
        AND location_id = (SELECT id FROM locations WHERE code = inconsistency_record.location_code);

        fixed_count := fixed_count + 1;
    END LOOP;

    RETURN fixed_count;
END;
$$ LANGUAGE plpgsql;

-- =================
-- AUDIT AND COMPLIANCE
-- =================

-- Function to validate data integrity across the system
CREATE OR REPLACE FUNCTION validate_system_integrity()
RETURNS TABLE(
    check_name TEXT,
    status TEXT,
    issues_found INTEGER,
    details TEXT
) AS $$
BEGIN
    -- Check for products without categories
    RETURN QUERY
    SELECT
        'Products without categories'::TEXT,
        CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END::TEXT,
        COUNT(*)::INTEGER,
        CASE WHEN COUNT(*) > 0 THEN 'Products found: ' || string_agg(sku, ', ') ELSE 'OK' END::TEXT
    FROM products
    WHERE category_id IS NULL;

    -- Check for negative inventory balances
    RETURN QUERY
    SELECT
        'Negative inventory balances'::TEXT,
        CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END::TEXT,
        COUNT(*)::INTEGER,
        CASE WHEN COUNT(*) > 0 THEN COUNT(*)::TEXT || ' locations with negative balances' ELSE 'OK' END::TEXT
    FROM inventory_balances
    WHERE quantity_on_hand < 0;

    -- Check for allocated quantity exceeding on-hand
    RETURN QUERY
    SELECT
        'Over-allocated inventory'::TEXT,
        CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END::TEXT,
        COUNT(*)::INTEGER,
        CASE WHEN COUNT(*) > 0 THEN COUNT(*)::TEXT || ' locations over-allocated' ELSE 'OK' END::TEXT
    FROM inventory_balances
    WHERE quantity_allocated > quantity_on_hand;

    -- Check for orphaned inventory balances
    RETURN QUERY
    SELECT
        'Orphaned inventory balances'::TEXT,
        CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END::TEXT,
        COUNT(*)::INTEGER,
        CASE WHEN COUNT(*) > 0 THEN COUNT(*)::TEXT || ' orphaned records' ELSE 'OK' END::TEXT
    FROM inventory_balances ib
    WHERE NOT EXISTS (SELECT 1 FROM products p WHERE p.id = ib.product_id)
    OR NOT EXISTS (SELECT 1 FROM locations l WHERE l.id = ib.location_id);

    -- Check for invalid movement references
    RETURN QUERY
    SELECT
        'Invalid movement references'::TEXT,
        CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END::TEXT,
        COUNT(*)::INTEGER,
        CASE WHEN COUNT(*) > 0 THEN COUNT(*)::TEXT || ' movements with invalid references' ELSE 'OK' END::TEXT
    FROM inventory_movements im
    WHERE NOT EXISTS (SELECT 1 FROM products p WHERE p.id = im.product_id)
    OR NOT EXISTS (SELECT 1 FROM locations l WHERE l.id = im.location_id);

    -- Check for circular category references
    RETURN QUERY
    WITH RECURSIVE category_hierarchy AS (
        SELECT id, parent_id, ARRAY[id] as path, 0 as level
        FROM categories
        WHERE parent_id IS NULL

        UNION ALL

        SELECT c.id, c.parent_id, ch.path || c.id, ch.level + 1
        FROM categories c
        JOIN category_hierarchy ch ON c.parent_id = ch.id
        WHERE NOT c.id = ANY(ch.path) AND ch.level < 10
    )
    SELECT
        'Circular category references'::TEXT,
        CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END::TEXT,
        COUNT(*)::INTEGER,
        CASE WHEN COUNT(*) > 0 THEN COUNT(*)::TEXT || ' categories in circular references' ELSE 'OK' END::TEXT
    FROM categories c
    WHERE NOT EXISTS (SELECT 1 FROM category_hierarchy ch WHERE ch.id = c.id);
END;
$$ LANGUAGE plpgsql;

-- =================
-- CONSTRAINT VIOLATION LOGGING
-- =================

-- Table to log constraint violations
CREATE TABLE constraint_violations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name VARCHAR(100) NOT NULL,
    constraint_name VARCHAR(200) NOT NULL,
    violation_type VARCHAR(50) NOT NULL, -- CHECK, FOREIGN_KEY, UNIQUE, NOT_NULL
    attempted_values JSONB,
    error_message TEXT,
    user_context UUID,
    application_context VARCHAR(200),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_constraint_violations_table ON constraint_violations(table_name, created_at DESC);
CREATE INDEX idx_constraint_violations_constraint ON constraint_violations(constraint_name, created_at DESC);

-- Function to log constraint violations
CREATE OR REPLACE FUNCTION log_constraint_violation(
    p_table_name VARCHAR(100),
    p_constraint_name VARCHAR(200),
    p_violation_type VARCHAR(50),
    p_attempted_values JSONB DEFAULT NULL,
    p_error_message TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO constraint_violations (
        table_name, constraint_name, violation_type,
        attempted_values, error_message
    ) VALUES (
        p_table_name, p_constraint_name, p_violation_type,
        p_attempted_values, p_error_message
    );
END;
$$ LANGUAGE plpgsql;

-- =================
-- MAINTENANCE PROCEDURES
-- =================

-- Daily integrity check
CREATE OR REPLACE FUNCTION daily_integrity_check()
RETURNS TEXT AS $$
DECLARE
    check_result RECORD;
    issues_found INTEGER := 0;
    report TEXT := 'Daily Integrity Check Report:' || CHR(10);
BEGIN
    FOR check_result IN SELECT * FROM validate_system_integrity() LOOP
        report := report || check_result.check_name || ': ' || check_result.status;

        IF check_result.issues_found > 0 THEN
            issues_found := issues_found + check_result.issues_found;
            report := report || ' (' || check_result.details || ')';
        END IF;

        report := report || CHR(10);
    END LOOP;

    report := report || CHR(10) || 'Total issues found: ' || issues_found;

    -- Log results
    INSERT INTO constraint_violations (
        table_name, constraint_name, violation_type,
        error_message, attempted_values
    ) VALUES (
        'SYSTEM', 'DAILY_INTEGRITY_CHECK', 'SYSTEM_CHECK',
        report, jsonb_build_object('issues_found', issues_found)
    );

    RETURN report;
END;
$$ LANGUAGE plpgsql;

-- =================
-- SCHEDULED INTEGRITY CHECKS
-- =================

-- Schedule daily integrity check
-- SELECT cron.schedule('daily-integrity-check', '0 6 * * *', 'SELECT daily_integrity_check();');

-- Schedule weekly consistency reconciliation
-- SELECT cron.schedule('weekly-reconciliation', '0 7 * * 1', 'SELECT fix_inventory_inconsistencies();');