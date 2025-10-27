-- =====================================================
-- DATABASE SEQUENCE RESET SCRIPT
-- Agent 2: Data Cleanup Specialist for MantisNXT
-- =====================================================
-- Purpose: Reset auto-increment sequences after cleanup operations
-- NOTE: Safe to execute - resets sequences to maintain data integrity
-- =====================================================

-- =====================================================
-- SEQUENCE ANALYSIS AND RESET FUNCTIONS
-- =====================================================

-- Function to analyze current sequence states
CREATE OR REPLACE FUNCTION analyze_sequence_states()
RETURNS TABLE(
    sequence_name TEXT,
    associated_table TEXT,
    current_value BIGINT,
    table_max_id BIGINT,
    table_record_count BIGINT,
    needs_reset BOOLEAN,
    recommended_reset_value BIGINT,
    sequence_status TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH sequence_analysis AS (
        SELECT 
            s.sequencename::TEXT as seq_name,
            CASE 
                WHEN s.sequencename LIKE '%_id_seq' THEN REPLACE(s.sequencename, '_id_seq', '')
                ELSE 'unknown'
            END as table_name,
            s.last_value as current_val
        FROM pg_sequences s
        WHERE s.schemaname = 'public'
    )
    SELECT 
        sa.seq_name,
        sa.table_name,
        sa.current_val,
        COALESCE(
            CASE 
                WHEN EXISTS (
                    SELECT 1 FROM information_schema.tables t
                    WHERE t.table_name = sa.table_name 
                    AND t.table_schema = 'public'
                    AND EXISTS (
                        SELECT 1 FROM information_schema.columns c
                        WHERE c.table_name = sa.table_name
                        AND c.column_name = 'id'
                        AND c.table_schema = 'public'
                    )
                ) THEN (
                    SELECT MAX(id::bigint) 
                    FROM (
                        SELECT CASE 
                            WHEN sa.table_name = 'organizations' THEN (SELECT MAX(id::text::bigint) FROM organizations)
                            WHEN sa.table_name = 'supplier' THEN (SELECT MAX(id::text::bigint) FROM supplier)
                            WHEN sa.table_name = 'customer' THEN (SELECT MAX(id::text::bigint) FROM customers)
                            WHEN sa.table_name = 'inventory_item' THEN (SELECT MAX(id::text::bigint) FROM inventory_item)
                            ELSE NULL
                        END as id
                    ) sub
                    WHERE id IS NOT NULL
                )
                ELSE NULL
            END,
            0
        )::BIGINT as max_id,
        COALESCE(
            CASE 
                WHEN EXISTS (
                    SELECT 1 FROM information_schema.tables t
                    WHERE t.table_name = sa.table_name 
                    AND t.table_schema = 'public'
                ) THEN (
                    CASE sa.table_name
                        WHEN 'organizations' THEN (SELECT COUNT(*)::BIGINT FROM organizations)
                        WHEN 'supplier' THEN (SELECT COUNT(*)::BIGINT FROM supplier)
                        WHEN 'customers' THEN (SELECT COUNT(*)::BIGINT FROM customers)
                        WHEN 'inventory_item' THEN (SELECT COUNT(*)::BIGINT FROM inventory_item)
                        WHEN 'sales_orders' THEN (SELECT COUNT(*)::BIGINT FROM sales_orders)
                        WHEN 'purchase_order' THEN (SELECT COUNT(*)::BIGINT FROM purchase_order)
                        WHEN 'invoices' THEN (SELECT COUNT(*)::BIGINT FROM invoices)
                        WHEN 'quotes' THEN (SELECT COUNT(*)::BIGINT FROM quotes)
                        WHEN 'payments' THEN (SELECT COUNT(*)::BIGINT FROM payments)
                        WHEN 'leads' THEN (SELECT COUNT(*)::BIGINT FROM leads)
                        WHEN 'opportunities' THEN (SELECT COUNT(*)::BIGINT FROM opportunities)
                        WHEN 'activities' THEN (SELECT COUNT(*)::BIGINT FROM activities)
                        ELSE 0
                    END
                )
                ELSE 0
            END,
            0
        )::BIGINT as record_count,
        CASE 
            WHEN sa.table_name = 'unknown' THEN false
            WHEN NOT EXISTS (
                SELECT 1 FROM information_schema.tables t
                WHERE t.table_name = sa.table_name 
                AND t.table_schema = 'public'
            ) THEN false
            ELSE COALESCE(
                sa.current_val < COALESCE(
                    CASE 
                        WHEN sa.table_name = 'organizations' THEN (SELECT MAX(id::text::bigint) FROM organizations)
                        WHEN sa.table_name = 'supplier' THEN (SELECT MAX(id::text::bigint) FROM supplier)
                        WHEN sa.table_name = 'customers' THEN (SELECT MAX(id::text::bigint) FROM customers)
                        WHEN sa.table_name = 'inventory_item' THEN (SELECT MAX(id::text::bigint) FROM inventory_item)
                        ELSE 0
                    END,
                    0
                ) + 1,
                false
            )
        END as needs_reset,
        GREATEST(
            COALESCE(
                CASE 
                    WHEN sa.table_name = 'organizations' THEN (SELECT MAX(id::text::bigint) FROM organizations)
                    WHEN sa.table_name = 'supplier' THEN (SELECT MAX(id::text::bigint) FROM supplier)
                    WHEN sa.table_name = 'customers' THEN (SELECT MAX(id::text::bigint) FROM customers)
                    WHEN sa.table_name = 'inventory_item' THEN (SELECT MAX(id::text::bigint) FROM inventory_item)
                    ELSE 0
                END,
                0
            ) + 1,
            1
        )::BIGINT as recommended_value,
        CASE 
            WHEN sa.table_name = 'unknown' THEN 'UNKNOWN_TABLE'
            WHEN NOT EXISTS (
                SELECT 1 FROM information_schema.tables t
                WHERE t.table_name = sa.table_name 
                AND t.table_schema = 'public'
            ) THEN 'TABLE_NOT_FOUND'
            WHEN COALESCE(
                CASE 
                    WHEN sa.table_name = 'organizations' THEN (SELECT COUNT(*) FROM organizations)
                    WHEN sa.table_name = 'supplier' THEN (SELECT COUNT(*) FROM supplier)
                    WHEN sa.table_name = 'customers' THEN (SELECT COUNT(*) FROM customers)
                    WHEN sa.table_name = 'inventory_item' THEN (SELECT COUNT(*) FROM inventory_item)
                    ELSE 0
                END,
                0
            ) = 0 THEN 'TABLE_EMPTY'
            WHEN sa.current_val < COALESCE(
                CASE 
                    WHEN sa.table_name = 'organizations' THEN (SELECT MAX(id::text::bigint) FROM organizations)
                    WHEN sa.table_name = 'supplier' THEN (SELECT MAX(id::text::bigint) FROM supplier)
                    WHEN sa.table_name = 'customers' THEN (SELECT MAX(id::text::bigint) FROM customers)
                    WHEN sa.table_name = 'inventory_item' THEN (SELECT MAX(id::text::bigint) FROM inventory_item)
                    ELSE 0
                END,
                0
            ) THEN 'NEEDS_RESET'
            ELSE 'SEQUENCE_OK'
        END as status
    FROM sequence_analysis sa
    ORDER BY sa.seq_name;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMPREHENSIVE SEQUENCE RESET FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION reset_all_sequences(dry_run BOOLEAN DEFAULT true)
RETURNS JSON AS $$
DECLARE
    seq_record RECORD;
    reset_summary JSONB := '{}';
    sequences_processed INTEGER := 0;
    sequences_reset INTEGER := 0;
    sequences_skipped INTEGER := 0;
    reset_sql TEXT;
    new_value BIGINT;
BEGIN
    RAISE NOTICE 'Starting comprehensive sequence reset (dry_run: %)', dry_run;
    
    -- Process each sequence that needs attention
    FOR seq_record IN 
        SELECT * FROM analyze_sequence_states()
        WHERE sequence_status IN ('NEEDS_RESET', 'TABLE_EMPTY')
        ORDER BY sequence_name
    LOOP
        sequences_processed := sequences_processed + 1;
        
        -- Determine the reset value
        IF seq_record.sequence_status = 'TABLE_EMPTY' THEN
            new_value := 1;
        ELSE
            new_value := seq_record.recommended_reset_value;
        END IF;
        
        -- Build reset SQL
        reset_sql := format('SELECT setval(''%I'', %s, false)', seq_record.sequence_name, new_value);
        
        IF dry_run THEN
            RAISE NOTICE 'DRY RUN - Would reset sequence %: % → % (table has % records)',
                seq_record.sequence_name, 
                seq_record.current_value, 
                new_value,
                seq_record.table_record_count;
        ELSE
            RAISE NOTICE 'Resetting sequence %: % → %',
                seq_record.sequence_name, 
                seq_record.current_value, 
                new_value;
                
            EXECUTE reset_sql;
            sequences_reset := sequences_reset + 1;
        END IF;
        
        -- Add to summary
        reset_summary := reset_summary || jsonb_build_object(
            seq_record.sequence_name,
            jsonb_build_object(
                'associated_table', seq_record.associated_table,
                'old_value', seq_record.current_value,
                'new_value', new_value,
                'table_max_id', seq_record.table_max_id,
                'table_record_count', seq_record.table_record_count,
                'status', seq_record.sequence_status,
                'action_taken', CASE WHEN dry_run THEN 'dry_run' ELSE 'reset' END
            )
        );
    END LOOP;
    
    -- Handle sequences that don't need reset
    FOR seq_record IN 
        SELECT * FROM analyze_sequence_states()
        WHERE sequence_status = 'SEQUENCE_OK'
        ORDER BY sequence_name
    LOOP
        sequences_processed := sequences_processed + 1;
        sequences_skipped := sequences_skipped + 1;
        
        RAISE NOTICE 'Sequence % is OK (current: %, table_max: %)',
            seq_record.sequence_name, 
            seq_record.current_value,
            seq_record.table_max_id;
            
        reset_summary := reset_summary || jsonb_build_object(
            seq_record.sequence_name,
            jsonb_build_object(
                'associated_table', seq_record.associated_table,
                'current_value', seq_record.current_value,
                'table_max_id', seq_record.table_max_id,
                'status', 'no_reset_needed',
                'action_taken', 'skipped'
            )
        );
    END LOOP;
    
    RAISE NOTICE 'Sequence reset completed: % processed, % reset, % skipped',
        sequences_processed, 
        CASE WHEN dry_run THEN 0 ELSE sequences_reset END, 
        sequences_skipped;
    
    RETURN JSON_BUILD_OBJECT(
        'status', CASE WHEN dry_run THEN 'dry_run_completed' ELSE 'reset_completed' END,
        'dry_run', dry_run,
        'sequences_processed', sequences_processed,
        'sequences_reset', CASE WHEN dry_run THEN 0 ELSE sequences_reset END,
        'sequences_skipped', sequences_skipped,
        'reset_details', reset_summary,
        'execution_timestamp', NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SPECIFIC TABLE SEQUENCE RESET FUNCTIONS
-- =====================================================

-- Function to reset specific table sequence
CREATE OR REPLACE FUNCTION reset_table_sequence(table_name_param TEXT)
RETURNS JSON AS $$
DECLARE
    sequence_name_var TEXT;
    max_id BIGINT;
    current_value BIGINT;
    new_value BIGINT;
    records_count BIGINT;
    reset_result JSON;
BEGIN
    -- Construct sequence name
    sequence_name_var := table_name_param || '_id_seq';
    
    -- Check if sequence exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_sequences 
        WHERE sequencename = sequence_name_var 
        AND schemaname = 'public'
    ) THEN
        RETURN JSON_BUILD_OBJECT(
            'status', 'error',
            'message', format('Sequence %s not found', sequence_name_var)
        );
    END IF;
    
    -- Check if table exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = table_name_param 
        AND table_schema = 'public'
    ) THEN
        RETURN JSON_BUILD_OBJECT(
            'status', 'error',
            'message', format('Table %s not found', table_name_param)
        );
    END IF;
    
    -- Get current sequence value
    EXECUTE format('SELECT last_value FROM %I', sequence_name_var) INTO current_value;
    
    -- Get table statistics
    EXECUTE format('SELECT COUNT(*) FROM %I', table_name_param) INTO records_count;
    
    -- Get max ID (handling UUID vs BIGINT)
    BEGIN
        EXECUTE format('SELECT COALESCE(MAX(id::bigint), 0) FROM %I', table_name_param) INTO max_id;
    EXCEPTION WHEN others THEN
        -- If conversion fails, assume UUIDs and set max_id to record count
        max_id := records_count;
    END;
    
    -- Calculate new value
    new_value := GREATEST(max_id + 1, 1);
    
    -- Reset the sequence
    EXECUTE format('SELECT setval(''%I'', %s, false)', sequence_name_var, new_value);
    
    RETURN JSON_BUILD_OBJECT(
        'status', 'success',
        'table_name', table_name_param,
        'sequence_name', sequence_name_var,
        'records_count', records_count,
        'old_sequence_value', current_value,
        'table_max_id', max_id,
        'new_sequence_value', new_value,
        'reset_timestamp', NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SEQUENCE HEALTH CHECK FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION sequence_health_check()
RETURNS TABLE(
    health_check_item TEXT,
    status TEXT,
    details TEXT,
    recommendation TEXT
) AS $$
BEGIN
    RETURN QUERY
    -- Check for sequences that are behind their table's max ID
    SELECT 
        'Sequences Behind Max ID'::TEXT,
        CASE 
            WHEN COUNT(*) = 0 THEN 'HEALTHY'
            WHEN COUNT(*) <= 2 THEN 'WARNING'
            ELSE 'CRITICAL'
        END::TEXT,
        format('%s sequences are behind their table''s max ID', COUNT(*))::TEXT,
        CASE 
            WHEN COUNT(*) = 0 THEN 'No action needed'
            ELSE 'Run reset_all_sequences() to fix'
        END::TEXT
    FROM analyze_sequence_states()
    WHERE needs_reset = true
    
    UNION ALL
    
    -- Check for empty tables with high sequence values
    SELECT 
        'Empty Tables with High Sequences'::TEXT,
        CASE 
            WHEN COUNT(*) = 0 THEN 'HEALTHY'
            WHEN COUNT(*) <= 3 THEN 'INFO'
            ELSE 'WARNING'
        END::TEXT,
        format('%s empty tables have sequence values > 100', COUNT(*))::TEXT,
        CASE 
            WHEN COUNT(*) = 0 THEN 'No action needed'
            ELSE 'Consider resetting sequences for empty tables'
        END::TEXT
    FROM analyze_sequence_states()
    WHERE table_record_count = 0 AND current_value > 100
    
    UNION ALL
    
    -- Check for sequences with very large gaps
    SELECT 
        'Sequences with Large Gaps'::TEXT,
        CASE 
            WHEN COUNT(*) = 0 THEN 'HEALTHY'
            WHEN COUNT(*) <= 2 THEN 'INFO'
            ELSE 'WARNING'
        END::TEXT,
        format('%s sequences have gaps > 1000 from max ID', COUNT(*))::TEXT,
        'Large gaps may indicate data deletion or import issues'::TEXT
    FROM analyze_sequence_states()
    WHERE current_value - table_max_id > 1000
    
    UNION ALL
    
    -- Overall sequence health summary
    SELECT 
        'Overall Sequence Health'::TEXT,
        CASE 
            WHEN (SELECT COUNT(*) FROM analyze_sequence_states() WHERE needs_reset = true) = 0
            THEN 'HEALTHY'
            ELSE 'NEEDS_ATTENTION'
        END::TEXT,
        format('%s total sequences analyzed, %s need reset', 
            (SELECT COUNT(*) FROM analyze_sequence_states()),
            (SELECT COUNT(*) FROM analyze_sequence_states() WHERE needs_reset = true)
        )::TEXT,
        'Run sequence analysis and reset as needed'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SEQUENCE MAINTENANCE SCHEDULER
-- =====================================================

-- Function to create a maintenance log entry
CREATE OR REPLACE FUNCTION log_sequence_maintenance(operation_type TEXT, results JSON)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    -- Create maintenance log table if it doesn't exist
    CREATE TABLE IF NOT EXISTS sequence_maintenance_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        operation_type TEXT NOT NULL,
        operation_results JSONB NOT NULL,
        performed_by UUID DEFAULT auth.uid(),
        performed_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    INSERT INTO sequence_maintenance_log (operation_type, operation_results)
    VALUES (operation_type, results::JSONB)
    RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- USAGE EXAMPLES AND INSTRUCTIONS
-- =====================================================

/*
SEQUENCE RESET USAGE GUIDE:

1. ANALYZE CURRENT SEQUENCE STATES:
   SELECT * FROM analyze_sequence_states();

2. CHECK SEQUENCE HEALTH:
   SELECT * FROM sequence_health_check();

3. DRY RUN - See what would be reset:
   SELECT reset_all_sequences(true);

4. ACTUAL RESET - Execute the resets:
   SELECT reset_all_sequences(false);

5. RESET SPECIFIC TABLE SEQUENCE:
   SELECT reset_table_sequence('supplier');
   SELECT reset_table_sequence('inventory_item');

6. LOG MAINTENANCE ACTIVITY:
   SELECT log_sequence_maintenance('manual_reset', 
       reset_all_sequences(false));

WHEN TO RESET SEQUENCES:
✓ After bulk data cleanup/truncation
✓ After data import operations
✓ After database restoration
✓ When sequence values are behind max IDs
✓ During database maintenance windows

SAFETY CONSIDERATIONS:
✓ Safe to run on any environment
✓ Does not affect existing data
✓ Only updates sequence counters
✓ Dry run capability for testing
✓ Comprehensive logging available
✓ Individual table reset capability
*/

-- =====================================================
-- IMMEDIATE ANALYSIS QUERIES
-- =====================================================

-- Current sequence state analysis
SELECT 
    'CURRENT SEQUENCE ANALYSIS' as analysis_type,
    sequence_status,
    COUNT(*) as sequence_count
FROM analyze_sequence_states()
GROUP BY sequence_status
ORDER BY sequence_status;

-- Sequences that need immediate attention
SELECT 
    'SEQUENCES NEEDING RESET' as priority,
    sequence_name,
    associated_table,
    current_value,
    table_max_id,
    recommended_reset_value,
    table_record_count
FROM analyze_sequence_states()
WHERE needs_reset = true
ORDER BY sequence_name;

-- Health check summary
SELECT * FROM sequence_health_check();