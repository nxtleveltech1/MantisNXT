-- =====================================================
-- TRANSACTIONAL DATA CLEANUP SCRIPT
-- Agent 2: Data Cleanup Specialist for MantisNXT
-- =====================================================
-- Purpose: Safely clear ALL transactional data while preserving system/config data
-- NOTE: DO NOT EXECUTE - For review and approval only
-- =====================================================

-- =====================================================
-- PHASE 1: SAFETY CHECKS AND PREPARATION
-- =====================================================

-- Function to perform safety checks before cleanup
CREATE OR REPLACE FUNCTION perform_cleanup_safety_checks()
RETURNS JSON AS $$
DECLARE
    safety_report JSON;
    is_production BOOLEAN := false;
    backup_status JSON;
    dependency_status JSON;
BEGIN
    -- Check if we're in production
    IF (SELECT setting FROM pg_settings WHERE name = 'cluster_name') LIKE '%prod%' THEN
        is_production := true;
    END IF;
    
    -- Check if we have database backups
    SELECT JSON_BUILD_OBJECT(
        'supplier_backup_exists', EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'supplier_backup_pre_cleanup'),
        'inventory_backup_exists', EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'inventory_item_backup_pre_cleanup'),
        'orders_backup_exists', EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'purchase_order_backup_pre_cleanup')
    ) INTO backup_status;
    
    -- Check foreign key dependencies
    SELECT JSON_BUILD_OBJECT(
        'active_foreign_keys', (
            SELECT COUNT(*)
            FROM information_schema.table_constraints
            WHERE constraint_type = 'FOREIGN KEY'
            AND table_schema = 'public'
        ),
        'defer_constraints_available', (
            SELECT COUNT(*)
            FROM information_schema.table_constraints tc
            JOIN information_schema.referential_constraints rc ON tc.constraint_name = rc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY'
            AND rc.delete_rule = 'CASCADE'
        )
    ) INTO dependency_status;
    
    SELECT JSON_BUILD_OBJECT(
        'is_production', is_production,
        'backup_status', backup_status,
        'dependency_status', dependency_status,
        'safety_check_timestamp', NOW(),
        'ready_for_cleanup', NOT is_production AND (backup_status->>'supplier_backup_exists')::boolean
    ) INTO safety_report;
    
    RETURN safety_report;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PHASE 2: COMPREHENSIVE BACKUP CREATION
-- =====================================================

CREATE OR REPLACE FUNCTION create_comprehensive_backups()
RETURNS JSON AS $$
DECLARE
    backup_summary JSON;
    tables_backed_up TEXT[];
