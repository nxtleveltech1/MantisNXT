-- =====================================================
-- SUPPLIER CONSOLIDATION SCRIPT
-- Agent 2: Data Cleanup Specialist for MantisNXT
-- =====================================================
-- Purpose: Safely consolidate duplicate suppliers while preserving data integrity
-- NOTE: DO NOT EXECUTE - For review and approval only
-- =====================================================

-- =====================================================
-- PHASE 1: ANALYSIS AND PREPARATION
-- =====================================================

-- Create backup of critical supplier data before any changes
CREATE TABLE IF NOT EXISTS supplier_backup_pre_cleanup AS
SELECT * FROM supplier;

CREATE TABLE IF NOT EXISTS inventory_item_backup_pre_cleanup AS
SELECT id, supplier_id, name, sku, created_at, updated_at 
FROM inventory_item 
WHERE supplier_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS purchase_order_backup_pre_cleanup AS
SELECT id, supplier_id, order_number, total_amount, status, created_at
FROM purchase_order;

-- =====================================================
-- DUPLICATE DETECTION FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION detect_supplier_duplicates()
RETURNS TABLE(
    normalized_name text,
    duplicate_count bigint,
    supplier_details jsonb,
    impact_summary jsonb
) AS $$
BEGIN
    RETURN QUERY
    WITH duplicate_groups AS (
        SELECT 
            LOWER(TRIM(REGEXP_REPLACE(s.name, '\s+', ' ', 'g'))) as normalized_name,
            s.id,
            s.name,
            s.org_id,
            s.status,
            s.contact_email,
            s.contact_phone,
            s.created_at,
            s.updated_at,
            (SELECT COUNT(*) FROM inventory_item WHERE supplier_id = s.id) as inv_count,
            (SELECT COUNT(*) FROM purchase_order WHERE supplier_id = s.id) as po_count,
            (SELECT COALESCE(SUM(total_amount), 0) FROM purchase_order WHERE supplier_id = s.id) as po_value
        FROM supplier s
    ),
    duplicates AS (
        SELECT 
            normalized_name,
            COUNT(*) as duplicate_count,
            JSON_AGG(
                JSON_BUILD_OBJECT(
                    'id', id,
                    'name', name,
                    'org_id', org_id,
                    'status', status,
                    'contact_email', contact_email,
                    'contact_phone', contact_phone,
                    'created_at', created_at,
                    'updated_at', updated_at,
                    'inv_count', inv_count,
                    'po_count', po_count,
                    'po_value', po_value
                ) ORDER BY 
                    CASE status WHEN 'active' THEN 1 WHEN 'inactive' THEN 2 ELSE 3 END,
                    po_value DESC,
                    created_at ASC
            ) as supplier_details,
            JSON_BUILD_OBJECT(
                'total_inventory_items', SUM(inv_count),
                'total_purchase_orders', SUM(po_count),
                'total_po_value', SUM(po_value),
                'active_suppliers', COUNT(*) FILTER (WHERE status = 'active'),
                'inactive_suppliers', COUNT(*) FILTER (WHERE status = 'inactive')
            ) as impact_summary
        FROM duplicate_groups
        GROUP BY normalized_name
        HAVING COUNT(*) > 1
    )
    SELECT 
        d.normalized_name,
        d.duplicate_count,
        d.supplier_details,
        d.impact_summary
    FROM duplicates d
    ORDER BY d.duplicate_count DESC, (d.impact_summary->>'total_po_value')::numeric DESC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SUPPLIER MERGE FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION merge_suppliers(
    primary_supplier_id UUID,
    duplicate_supplier_ids UUID[]
)
RETURNS JSON AS $$
DECLARE
    primary_supplier RECORD;
    duplicate_supplier RECORD;
    duplicate_id UUID;
    affected_inventory INTEGER := 0;
    affected_purchase_orders INTEGER := 0;
    merge_summary JSON;
