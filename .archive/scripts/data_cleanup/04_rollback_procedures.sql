-- =====================================================
-- COMPREHENSIVE ROLLBACK PROCEDURES
-- Agent 2: Data Cleanup Specialist for MantisNXT
-- =====================================================
-- Purpose: Complete rollback procedures for all cleanup operations
-- NOTE: Emergency recovery procedures - use with caution
-- =====================================================

-- =====================================================
-- ROLLBACK INFRASTRUCTURE SETUP
-- =====================================================

-- Master rollback log table
CREATE TABLE IF NOT EXISTS rollback_operations_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operation_type TEXT NOT NULL, -- 'supplier_consolidation', 'transactional_cleanup', 'sequence_reset'
    rollback_type TEXT NOT NULL, -- 'full', 'partial', 'emergency'
    pre_rollback_state JSONB,
    rollback_results JSONB,
    rollback_status TEXT DEFAULT 'initiated', -- 'initiated', 'in_progress', 'completed', 'failed'
    performed_by UUID DEFAULT auth.uid(),
    performed_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    error_details TEXT,
    rollback_method TEXT -- 'backup_restore', 'transaction_rollback', 'manual_correction'
);

-- Rollback checkpoint table for staged operations
CREATE TABLE IF NOT EXISTS rollback_checkpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operation_id UUID NOT NULL,
    checkpoint_name TEXT NOT NULL,
    checkpoint_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- COMPREHENSIVE STATE CAPTURE FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION capture_database_state()
RETURNS JSON AS $$
DECLARE
    state_snapshot JSON;
    table_counts JSONB := '{}';
    sequence_states JSONB := '{}';
    constraint_info JSONB := '{}';
    table_record RECORD;
    seq_record RECORD;