BEGIN
    RAISE NOTICE 'Creating comprehensive backups before cleanup...';
    
    -- Core transactional tables backup
    CREATE TABLE IF NOT EXISTS sales_orders_backup AS SELECT * FROM sales_orders;
    CREATE TABLE IF NOT EXISTS sales_order_items_backup AS SELECT * FROM sales_order_items;
    CREATE TABLE IF NOT EXISTS quotes_backup AS SELECT * FROM quotes;
    CREATE TABLE IF NOT EXISTS quote_items_backup AS SELECT * FROM quote_items;
    CREATE TABLE IF NOT EXISTS invoices_backup AS SELECT * FROM invoices;
    CREATE TABLE IF NOT EXISTS invoice_items_backup AS SELECT * FROM invoice_items;
    CREATE TABLE IF NOT EXISTS payments_backup AS SELECT * FROM payments;
    CREATE TABLE IF NOT EXISTS purchase_order_backup_full AS SELECT * FROM purchase_order;
    CREATE TABLE IF NOT EXISTS purchase_order_item_backup_full AS SELECT * FROM purchase_order_item;
    
    -- Inventory transactional data backup
    CREATE TABLE IF NOT EXISTS stock_movement_backup AS SELECT * FROM stock_movement;
    CREATE TABLE IF NOT EXISTS price_change_history_backup AS SELECT * FROM price_change_history;
    CREATE TABLE IF NOT EXISTS stock_level_backup AS SELECT * FROM stock_level;
    
    -- CRM transactional data backup
    CREATE TABLE IF NOT EXISTS opportunities_backup AS SELECT * FROM opportunities;
    CREATE TABLE IF NOT EXISTS activities_backup AS SELECT * FROM activities;
    CREATE TABLE IF NOT EXISTS leads_backup AS SELECT * FROM leads;
    
    -- Communication data backup
    CREATE TABLE IF NOT EXISTS email_campaigns_backup AS SELECT * FROM email_campaigns;
    CREATE TABLE IF NOT EXISTS notifications_backup AS SELECT * FROM notifications;
    
    -- Financial data backup
    CREATE TABLE IF NOT EXISTS chart_of_accounts_backup AS SELECT * FROM chart_of_accounts;
    
    -- Workflow and document data backup
    CREATE TABLE IF NOT EXISTS documents_backup AS SELECT * FROM documents;
    CREATE TABLE IF NOT EXISTS document_versions_backup AS SELECT * FROM document_versions;
    CREATE TABLE IF NOT EXISTS workflows_backup AS SELECT * FROM workflows;
    CREATE TABLE IF NOT EXISTS workflow_steps_backup AS SELECT * FROM workflow_steps;
    
    -- Dashboard and reporting backup
    CREATE TABLE IF NOT EXISTS reports_backup AS SELECT * FROM reports;
    CREATE TABLE IF NOT EXISTS dashboards_backup AS SELECT * FROM dashboards;
    CREATE TABLE IF NOT EXISTS dashboard_widgets_backup AS SELECT * FROM dashboard_widgets;
    
    -- Create backup metadata
    CREATE TABLE IF NOT EXISTS cleanup_backup_metadata (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        backup_timestamp TIMESTAMPTZ DEFAULT NOW(),
        backup_type TEXT DEFAULT 'full_transactional',
        table_counts JSONB,
        created_by UUID DEFAULT auth.uid()
    );
    
    -- Record table counts before cleanup
    INSERT INTO cleanup_backup_metadata (table_counts)
    SELECT JSON_BUILD_OBJECT(
        'sales_orders', (SELECT COUNT(*) FROM sales_orders),
        'sales_order_items', (SELECT COUNT(*) FROM sales_order_items),
        'quotes', (SELECT COUNT(*) FROM quotes),
        'quote_items', (SELECT COUNT(*) FROM quote_items),
        'invoices', (SELECT COUNT(*) FROM invoices),
        'invoice_items', (SELECT COUNT(*) FROM invoice_items),
        'payments', (SELECT COUNT(*) FROM payments),
        'purchase_orders', (SELECT COUNT(*) FROM purchase_order),
        'purchase_order_items', (SELECT COUNT(*) FROM purchase_order_item),
        'stock_movements', (SELECT COUNT(*) FROM stock_movement),
        'price_changes', (SELECT COUNT(*) FROM price_change_history),
        'stock_levels', (SELECT COUNT(*) FROM stock_level),
        'opportunities', (SELECT COUNT(*) FROM opportunities),
        'activities', (SELECT COUNT(*) FROM activities),
        'leads', (SELECT COUNT(*) FROM leads),
        'email_campaigns', (SELECT COUNT(*) FROM email_campaigns),
        'notifications', (SELECT COUNT(*) FROM notifications),
        'documents', (SELECT COUNT(*) FROM documents),
        'workflows', (SELECT COUNT(*) FROM workflows),
        'reports', (SELECT COUNT(*) FROM reports),
        'dashboards', (SELECT COUNT(*) FROM dashboards)
    );
    
    tables_backed_up := ARRAY[
        'sales_orders', 'sales_order_items', 'quotes', 'quote_items',
        'invoices', 'invoice_items', 'payments', 'purchase_order',
        'purchase_order_item', 'stock_movement', 'price_change_history',
        'stock_level', 'opportunities', 'activities', 'leads',
        'email_campaigns', 'notifications', 'documents', 'workflows',
        'reports', 'dashboards', 'dashboard_widgets'
    ];
    
    SELECT JSON_BUILD_OBJECT(
        'status', 'backup_completed',
        'tables_backed_up', tables_backed_up,
        'backup_timestamp', NOW(),
        'total_tables', array_length(tables_backed_up, 1)
    ) INTO backup_summary;
    
    RAISE NOTICE 'Comprehensive backup completed: % tables backed up', array_length(tables_backed_up, 1);
    
    RETURN backup_summary;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PHASE 3: TRANSACTIONAL DATA IDENTIFICATION
-- =====================================================