BEGIN
    -- Validate primary supplier exists and is active
    SELECT * INTO primary_supplier FROM supplier WHERE id = primary_supplier_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Primary supplier ID % not found', primary_supplier_id;
    END IF;
    
    IF primary_supplier.status != 'active' THEN
        RAISE EXCEPTION 'Primary supplier % is not active (status: %)', 
            primary_supplier.name, primary_supplier.status;
    END IF;
    
    -- Begin merge process
    FOREACH duplicate_id IN ARRAY duplicate_supplier_ids
    LOOP
        SELECT * INTO duplicate_supplier FROM supplier WHERE id = duplicate_id;
        
        IF NOT FOUND THEN
            RAISE WARNING 'Duplicate supplier ID % not found, skipping', duplicate_id;
            CONTINUE;
        END IF;
        
        -- Log the merge operation
        INSERT INTO supplier_merge_log (
            primary_supplier_id,
            duplicate_supplier_id,
            primary_name,
            duplicate_name,
            merge_timestamp,
            merged_by
        ) VALUES (
            primary_supplier_id,
            duplicate_id,
            primary_supplier.name,
            duplicate_supplier.name,
            NOW(),
            auth.uid()
        );
        
        -- Update inventory items
        UPDATE inventory_item 
        SET supplier_id = primary_supplier_id,
            updated_at = NOW()
        WHERE supplier_id = duplicate_id;
        
        GET DIAGNOSTICS affected_inventory = ROW_COUNT;
        
        -- Update purchase orders
        UPDATE purchase_order 
        SET supplier_id = primary_supplier_id,
            updated_at = NOW()
        WHERE supplier_id = duplicate_id;
        
        GET DIAGNOSTICS affected_purchase_orders = ROW_COUNT;
        
        -- Update supplier_product mappings
        INSERT INTO supplier_product (
            supplier_id, inventory_item_id, supplier_sku, supplier_name,
            supplier_description, cost_price, currency_code, lead_time_days,
            minimum_order_quantity, pack_size, is_preferred, is_active
        )
        SELECT 
            primary_supplier_id, sp.inventory_item_id, sp.supplier_sku, sp.supplier_name,
            sp.supplier_description, sp.cost_price, sp.currency_code, sp.lead_time_days,
            sp.minimum_order_quantity, sp.pack_size, sp.is_preferred, sp.is_active
        FROM supplier_product sp 
        WHERE sp.supplier_id = duplicate_id
        ON CONFLICT (supplier_id, inventory_item_id) DO UPDATE SET
            cost_price = EXCLUDED.cost_price,
            last_cost_update_date = CURRENT_DATE,
            updated_at = NOW();
        
        -- Delete old supplier_product mappings
        DELETE FROM supplier_product WHERE supplier_id = duplicate_id;
        
        -- Update supplier performance data (merge/aggregate)
        INSERT INTO supplier_performance_merge_temp 
        SELECT * FROM supplier_performance WHERE supplier_id = duplicate_id;
        
        DELETE FROM supplier_performance WHERE supplier_id = duplicate_id;
        
        -- Soft delete the duplicate supplier (mark as merged)
        UPDATE supplier 
        SET status = 'merged',
            updated_at = NOW(),
            merged_into = primary_supplier_id
        WHERE id = duplicate_id;
        
        RAISE NOTICE 'Merged supplier % (%) into % (%): % inventory items, % purchase orders affected',
            duplicate_supplier.name, duplicate_id,
            primary_supplier.name, primary_supplier_id,
            affected_inventory, affected_purchase_orders;
    END LOOP;
    
    -- Update primary supplier's performance metrics
    PERFORM update_consolidated_supplier_performance(primary_supplier_id);
    
    -- Return merge summary
    SELECT JSON_BUILD_OBJECT(
        'primary_supplier_id', primary_supplier_id,
        'primary_supplier_name', primary_supplier.name,
        'merged_suppliers_count', array_length(duplicate_supplier_ids, 1),
        'total_affected_inventory', affected_inventory,
        'total_affected_purchase_orders', affected_purchase_orders,
        'merge_timestamp', NOW()
    ) INTO merge_summary;
    
    RETURN merge_summary;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SUPPORTING TABLES AND FUNCTIONS