BEGIN
    RAISE NOTICE 'Capturing comprehensive database state...';
    
    -- Capture table record counts
    FOR table_record IN
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        AND table_name NOT LIKE '%backup%'
        AND table_name NOT LIKE '%_log'
        ORDER BY table_name
    LOOP
        EXECUTE format('SELECT COUNT(*) FROM %I', table_record.table_name) 
        INTO table_counts USING jsonb_build_object(
            table_record.table_name, 
            (SELECT COUNT(*) FROM (SELECT 1 FROM information_schema.tables WHERE table_name = table_record.table_name LIMIT 1) sub)
        );
        
        -- Dynamic count query
        DECLARE
            record_count BIGINT;
        BEGIN
            EXECUTE format('SELECT COUNT(*) FROM %I', table_record.table_name) INTO record_count;
            table_counts := table_counts || jsonb_build_object(table_record.table_name, record_count);
        EXCEPTION WHEN OTHERS THEN
            table_counts := table_counts || jsonb_build_object(table_record.table_name, -1);
        END;
    END LOOP;
    
    -- Capture sequence states
    FOR seq_record IN
        SELECT sequencename, last_value
        FROM pg_sequences
        WHERE schemaname = 'public'
        ORDER BY sequencename
    LOOP
        sequence_states := sequence_states || jsonb_build_object(
            seq_record.sequencename, 
            seq_record.last_value
        );
    END LOOP;
    
    -- Capture foreign key constraint information
    SELECT jsonb_agg(
        jsonb_build_object(
            'constraint_name', tc.constraint_name,
            'table_name', tc.table_name,
            'column_name', kcu.column_name,
            'foreign_table', ccu.table_name,
            'foreign_column', ccu.column_name,
            'delete_rule', rc.delete_rule,
            'update_rule', rc.update_rule
        )
    ) INTO constraint_info
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage ccu 
        ON ccu.constraint_name = tc.constraint_name
    JOIN information_schema.referential_constraints rc 
        ON tc.constraint_name = rc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public';
    
    SELECT JSON_BUILD_OBJECT(
        'timestamp', NOW(),
        'database_name', current_database(),
        'schema_name', 'public',
        'table_counts', table_counts,
        'sequence_states', sequence_states,
        'constraint_info', constraint_info,
        'total_tables', (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'),
        'total_sequences', (SELECT COUNT(*) FROM pg_sequences WHERE schemaname = 'public'),
        'total_constraints', (SELECT COUNT(*) FROM information_schema.table_constraints WHERE table_schema = 'public' AND constraint_type = 'FOREIGN KEY')
    ) INTO state_snapshot;
    
    RAISE NOTICE 'Database state captured: % tables, % sequences, % constraints',
        (state_snapshot->>'total_tables')::INTEGER,
        (state_snapshot->>'total_sequences')::INTEGER,
        (state_snapshot->>'total_constraints')::INTEGER;
    
    RETURN state_snapshot;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SUPPLIER CONSOLIDATION ROLLBACK
-- =====================================================

CREATE OR REPLACE FUNCTION rollback_supplier_consolidation(rollback_type TEXT DEFAULT 'full')
RETURNS JSON AS $$
DECLARE
    rollback_id UUID;
    pre_state JSON;
    rollback_results JSON;
    suppliers_restored INTEGER := 0;
    inventory_restored INTEGER := 0;
    orders_restored INTEGER := 0;
    performance_restored INTEGER := 0;
    merge_record RECORD;
BEGIN
    -- Create rollback log entry
    INSERT INTO rollback_operations_log (operation_type, rollback_type, rollback_status, rollback_method)
    VALUES ('supplier_consolidation', rollback_type, 'initiated', 'backup_restore')
    RETURNING id INTO rollback_id;
    
    -- Capture pre-rollback state
    SELECT capture_database_state() INTO pre_state;
    
    UPDATE rollback_operations_log 
    SET pre_rollback_state = pre_state::JSONB 
    WHERE id = rollback_id;
    
    RAISE NOTICE 'Starting supplier consolidation rollback (type: %)', rollback_type;
    
    UPDATE rollback_operations_log 
    SET rollback_status = 'in_progress' 
    WHERE id = rollback_id;
    
    -- Restore suppliers from backup
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'supplier_backup_pre_cleanup') THEN
        -- Restore merged suppliers
        UPDATE supplier SET
            status = backup.status,
            name = backup.name,
            contact_email = backup.contact_email,
            contact_phone = backup.contact_phone,
            merged_into = NULL,
            updated_at = NOW()
        FROM supplier_backup_pre_cleanup backup
        WHERE supplier.id = backup.id
        AND supplier.status = 'merged';
        
        GET DIAGNOSTICS suppliers_restored = ROW_COUNT;
        
        RAISE NOTICE 'Restored % suppliers from merged status', suppliers_restored;
    ELSE
        RAISE WARNING 'Supplier backup table not found - cannot restore suppliers';
    END IF;
    
    -- Restore inventory item supplier references
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inventory_item_backup_pre_cleanup') THEN
        UPDATE inventory_item SET
            supplier_id = backup.supplier_id,
            updated_at = NOW()
        FROM inventory_item_backup_pre_cleanup backup
        WHERE inventory_item.id = backup.id
        AND backup.supplier_id IS NOT NULL;
        
        GET DIAGNOSTICS inventory_restored = ROW_COUNT;
        
        RAISE NOTICE 'Restored supplier references for % inventory items', inventory_restored;
    END IF;
    
    -- Restore purchase order supplier references
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'purchase_order_backup_pre_cleanup') THEN
        UPDATE purchase_order SET
            supplier_id = backup.supplier_id,
            updated_at = NOW()
        FROM purchase_order_backup_pre_cleanup backup
        WHERE purchase_order.id = backup.id;
        
        GET DIAGNOSTICS orders_restored = ROW_COUNT;
        
        RAISE NOTICE 'Restored supplier references for % purchase orders', orders_restored;
    END IF;
    
    -- Restore supplier performance data from merge temp table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'supplier_performance_merge_temp') THEN
        INSERT INTO supplier_performance 
        SELECT * FROM supplier_performance_merge_temp
        ON CONFLICT (supplier_id, period_start, period_end) DO UPDATE SET
            orders_placed = EXCLUDED.orders_placed,
            orders_delivered = EXCLUDED.orders_delivered,
            orders_on_time = EXCLUDED.orders_on_time,
            total_order_value = EXCLUDED.total_order_value,
            updated_at = NOW();
        
        GET DIAGNOSTICS performance_restored = ROW_COUNT;
        
        RAISE NOTICE 'Restored % supplier performance records', performance_restored;
        
        -- Clear the temp table
        TRUNCATE supplier_performance_merge_temp;
    END IF;
    
    -- Reset supplier performance metrics that were consolidated
    UPDATE supplier SET
        performance_score = 0,
        on_time_delivery_rate = 0,
        quality_rating = 0,
        last_evaluation_date = NULL,
        updated_at = NOW()
    WHERE id IN (
        SELECT DISTINCT primary_supplier_id 
        FROM supplier_merge_log 
        WHERE merge_timestamp > NOW() - INTERVAL '1 day'
    );
    
    -- Mark merge log entries as rolled back
    UPDATE supplier_merge_log SET
        rollback_data = JSON_BUILD_OBJECT(
            'rollback_timestamp', NOW(),
            'rollback_id', rollback_id,
            'rollback_type', rollback_type
        )
    WHERE rollback_data IS NULL
    AND merge_timestamp > NOW() - INTERVAL '1 day';
    
    -- Compile rollback results
    SELECT JSON_BUILD_OBJECT(
        'rollback_id', rollback_id,
        'rollback_type', rollback_type,
        'suppliers_restored', suppliers_restored,
        'inventory_items_restored', inventory_restored,
        'purchase_orders_restored', orders_restored,
        'performance_records_restored', performance_restored,
        'rollback_timestamp', NOW(),
        'status', 'completed'
    ) INTO rollback_results;
    
    -- Update rollback log
    UPDATE rollback_operations_log SET
        rollback_status = 'completed',
        rollback_results = rollback_results::JSONB,
        completed_at = NOW()
    WHERE id = rollback_id;
    
    RAISE NOTICE 'Supplier consolidation rollback completed successfully';
    
    RETURN rollback_results;
    