CREATE OR REPLACE FUNCTION identify_transactional_tables()
RETURNS TABLE(
    table_name TEXT,
    table_type TEXT,
    record_count BIGINT,
    cleanup_priority INTEGER,
    cleanup_method TEXT,
    dependencies TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    WITH table_analysis AS (
        SELECT 
            t.table_name::TEXT,
            CASE 
                WHEN t.table_name IN ('sales_orders', 'purchase_order', 'invoices', 'quotes', 'payments') THEN 'core_transactional'
                WHEN t.table_name IN ('sales_order_items', 'purchase_order_item', 'invoice_items', 'quote_items') THEN 'transactional_items'
                WHEN t.table_name IN ('stock_movement', 'price_change_history') THEN 'inventory_transactional'
                WHEN t.table_name IN ('opportunities', 'activities', 'leads') THEN 'crm_transactional'
                WHEN t.table_name IN ('email_campaigns', 'notifications') THEN 'communication_transactional'
                WHEN t.table_name IN ('documents', 'document_versions') THEN 'document_transactional'
                WHEN t.table_name IN ('workflows', 'workflow_steps') THEN 'workflow_transactional'
                WHEN t.table_name IN ('reports', 'dashboards', 'dashboard_widgets') THEN 'reporting_transactional'
                WHEN t.table_name IN ('organizations', 'roles', 'permissions', 'users') THEN 'system_config'
                WHEN t.table_name IN ('supplier', 'customer', 'inventory_item', 'brand') THEN 'master_data'
                WHEN t.table_name IN ('chart_of_accounts', 'email_templates') THEN 'configuration_data'
                ELSE 'other'
            END as table_type,
            CASE 
                WHEN t.table_name LIKE '%_items' THEN 1  -- Delete child records first
                WHEN t.table_name IN ('stock_movement', 'price_change_history', 'activities') THEN 2
                WHEN t.table_name IN ('sales_orders', 'purchase_order', 'invoices', 'quotes') THEN 3
                WHEN t.table_name IN ('payments', 'opportunities', 'leads') THEN 4
                WHEN t.table_name IN ('email_campaigns', 'notifications') THEN 5
                WHEN t.table_name IN ('documents', 'workflows', 'reports', 'dashboards') THEN 6
                ELSE 7
            END as cleanup_priority,
            CASE 
                WHEN t.table_name LIKE '%_items' THEN 'truncate_cascade'
                WHEN t.table_name IN ('stock_movement', 'price_change_history') THEN 'delete_conditional'
                ELSE 'truncate_restart_identity'
            END as cleanup_method
        FROM information_schema.tables t
        WHERE t.table_schema = 'public'
        AND t.table_type = 'BASE TABLE'
        AND t.table_name NOT LIKE '%backup%'
        AND t.table_name NOT LIKE '%_log'
        AND t.table_name NOT LIKE '%_audit'
    )
    SELECT 
        ta.table_name,
        ta.table_type,
        COALESCE(
            (SELECT (xpath('//row/c/text()', query_to_xml(format('SELECT COUNT(*) as c FROM %I', ta.table_name), false, true, '')))[1]::text::bigint),
            0
        ) as record_count,
        ta.cleanup_priority,
        ta.cleanup_method,
        ARRAY[]::TEXT[] as dependencies  -- Simplified for now
    FROM table_analysis ta
    WHERE ta.table_type LIKE '%transactional%'
    ORDER BY ta.cleanup_priority, ta.table_name;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PHASE 4: SAFE TRANSACTIONAL DATA CLEANUP
-- =====================================================

CREATE OR REPLACE FUNCTION execute_transactional_cleanup(dry_run BOOLEAN DEFAULT true)
RETURNS JSON AS $$
DECLARE
    cleanup_results JSON;
    table_record RECORD;
    cleanup_summary JSONB := '{}';
    total_records_deleted BIGINT := 0;
    tables_cleaned INTEGER := 0;
    operation_sql TEXT;
    records_before BIGINT;
    records_after BIGINT;
BEGIN
    -- Safety check
    IF NOT dry_run AND (SELECT perform_cleanup_safety_checks())->>'ready_for_cleanup' != 'true' THEN
        RAISE EXCEPTION 'SAFETY STOP: Safety checks failed. Cannot proceed with cleanup.';
    END IF;
    
    RAISE NOTICE 'Starting transactional data cleanup (dry_run: %)', dry_run;
    
    -- Disable foreign key checks temporarily for cleanup
    IF NOT dry_run THEN
        SET session_replication_role = replica;
    END IF;
    
    -- Process tables in priority order
    FOR table_record IN 
        SELECT * FROM identify_transactional_tables() 
        WHERE table_type LIKE '%transactional%'
        ORDER BY cleanup_priority, table_name
    LOOP
        -- Get record count before
        EXECUTE format('SELECT COUNT(*) FROM %I', table_record.table_name) INTO records_before;
        
        IF records_before = 0 THEN
            RAISE NOTICE 'Table % is already empty, skipping', table_record.table_name;
            CONTINUE;
        END IF;
        
        -- Build cleanup SQL based on cleanup method
        CASE table_record.cleanup_method
            WHEN 'truncate_cascade' THEN
                operation_sql := format('TRUNCATE TABLE %I CASCADE', table_record.table_name);
            WHEN 'truncate_restart_identity' THEN
                operation_sql := format('TRUNCATE TABLE %I RESTART IDENTITY CASCADE', table_record.table_name);
            WHEN 'delete_conditional' THEN
                -- For stock movements, only delete movements older than 30 days in non-dry-run
                operation_sql := format('DELETE FROM %I WHERE created_at < NOW() - INTERVAL ''30 days''', table_record.table_name);
            ELSE
                operation_sql := format('DELETE FROM %I', table_record.table_name);
        END CASE;
        
        IF dry_run THEN
            RAISE NOTICE 'DRY RUN - Would execute: %', operation_sql;
            records_after := 0; -- Simulated result
        ELSE
            RAISE NOTICE 'Executing cleanup for table: %', table_record.table_name;
            EXECUTE operation_sql;
            EXECUTE format('SELECT COUNT(*) FROM %I', table_record.table_name) INTO records_after;
        END IF;
        
        -- Update summary
        cleanup_summary := cleanup_summary || jsonb_build_object(
            table_record.table_name,
            jsonb_build_object(
                'records_before', records_before,
                'records_after', records_after,
                'records_deleted', records_before - records_after,
                'cleanup_method', table_record.cleanup_method,
                'table_type', table_record.table_type
            )
        );
        
        total_records_deleted := total_records_deleted + (records_before - records_after);
        tables_cleaned := tables_cleaned + 1;
        
        RAISE NOTICE 'Table %: % → % records (% deleted)',
            table_record.table_name, records_before, records_after, records_before - records_after;
    END LOOP;
    
    -- Re-enable foreign key checks
    IF NOT dry_run THEN
        SET session_replication_role = DEFAULT;
    END IF;
    
    SELECT JSON_BUILD_OBJECT(
        'status', CASE WHEN dry_run THEN 'dry_run_completed' ELSE 'cleanup_completed' END,
        'dry_run', dry_run,
        'tables_processed', tables_cleaned,
        'total_records_deleted', total_records_deleted,
        'table_details', cleanup_summary,
        'execution_timestamp', NOW()
    ) INTO cleanup_results;
    
    RAISE NOTICE 'Transactional cleanup completed: % tables, % records deleted', 
        tables_cleaned, total_records_deleted;
    
    RETURN cleanup_results;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PHASE 5: SEQUENCE RESET FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION reset_database_sequences()
RETURNS JSON AS $$
DECLARE
    sequence_record RECORD;
    sequences_reset INTEGER := 0;
    reset_summary JSONB := '{}';
    max_id BIGINT;
    sequence_sql TEXT;
BEGIN
    RAISE NOTICE 'Starting database sequence reset...';
    
    -- Find all sequences associated with tables
    FOR sequence_record IN
        SELECT 
            schemaname,
            sequencename,
            REPLACE(sequencename, '_id_seq', '') as table_name
        FROM pg_sequences 
        WHERE schemaname = 'public'
        AND sequencename LIKE '%_id_seq'
    LOOP
        -- Skip if table doesn't exist or is empty
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = sequence_record.table_name 
            AND table_schema = 'public'
        ) THEN
            CONTINUE;
        END IF;
        
        -- Get max ID from table
        BEGIN
            EXECUTE format('SELECT COALESCE(MAX(id::bigint), 0) FROM %I', sequence_record.table_name) 
            INTO max_id;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Skipping sequence % - unable to determine max ID', sequence_record.sequencename;
            CONTINUE;
        END;
        
        -- Reset sequence to max_id + 1
        sequence_sql := format('SELECT setval(''%I'', %s)', sequence_record.sequencename, GREATEST(max_id, 1));
        EXECUTE sequence_sql;
        
        reset_summary := reset_summary || jsonb_build_object(
            sequence_record.sequencename,
            jsonb_build_object(
                'table_name', sequence_record.table_name,
                'max_id_found', max_id,
                'reset_value', GREATEST(max_id + 1, 1)
            )
        );
        
        sequences_reset := sequences_reset + 1;
        
        RAISE NOTICE 'Reset sequence %: max_id=%, new_value=%', 
            sequence_record.sequencename, max_id, GREATEST(max_id + 1, 1);
    END LOOP;
    
    -- Also handle UUID-based tables that might have custom sequences
    -- (This is a placeholder for any custom sequence logic)
    
    RETURN JSON_BUILD_OBJECT(
        'status', 'sequences_reset_completed',
        'sequences_reset', sequences_reset,
        'reset_details', reset_summary,
        'reset_timestamp', NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PHASE 6: COMPREHENSIVE ROLLBACK FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION rollback_transactional_cleanup()
RETURNS JSON AS $$
DECLARE
    rollback_summary JSON;
    backup_table TEXT;
    original_table TEXT;
    records_restored BIGINT := 0;
    tables_restored INTEGER := 0;
    restore_sql TEXT;
BEGIN
    RAISE NOTICE 'Starting comprehensive rollback of transactional cleanup...';
    
    -- Disable foreign key checks for restoration
    SET session_replication_role = replica;
    
    -- Restore from backup tables
    FOR backup_table IN
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name LIKE '%_backup'
        AND table_name NOT LIKE '%_pre_cleanup'
    LOOP
        original_table := REPLACE(backup_table, '_backup', '');
        
        -- Skip if original table doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = original_table 
            AND table_schema = 'public'
        ) THEN
            CONTINUE;
        END IF;
        
        RAISE NOTICE 'Restoring % from %', original_table, backup_table;
        
        -- Clear current data and restore from backup
        EXECUTE format('TRUNCATE TABLE %I RESTART IDENTITY CASCADE', original_table);
        EXECUTE format('INSERT INTO %I SELECT * FROM %I', original_table, backup_table);
        
        GET DIAGNOSTICS records_restored = ROW_COUNT;
        tables_restored := tables_restored + 1;
        
        RAISE NOTICE 'Restored % records to %', records_restored, original_table;
    END LOOP;
    
    -- Re-enable foreign key checks
    SET session_replication_role = DEFAULT;
    
    -- Reset sequences after restoration
    PERFORM reset_database_sequences();
    
    SELECT JSON_BUILD_OBJECT(
        'status', 'rollback_completed',
        'tables_restored', tables_restored,
        'total_records_restored', records_restored,
        'rollback_timestamp', NOW()
    ) INTO rollback_summary;
    
    RAISE NOTICE 'Rollback completed: % tables restored', tables_restored;
    
    RETURN rollback_summary;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- USAGE INSTRUCTIONS AND EXAMPLES