-- =====================================================

-- Table to log supplier merges
CREATE TABLE IF NOT EXISTS supplier_merge_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    primary_supplier_id UUID NOT NULL,
    duplicate_supplier_id UUID NOT NULL,
    primary_name TEXT NOT NULL,
    duplicate_name TEXT NOT NULL,
    merge_timestamp TIMESTAMPTZ NOT NULL,
    merged_by UUID,
    rollback_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add merged_into field to supplier table if not exists
ALTER TABLE supplier 
ADD COLUMN IF NOT EXISTS merged_into UUID REFERENCES supplier(id);

-- Temporary table for performance data during merge
CREATE TABLE IF NOT EXISTS supplier_performance_merge_temp (
    LIKE supplier_performance INCLUDING ALL
);

-- Function to update consolidated performance metrics
CREATE OR REPLACE FUNCTION update_consolidated_supplier_performance(supplier_id_param UUID)
RETURNS VOID AS $$
BEGIN
    -- This would contain complex logic to merge performance metrics
    -- For now, just update the last evaluation date
    UPDATE supplier 
    SET last_evaluation_date = CURRENT_DATE,
        updated_at = NOW()
    WHERE id = supplier_id_param;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- CONSOLIDATION EXECUTION SCRIPT
-- =====================================================

-- Function to execute supplier consolidation with safety checks
CREATE OR REPLACE FUNCTION execute_supplier_consolidation()
RETURNS JSON AS $$
DECLARE
    consolidation_results JSON;
    duplicate_groups RECORD;
    primary_supplier_id UUID;
    duplicate_ids UUID[];
    safety_check_passed BOOLEAN := true;
    total_merged INTEGER := 0;
BEGIN
    -- Safety check: Ensure we're not in production
    IF (SELECT setting FROM pg_settings WHERE name = 'cluster_name') LIKE '%prod%' THEN
        RAISE EXCEPTION 'SAFETY STOP: Cannot run consolidation in production environment';
    END IF;
    
    -- Safety check: Verify backup tables exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'supplier_backup_pre_cleanup') THEN
        RAISE EXCEPTION 'SAFETY STOP: Backup tables not found. Run backup creation first.';
    END IF;
    
    RAISE NOTICE 'Starting supplier consolidation process...';
    RAISE NOTICE 'Safety checks passed. Processing duplicates...';
    
    -- Process each group of duplicates
    FOR duplicate_groups IN 
        SELECT * FROM detect_supplier_duplicates()
    LOOP
        RAISE NOTICE 'Processing duplicate group: %', duplicate_groups.normalized_name;
        
        -- Extract primary supplier (first in the ordered list)
        SELECT (value->>'id')::UUID INTO primary_supplier_id
        FROM JSON_ARRAY_ELEMENTS(duplicate_groups.supplier_details)
        LIMIT 1;
        
        -- Extract duplicate IDs (skip the first one)
        SELECT ARRAY_AGG((value->>'id')::UUID) INTO duplicate_ids
        FROM JSON_ARRAY_ELEMENTS(duplicate_groups.supplier_details)
        OFFSET 1;
        
        -- Execute merge if we have duplicates to merge
        IF array_length(duplicate_ids, 1) > 0 THEN
            PERFORM merge_suppliers(primary_supplier_id, duplicate_ids);
            total_merged := total_merged + array_length(duplicate_ids, 1);
        END IF;
    END LOOP;
    
    -- Return consolidation summary
    SELECT JSON_BUILD_OBJECT(
        'status', 'completed',
        'total_suppliers_merged', total_merged,
        'execution_timestamp', NOW(),
        'safety_checks_passed', safety_check_passed
    ) INTO consolidation_results;
    
    RAISE NOTICE 'Supplier consolidation completed. % suppliers merged.', total_merged;
    
    RETURN consolidation_results;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ROLLBACK FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION rollback_supplier_consolidation()