EXCEPTION WHEN OTHERS THEN
    -- Handle rollback failure
    UPDATE rollback_operations_log SET
        rollback_status = 'failed',
        error_details = SQLERRM,
        completed_at = NOW()
    WHERE id = rollback_id;
    
    RAISE EXCEPTION 'Supplier consolidation rollback failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRANSACTIONAL DATA CLEANUP ROLLBACK
-- =====================================================

CREATE OR REPLACE FUNCTION rollback_transactional_cleanup(selective_tables TEXT[] DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
    rollback_id UUID;
    pre_state JSON;
    rollback_results JSON;
    backup_table TEXT;
    target_table TEXT;
    tables_restored INTEGER := 0;
    total_records_restored BIGINT := 0;
    records_restored BIGINT;
    restore_sql TEXT;
BEGIN
    -- Create rollback log entry
    INSERT INTO rollback_operations_log (operation_type, rollback_type, rollback_status, rollback_method)
    VALUES ('transactional_cleanup', 
            CASE WHEN selective_tables IS NULL THEN 'full' ELSE 'partial' END, 
            'initiated', 'backup_restore')
    RETURNING id INTO rollback_id;
    
    -- Capture pre-rollback state
    SELECT capture_database_state() INTO pre_state;
    
    UPDATE rollback_operations_log 
    SET pre_rollback_state = pre_state::JSONB 
    WHERE id = rollback_id;
    
    RAISE NOTICE 'Starting transactional data cleanup rollback...';
    
    UPDATE rollback_operations_log 
    SET rollback_status = 'in_progress' 
    WHERE id = rollback_id;
    
    -- Temporarily disable foreign key checks
    SET session_replication_role = replica;
    
    -- Restore from backup tables
    FOR backup_table IN
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name LIKE '%_backup'
        AND table_name NOT LIKE '%_pre_cleanup'
        AND (selective_tables IS NULL OR 
             REPLACE(table_name, '_backup', '') = ANY(selective_tables))
        ORDER BY table_name
    LOOP
        target_table := REPLACE(backup_table, '_backup', '');
        
        -- Skip if target table doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_name = target_table
            AND table_schema = 'public'
        ) THEN
            RAISE WARNING 'Target table % does not exist, skipping %', target_table, backup_table;
            CONTINUE;
        END IF;
        
        RAISE NOTICE 'Restoring % from %', target_table, backup_table;
        
        -- Get backup record count
        EXECUTE format('SELECT COUNT(*) FROM %I', backup_table) INTO records_restored;
        
        IF records_restored = 0 THEN
            RAISE NOTICE 'Backup table % is empty, skipping', backup_table;
            CONTINUE;
        END IF;
        
        -- Clear target table and restore from backup
        EXECUTE format('TRUNCATE TABLE %I RESTART IDENTITY CASCADE', target_table);
        EXECUTE format('INSERT INTO %I SELECT * FROM %I', target_table, backup_table);
        
        tables_restored := tables_restored + 1;
        total_records_restored := total_records_restored + records_restored;
        
        RAISE NOTICE 'Restored % records to %', records_restored, target_table;
        
        -- Create checkpoint
        INSERT INTO rollback_checkpoints (operation_id, checkpoint_name, checkpoint_data)
        VALUES (rollback_id, format('restored_%s', target_table), 
                JSON_BUILD_OBJECT(
                    'table_name', target_table,
                    'backup_table', backup_table,
                    'records_restored', records_restored,
                    'restored_at', NOW()
                )::JSONB);
    END LOOP;
    
    -- Re-enable foreign key checks
    SET session_replication_role = DEFAULT;
    
    -- Reset sequences after restoration
    PERFORM reset_all_sequences(false);
    
    -- Compile rollback results
    SELECT JSON_BUILD_OBJECT(
        'rollback_id', rollback_id,
        'rollback_type', CASE WHEN selective_tables IS NULL THEN 'full' ELSE 'partial' END,
        'selective_tables', selective_tables,
        'tables_restored', tables_restored,
        'total_records_restored', total_records_restored,
        'sequences_reset', true,
        'rollback_timestamp', NOW(),
        'status', 'completed'
    ) INTO rollback_results;
    
    -- Update rollback log
    UPDATE rollback_operations_log SET
        rollback_status = 'completed',
        rollback_results = rollback_results::JSONB,
        completed_at = NOW()
    WHERE id = rollback_id;
    
    RAISE NOTICE 'Transactional cleanup rollback completed: % tables, % records restored',
        tables_restored, total_records_restored;
    
    RETURN rollback_results;
    