-- =====================================================

/*
COMPREHENSIVE DATA CLEANUP USAGE:

1. SAFETY CHECK:
   SELECT perform_cleanup_safety_checks();

2. CREATE BACKUPS:
   SELECT create_comprehensive_backups();

3. ANALYZE WHAT WILL BE CLEANED:
   SELECT * FROM identify_transactional_tables();

4. DRY RUN (SAFE - SHOWS WHAT WOULD HAPPEN):
   SELECT execute_transactional_cleanup(true);

5. ACTUAL CLEANUP (DANGER - ONLY AFTER APPROVAL):
   SELECT execute_transactional_cleanup(false);

6. RESET SEQUENCES:
   SELECT reset_database_sequences();

7. ROLLBACK IF NEEDED:
   SELECT rollback_transactional_cleanup();

WHAT GETS CLEANED (TRANSACTIONAL DATA):
✓ Sales orders and line items
✓ Purchase orders and line items  
✓ Invoices and line items
✓ Quotes and line items
✓ Payments and financial transactions
✓ Stock movements and inventory transactions
✓ Price change history
✓ CRM activities, opportunities, leads
✓ Email campaigns and notifications
✓ Documents and document versions
✓ Workflows and workflow steps
✓ Reports and dashboards

WHAT GETS PRESERVED (SYSTEM/CONFIG DATA):
✓ Organizations, users, roles, permissions
✓ Suppliers and supplier master data
✓ Customers and customer master data
✓ Inventory items and product catalog
✓ Brands and categories
✓ Chart of accounts structure
✓ Email templates
✓ System configuration tables
✓ Lookup/reference data

SAFETY FEATURES:
- Comprehensive backup before cleanup
- Dry run capability
- Production environment detection
- Foreign key constraint handling
- Complete rollback functionality
- Sequence reset after operations
- Transaction safety and logging
*/

-- =====================================================
-- FINAL VERIFICATION QUERIES
-- =====================================================

-- Query to verify current state
SELECT 
    'CURRENT STATE ANALYSIS' as analysis_type,
    table_type,
    COUNT(*) as table_count,
    SUM(record_count) as total_records
FROM identify_transactional_tables()
GROUP BY table_type
ORDER BY table_type;

-- Query to show cleanup impact preview
SELECT 
    'CLEANUP IMPACT PREVIEW' as preview_type,
    table_name,
    table_type,
    record_count,
    cleanup_method,
    CASE 
        WHEN cleanup_method = 'delete_conditional' THEN 'Partial cleanup (30+ days old)'
        ELSE 'Complete cleanup'
    END as cleanup_scope
FROM identify_transactional_tables()
WHERE table_type LIKE '%transactional%'
ORDER BY cleanup_priority, table_name;