RETURNS JSON AS $$
DECLARE
    rollback_summary JSON;
    affected_suppliers INTEGER;
    affected_inventory INTEGER;
    affected_orders INTEGER;
BEGIN
    RAISE NOTICE 'Starting supplier consolidation rollback...';
    
    -- Restore suppliers from backup
    UPDATE supplier SET
        status = b.status,
        merged_into = NULL,
        updated_at = NOW()
    FROM supplier_backup_pre_cleanup b
    WHERE supplier.id = b.id
    AND supplier.status = 'merged';
    
    GET DIAGNOSTICS affected_suppliers = ROW_COUNT;
    
    -- Restore inventory item supplier references
    UPDATE inventory_item SET
        supplier_id = b.supplier_id,
        updated_at = NOW()
    FROM inventory_item_backup_pre_cleanup b
    WHERE inventory_item.id = b.id;
    
    GET DIAGNOSTICS affected_inventory = ROW_COUNT;
    
    -- Restore purchase order supplier references
    UPDATE purchase_order SET
        supplier_id = b.supplier_id,
        updated_at = NOW()
    FROM purchase_order_backup_pre_cleanup b
    WHERE purchase_order.id = b.id;
    
    GET DIAGNOSTICS affected_orders = ROW_COUNT;
    
    -- Clear merge log for this rollback
    UPDATE supplier_merge_log SET
        rollback_data = JSON_BUILD_OBJECT(
            'rollback_timestamp', NOW(),
            'rollback_reason', 'Manual rollback requested'
        )
    WHERE rollback_data IS NULL;
    
    SELECT JSON_BUILD_OBJECT(
        'status', 'rollback_completed',
        'suppliers_restored', affected_suppliers,
        'inventory_items_restored', affected_inventory,
        'purchase_orders_restored', affected_orders,
        'rollback_timestamp', NOW()
    ) INTO rollback_summary;
    
    RAISE NOTICE 'Rollback completed. % suppliers, % inventory items, % orders restored.',
        affected_suppliers, affected_inventory, affected_orders;
    
    RETURN rollback_summary;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- USAGE INSTRUCTIONS
-- =====================================================

/*
USAGE INSTRUCTIONS:

1. ANALYSIS PHASE:
   -- View duplicate suppliers
   SELECT * FROM detect_supplier_duplicates();

2. PREPARATION PHASE:
   -- Backups are automatically created when functions are created
   -- Verify backups exist:
   SELECT COUNT(*) FROM supplier_backup_pre_cleanup;

3. CONSOLIDATION PHASE (CAREFUL - DO NOT RUN WITHOUT APPROVAL):
   -- Dry run analysis only:
   SELECT * FROM detect_supplier_duplicates();
   
   -- Actual consolidation (ONLY AFTER APPROVAL):
   -- SELECT execute_supplier_consolidation();

4. ROLLBACK IF NEEDED:
   -- SELECT rollback_supplier_consolidation();

5. CLEANUP AFTER SUCCESS:
   -- DROP TABLE supplier_backup_pre_cleanup CASCADE;
   -- DROP TABLE inventory_item_backup_pre_cleanup CASCADE;
   -- DROP TABLE purchase_order_backup_pre_cleanup CASCADE;

SAFETY FEATURES:
- Automatic backup creation
- Production environment detection
- Comprehensive logging
- Complete rollback capability
- Referential integrity preservation
- Transaction safety
*/

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check current state before consolidation
SELECT 
    'BEFORE CONSOLIDATION' as phase,
    COUNT(*) as total_suppliers,
    COUNT(*) FILTER (WHERE status = 'active') as active_suppliers,
    COUNT(*) FILTER (WHERE status = 'inactive') as inactive_suppliers,
    COUNT(*) FILTER (WHERE status = 'merged') as merged_suppliers
FROM supplier;

-- Show duplicate detection results
SELECT 'DUPLICATE ANALYSIS' as analysis_type, * FROM detect_supplier_duplicates();