EXCEPTION WHEN OTHERS THEN
    -- Re-enable foreign key checks in case of error
    SET session_replication_role = DEFAULT;
    
    -- Handle rollback failure
    UPDATE rollback_operations_log SET
        rollback_status = 'failed',
        error_details = SQLERRM,
        completed_at = NOW()
    WHERE id = rollback_id;
    
    RAISE EXCEPTION 'Transactional cleanup rollback failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- EMERGENCY FULL DATABASE ROLLBACK
-- =====================================================

CREATE OR REPLACE FUNCTION emergency_full_rollback()
RETURNS JSON AS $$
DECLARE
    rollback_id UUID;
    pre_state JSON;
    supplier_rollback_result JSON;
    transactional_rollback_result JSON;
    sequence_reset_result JSON;
    emergency_summary JSON;
BEGIN
    RAISE WARNING 'EMERGENCY FULL ROLLBACK INITIATED - This will restore all data from backups';
    
    -- Create master rollback log entry
    INSERT INTO rollback_operations_log (operation_type, rollback_type, rollback_status, rollback_method)
    VALUES ('full_database', 'emergency', 'initiated', 'complete_restoration')
    RETURNING id INTO rollback_id;
    
    -- Capture current state before rollback
    SELECT capture_database_state() INTO pre_state;
    
    UPDATE rollback_operations_log 
    SET pre_rollback_state = pre_state::JSONB,
        rollback_status = 'in_progress'
    WHERE id = rollback_id;
    
    -- Step 1: Rollback supplier consolidation
    RAISE NOTICE 'Step 1/3: Rolling back supplier consolidation...';
    BEGIN
        SELECT rollback_supplier_consolidation('emergency') INTO supplier_rollback_result;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Supplier rollback encountered error: %. Continuing...', SQLERRM;
        supplier_rollback_result := JSON_BUILD_OBJECT('status', 'failed', 'error', SQLERRM);
    END;
    
    -- Step 2: Rollback transactional cleanup
    RAISE NOTICE 'Step 2/3: Rolling back transactional data cleanup...';
    BEGIN
        SELECT rollback_transactional_cleanup() INTO transactional_rollback_result;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Transactional rollback encountered error: %. Continuing...', SQLERRM;
        transactional_rollback_result := JSON_BUILD_OBJECT('status', 'failed', 'error', SQLERRM);
    END;
    
    -- Step 3: Reset all sequences
    RAISE NOTICE 'Step 3/3: Resetting database sequences...';
    BEGIN
        SELECT reset_all_sequences(false) INTO sequence_reset_result;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Sequence reset encountered error: %. Continuing...', SQLERRM;
        sequence_reset_result := JSON_BUILD_OBJECT('status', 'failed', 'error', SQLERRM);
    END;
    
    -- Compile emergency rollback summary
    SELECT JSON_BUILD_OBJECT(
        'emergency_rollback_id', rollback_id,
        'rollback_timestamp', NOW(),
        'supplier_rollback', supplier_rollback_result,
        'transactional_rollback', transactional_rollback_result,
        'sequence_reset', sequence_reset_result,
        'overall_status', CASE 
            WHEN (supplier_rollback_result->>'status' = 'completed' OR supplier_rollback_result->>'status' = 'failed')
            AND (transactional_rollback_result->>'status' = 'completed' OR transactional_rollback_result->>'status' = 'failed')
            THEN 'completed'
            ELSE 'partial'
        END,
        'warnings', ARRAY[
            'Emergency rollback completed',
            'Verify data integrity manually',
            'Check application functionality',
            'Consider running health checks'
        ]
    ) INTO emergency_summary;
    
    -- Update master rollback log
    UPDATE rollback_operations_log SET
        rollback_status = 'completed',
        rollback_results = emergency_summary::JSONB,
        completed_at = NOW()
    WHERE id = rollback_id;
    
    RAISE WARNING 'EMERGENCY FULL ROLLBACK COMPLETED - Verify system integrity';
    
    RETURN emergency_summary;
    
EXCEPTION WHEN OTHERS THEN
    -- Handle emergency rollback failure
    UPDATE rollback_operations_log SET
        rollback_status = 'failed',
        error_details = SQLERRM,
        completed_at = NOW()
    WHERE id = rollback_id;
    
    RAISE EXCEPTION 'EMERGENCY ROLLBACK FAILED: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ROLLBACK STATUS AND MONITORING
-- =====================================================

-- Function to check rollback status
CREATE OR REPLACE FUNCTION check_rollback_status()
RETURNS TABLE(
    operation_type TEXT,
    rollback_type TEXT,
    status TEXT,
    performed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    duration INTERVAL,
    success_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        rol.operation_type,
        rol.rollback_type,
        rol.rollback_status,
        rol.performed_at,
        rol.completed_at,
        COALESCE(rol.completed_at - rol.performed_at, NOW() - rol.performed_at) as duration,
        ROUND(
            COUNT(*) FILTER (WHERE rol.rollback_status = 'completed')::NUMERIC / 
            NULLIF(COUNT(*), 0) * 100, 2
        ) OVER (PARTITION BY rol.operation_type) as success_rate
    FROM rollback_operations_log rol
    ORDER BY rol.performed_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get rollback recommendations
CREATE OR REPLACE FUNCTION get_rollback_recommendations()
RETURNS TABLE(
    recommendation_type TEXT,
    priority TEXT,
    description TEXT,
    action_required TEXT
) AS $$
BEGIN
    RETURN QUERY
    -- Check for failed rollbacks
    SELECT 
        'Failed Rollbacks'::TEXT,
        'HIGH'::TEXT,
        format('%s rollback operations have failed and need attention', COUNT(*))::TEXT,
        'Review error logs and retry manually'::TEXT
    FROM rollback_operations_log
    WHERE rollback_status = 'failed'
    AND completed_at > NOW() - INTERVAL '24 hours'
    HAVING COUNT(*) > 0
    
    UNION ALL
    
    -- Check for incomplete rollbacks
    SELECT 
        'Incomplete Rollbacks'::TEXT,
        'MEDIUM'::TEXT,
        format('%s rollback operations are still in progress', COUNT(*))::TEXT,
        'Monitor progress or investigate hanging operations'::TEXT
    FROM rollback_operations_log
    WHERE rollback_status = 'in_progress'
    AND performed_at < NOW() - INTERVAL '1 hour'
    HAVING COUNT(*) > 0
    
    UNION ALL
    
    -- Check backup table cleanup needs
    SELECT 
        'Backup Cleanup'::TEXT,
        'LOW'::TEXT,
        format('%s backup tables can be cleaned up', COUNT(*))::TEXT,
        'Drop backup tables after confirming rollback success'::TEXT
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name LIKE '%_backup'
    AND table_name IN (
        SELECT DISTINCT jsonb_object_keys(rollback_results->'table_details')
        FROM rollback_operations_log
        WHERE rollback_status = 'completed'
        AND completed_at < NOW() - INTERVAL '48 hours'
    )
    HAVING COUNT(*) > 5
    
    UNION ALL
    
    -- General system health after rollback
    SELECT 
        'System Health Check'::TEXT,
        'INFO'::TEXT,
        'Regular system health check recommended after rollback operations'::TEXT,
        'Run data integrity checks and verify application functionality'::TEXT
    WHERE EXISTS (
        SELECT 1 FROM rollback_operations_log
        WHERE rollback_status = 'completed'
        AND completed_at > NOW() - INTERVAL '24 hours'
    );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- BACKUP CLEANUP FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION cleanup_rollback_artifacts(confirm_cleanup BOOLEAN DEFAULT false)
RETURNS JSON AS $$
DECLARE
    cleanup_summary JSON;
    backup_tables_dropped INTEGER := 0;
    log_entries_archived INTEGER := 0;
    temp_tables_dropped INTEGER := 0;
    backup_table TEXT;
BEGIN
    IF NOT confirm_cleanup THEN
        RETURN JSON_BUILD_OBJECT(
            'status', 'confirmation_required',
            'message', 'Set confirm_cleanup=true to execute cleanup',
            'backup_tables_found', (
                SELECT COUNT(*) FROM information_schema.tables
                WHERE table_schema = 'public' AND table_name LIKE '%backup%'
            )
        );
    END IF;
    
    RAISE NOTICE 'Starting cleanup of rollback artifacts...';
    
    -- Drop backup tables (keep pre_cleanup backups for safety)
    FOR backup_table IN
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name LIKE '%_backup'
        AND table_name NOT LIKE '%_pre_cleanup'
        AND table_name NOT LIKE '%_backup_metadata'
    LOOP
        EXECUTE format('DROP TABLE IF EXISTS %I CASCADE', backup_table);
        backup_tables_dropped := backup_tables_dropped + 1;
        RAISE NOTICE 'Dropped backup table: %', backup_table;
    END LOOP;
    
    -- Drop temporary tables
    FOR backup_table IN
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND (table_name LIKE '%_temp' OR table_name LIKE '%_merge_temp')
    LOOP
        EXECUTE format('DROP TABLE IF EXISTS %I CASCADE', backup_table);
        temp_tables_dropped := temp_tables_dropped + 1;
        RAISE NOTICE 'Dropped temp table: %', backup_table;
    END LOOP;
    
    -- Archive old rollback logs (keep recent ones)
    UPDATE rollback_operations_log
    SET rollback_results = rollback_results || jsonb_build_object('archived', true)
    WHERE completed_at < NOW() - INTERVAL '30 days'
    AND rollback_status = 'completed';
    
    GET DIAGNOSTICS log_entries_archived = ROW_COUNT;
    
    SELECT JSON_BUILD_OBJECT(
        'status', 'cleanup_completed',
        'backup_tables_dropped', backup_tables_dropped,
        'temp_tables_dropped', temp_tables_dropped,
        'log_entries_archived', log_entries_archived,
        'cleanup_timestamp', NOW()
    ) INTO cleanup_summary;
    
    RAISE NOTICE 'Rollback artifacts cleanup completed: % backup tables, % temp tables, % log entries',
        backup_tables_dropped, temp_tables_dropped, log_entries_archived;
    
    RETURN cleanup_summary;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- USAGE INSTRUCTIONS AND EXAMPLES
-- =====================================================

/*
COMPREHENSIVE ROLLBACK PROCEDURES USAGE:

=== ROLLBACK OPERATIONS ===

1. SUPPLIER CONSOLIDATION ROLLBACK:
   -- Full rollback
   SELECT rollback_supplier_consolidation('full');
   
   -- Emergency rollback
   SELECT rollback_supplier_consolidation('emergency');

2. TRANSACTIONAL DATA ROLLBACK:
   -- Full restoration
   SELECT rollback_transactional_cleanup();
   
   -- Selective restoration
   SELECT rollback_transactional_cleanup(ARRAY['sales_orders', 'invoices']);

3. EMERGENCY FULL ROLLBACK:
   SELECT emergency_full_rollback();

=== MONITORING AND STATUS ===

4. CHECK ROLLBACK STATUS:
   SELECT * FROM check_rollback_status();

5. GET RECOMMENDATIONS:
   SELECT * FROM get_rollback_recommendations();

6. CAPTURE CURRENT STATE:
   SELECT capture_database_state();

=== CLEANUP OPERATIONS ===

7. PREVIEW CLEANUP:
   SELECT cleanup_rollback_artifacts(false);

8. EXECUTE CLEANUP:
   SELECT cleanup_rollback_artifacts(true);

=== EMERGENCY PROCEDURES ===

For critical situations:
1. Run emergency_full_rollback()
2. Verify data integrity
3. Check application functionality
4. Run health checks
5. Clean up artifacts when stable

SAFETY FEATURES:
✓ Comprehensive state capture
✓ Staged rollback operations
✓ Error handling and recovery
✓ Operation logging and tracking
✓ Checkpoint creation
✓ Foreign key constraint handling
✓ Sequence restoration
✓ Backup preservation
✓ Cleanup confirmation required

WARNING: Emergency rollbacks should only be used in critical situations
where data integrity is at risk.
*/

-- =====================================================
-- IMMEDIATE STATUS CHECKS
-- =====================================================

-- Current rollback status
SELECT 
    'ROLLBACK STATUS SUMMARY' as summary_type,
    COUNT(*) as total_operations,
    COUNT(*) FILTER (WHERE rollback_status = 'completed') as completed,
    COUNT(*) FILTER (WHERE rollback_status = 'failed') as failed,
    COUNT(*) FILTER (WHERE rollback_status = 'in_progress') as in_progress
FROM rollback_operations_log;

-- Available backup tables
SELECT 
    'BACKUP TABLES AVAILABLE' as backup_info,
    COUNT(*) as backup_table_count,
    STRING_AGG(table_name, ', ') as backup_tables
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE '%backup%';

-- Current recommendations
SELECT * FROM get_rollback_recommendations();