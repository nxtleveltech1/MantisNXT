-- =====================================================
-- PRICELIST UPLOAD SYSTEM MIGRATION
-- Adds tables and functions for pricelist upload workflow
-- =====================================================

-- Upload session tracking table
CREATE TABLE IF NOT EXISTS pricelist_upload_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id uuid NOT NULL REFERENCES supplier(id) ON DELETE CASCADE,
    filename text NOT NULL,
    file_size integer NOT NULL,
    total_records integer NOT NULL,
    processed_records integer DEFAULT 0,
    successful_records integer DEFAULT 0,
    failed_records integer DEFAULT 0,
    status text NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed', 'cancelled')),
    upload_options jsonb DEFAULT '{}',
    validation_summary jsonb DEFAULT '{}',
    error_summary jsonb DEFAULT '{}',
    backup_id uuid,
    started_at timestamptz DEFAULT now(),
    completed_at timestamptz,
    created_by uuid NOT NULL,
    CONSTRAINT valid_record_counts CHECK (
        processed_records <= total_records AND
        successful_records + failed_records <= processed_records
    )
);

-- Upload session progress tracking
CREATE TABLE IF NOT EXISTS pricelist_upload_progress (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id uuid NOT NULL REFERENCES pricelist_upload_sessions(id) ON DELETE CASCADE,
    stage text NOT NULL,
    progress_percentage integer NOT NULL DEFAULT 0,
    current_record integer DEFAULT 0,
    message text,
    details jsonb DEFAULT '{}',
    timestamp timestamptz DEFAULT now(),
    CONSTRAINT valid_progress CHECK (progress_percentage >= 0 AND progress_percentage <= 100)
);

-- Backup records for rollback capability
CREATE TABLE IF NOT EXISTS pricelist_backup_records (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    backup_id uuid NOT NULL,
    table_name text NOT NULL,
    record_id uuid NOT NULL,
    operation text NOT NULL CHECK (operation IN ('CREATE', 'UPDATE', 'DELETE')),
    old_data jsonb,
    new_data jsonb,
    created_at timestamptz DEFAULT now(),
    INDEX idx_backup_records_backup_id (backup_id),
    INDEX idx_backup_records_table_record (table_name, record_id)
);

-- Validation errors tracking
CREATE TABLE IF NOT EXISTS pricelist_validation_errors (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id uuid NOT NULL REFERENCES pricelist_upload_sessions(id) ON DELETE CASCADE,
    row_number integer NOT NULL,
    field_name text,
    error_type text NOT NULL,
    error_message text NOT NULL,
    raw_value text,
    suggested_value text,
    severity text DEFAULT 'error' CHECK (severity IN ('error', 'warning', 'info')),
    created_at timestamptz DEFAULT now()
);

-- Conflict resolution records
CREATE TABLE IF NOT EXISTS pricelist_conflicts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id uuid NOT NULL REFERENCES pricelist_upload_sessions(id) ON DELETE CASCADE,
    conflict_type text NOT NULL CHECK (conflict_type IN ('duplicate_sku', 'price_variance', 'supplier_mismatch', 'category_conflict')),
    existing_record_id uuid,
    incoming_data jsonb NOT NULL,
    existing_data jsonb,
    resolution_strategy text CHECK (resolution_strategy IN ('skip', 'update', 'merge', 'create_variant')),
    resolved_at timestamptz,
    created_at timestamptz DEFAULT now()
);

-- =====================================================
-- STORED PROCEDURES FOR PRICELIST OPERATIONS
-- =====================================================

-- Initialize upload session
CREATE OR REPLACE FUNCTION initialize_pricelist_upload_session(
    p_supplier_id uuid,
    p_filename text,
    p_file_size integer,
    p_total_records integer,
    p_upload_options jsonb DEFAULT '{}',
    p_created_by uuid DEFAULT auth.uid()
) RETURNS uuid AS $$
DECLARE
    session_id uuid;
BEGIN
    INSERT INTO pricelist_upload_sessions (
        supplier_id, filename, file_size, total_records,
        upload_options, created_by
    ) VALUES (
        p_supplier_id, p_filename, p_file_size, p_total_records,
        p_upload_options, p_created_by
    ) RETURNING id INTO session_id;

    -- Initialize progress tracking
    INSERT INTO pricelist_upload_progress (
        session_id, stage, progress_percentage, message
    ) VALUES (
        session_id, 'initialization', 0, 'Upload session initialized'
    );

    RETURN session_id;
END;
$$ LANGUAGE plpgsql;

-- Update session progress
CREATE OR REPLACE FUNCTION update_upload_progress(
    p_session_id uuid,
    p_stage text,
    p_progress integer,
    p_current_record integer DEFAULT NULL,
    p_message text DEFAULT NULL,
    p_details jsonb DEFAULT '{}'
) RETURNS void AS $$
BEGIN
    INSERT INTO pricelist_upload_progress (
        session_id, stage, progress_percentage, current_record, message, details
    ) VALUES (
        p_session_id, p_stage, p_progress, p_current_record, p_message, p_details
    );

    -- Update session summary
    UPDATE pricelist_upload_sessions
    SET processed_records = COALESCE(p_current_record, processed_records)
    WHERE id = p_session_id;
END;
$$ LANGUAGE plpgsql;

-- Create backup record for rollback
CREATE OR REPLACE FUNCTION create_backup_record(
    p_backup_id uuid,
    p_table_name text,
    p_record_id uuid,
    p_operation text,
    p_old_data jsonb DEFAULT NULL,
    p_new_data jsonb DEFAULT NULL
) RETURNS void AS $$
BEGIN
    INSERT INTO pricelist_backup_records (
        backup_id, table_name, record_id, operation, old_data, new_data
    ) VALUES (
        p_backup_id, p_table_name, p_record_id, p_operation, p_old_data, p_new_data
    );
END;
$$ LANGUAGE plpgsql;

-- Rollback pricelist import
CREATE OR REPLACE FUNCTION rollback_pricelist_import(
    p_backup_id uuid
) RETURNS jsonb AS $$
DECLARE
    backup_record RECORD;
    rollback_count integer := 0;
    error_count integer := 0;
    result jsonb;
BEGIN
    -- Process rollback records in reverse chronological order
    FOR backup_record IN
        SELECT * FROM pricelist_backup_records
        WHERE backup_id = p_backup_id
        ORDER BY created_at DESC
    LOOP
        BEGIN
            CASE backup_record.operation
                WHEN 'CREATE' THEN
                    -- Delete the created record
                    EXECUTE format('DELETE FROM %I WHERE id = $1', backup_record.table_name)
                    USING backup_record.record_id;

                WHEN 'UPDATE' THEN
                    -- Restore the old data
                    IF backup_record.table_name = 'inventory_item' THEN
                        UPDATE inventory_item SET
                            name = (backup_record.old_data->>'name'),
                            description = (backup_record.old_data->>'description'),
                            category = (backup_record.old_data->>'category')::inventory_category,
                            unit_cost = (backup_record.old_data->>'unit_cost')::numeric,
                            selling_price = (backup_record.old_data->>'selling_price')::numeric,
                            updated_at = now()
                        WHERE id = backup_record.record_id;
                    ELSIF backup_record.table_name = 'supplier_product' THEN
                        UPDATE supplier_product SET
                            supplier_sku = (backup_record.old_data->>'supplier_sku'),
                            supplier_name = (backup_record.old_data->>'supplier_name'),
                            cost_price = (backup_record.old_data->>'cost_price')::numeric,
                            updated_at = now()
                        WHERE id = backup_record.record_id;
                    END IF;

                WHEN 'DELETE' THEN
                    -- Restore the deleted record
                    IF backup_record.table_name = 'inventory_item' THEN
                        INSERT INTO inventory_item (
                            id, org_id, name, description, category,
                            unit_cost, selling_price, created_at
                        ) VALUES (
                            backup_record.record_id,
                            (backup_record.old_data->>'org_id')::uuid,
                            (backup_record.old_data->>'name'),
                            (backup_record.old_data->>'description'),
                            (backup_record.old_data->>'category')::inventory_category,
                            (backup_record.old_data->>'unit_cost')::numeric,
                            (backup_record.old_data->>'selling_price')::numeric,
                            (backup_record.old_data->>'created_at')::timestamptz
                        );
                    END IF;
            END CASE;

            rollback_count := rollback_count + 1;

        EXCEPTION WHEN OTHERS THEN
            error_count := error_count + 1;
            -- Log error but continue with rollback
            RAISE WARNING 'Error rolling back record %: %', backup_record.id, SQLERRM;
        END;
    END LOOP;

    -- Delete backup records after successful rollback
    DELETE FROM pricelist_backup_records WHERE backup_id = p_backup_id;

    result := jsonb_build_object(
        'success', true,
        'rolledback_records', rollback_count,
        'error_count', error_count,
        'backup_id', p_backup_id
    );

    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Complete upload session
CREATE OR REPLACE FUNCTION complete_upload_session(
    p_session_id uuid,
    p_successful_records integer,
    p_failed_records integer,
    p_validation_summary jsonb DEFAULT '{}',
    p_error_summary jsonb DEFAULT '{}'
) RETURNS void AS $$
BEGIN
    UPDATE pricelist_upload_sessions SET
        successful_records = p_successful_records,
        failed_records = p_failed_records,
        processed_records = p_successful_records + p_failed_records,
        validation_summary = p_validation_summary,
        error_summary = p_error_summary,
        status = CASE
            WHEN p_failed_records = 0 THEN 'completed'
            WHEN p_successful_records = 0 THEN 'failed'
            ELSE 'completed'
        END,
        completed_at = now()
    WHERE id = p_session_id;

    -- Final progress update
    INSERT INTO pricelist_upload_progress (
        session_id, stage, progress_percentage, message
    ) VALUES (
        p_session_id, 'completed', 100,
        format('Upload completed: %s successful, %s failed', p_successful_records, p_failed_records)
    );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PERFORMANCE INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_upload_sessions_supplier_status
    ON pricelist_upload_sessions(supplier_id, status);

CREATE INDEX IF NOT EXISTS idx_upload_sessions_created_by
    ON pricelist_upload_sessions(created_by, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_upload_progress_session_timestamp
    ON pricelist_upload_progress(session_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_validation_errors_session
    ON pricelist_validation_errors(session_id, severity, row_number);

CREATE INDEX IF NOT EXISTS idx_conflicts_session_type
    ON pricelist_conflicts(session_id, conflict_type, created_at);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all upload tables
ALTER TABLE pricelist_upload_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricelist_upload_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricelist_backup_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricelist_validation_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricelist_conflicts ENABLE ROW LEVEL SECURITY;

-- RLS policies for organization-based access
CREATE POLICY upload_sessions_org_policy ON pricelist_upload_sessions
    USING (
        supplier_id IN (
            SELECT id FROM supplier
            WHERE org_id IN (
                SELECT id FROM organization
                WHERE id = (current_setting('app.org_id', true))::uuid
            )
        )
    );

CREATE POLICY upload_progress_org_policy ON pricelist_upload_progress
    USING (
        session_id IN (
            SELECT id FROM pricelist_upload_sessions
            WHERE supplier_id IN (
                SELECT id FROM supplier
                WHERE org_id = (current_setting('app.org_id', true))::uuid
            )
        )
    );

-- Similar policies for other tables
CREATE POLICY validation_errors_org_policy ON pricelist_validation_errors
    USING (
        session_id IN (
            SELECT id FROM pricelist_upload_sessions
            WHERE supplier_id IN (
                SELECT id FROM supplier
                WHERE org_id = (current_setting('app.org_id', true))::uuid
            )
        )
    );

CREATE POLICY conflicts_org_policy ON pricelist_conflicts
    USING (
        session_id IN (
            SELECT id FROM pricelist_upload_sessions
            WHERE supplier_id IN (
                SELECT id FROM supplier
                WHERE org_id = (current_setting('app.org_id', true))::uuid
            )
        )
    );

-- Backup records accessible to session creators only
CREATE POLICY backup_records_creator_policy ON pricelist_backup_records
    USING (
        backup_id IN (
            SELECT backup_id FROM pricelist_upload_sessions
            WHERE created_by = auth.uid()
        )
    );

-- =====================================================
-- AUDIT TRIGGERS
-- =====================================================

-- Audit function for upload operations
CREATE OR REPLACE FUNCTION audit_upload_operation()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_log (
        user_id, action, table_name, record_id,
        old_data, new_data, timestamp
    ) VALUES (
        auth.uid(),
        TG_OP::audit_action,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        CASE WHEN TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN to_jsonb(NEW) ELSE NULL END,
        now()
    );

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers to upload tables
CREATE TRIGGER audit_upload_sessions_trigger
    AFTER INSERT OR UPDATE OR DELETE ON pricelist_upload_sessions
    FOR EACH ROW EXECUTE FUNCTION audit_upload_operation();

CREATE TRIGGER audit_conflicts_trigger
    AFTER INSERT OR UPDATE OR DELETE ON pricelist_conflicts
    FOR EACH ROW EXECUTE FUNCTION audit_upload_operation();

-- =====================================================
-- CLEANUP PROCEDURES
-- =====================================================

-- Clean up old upload sessions and related data
CREATE OR REPLACE FUNCTION cleanup_old_upload_sessions(
    p_days_to_keep integer DEFAULT 30
) RETURNS jsonb AS $$
DECLARE
    deleted_sessions integer := 0;
    deleted_progress integer := 0;
    deleted_errors integer := 0;
    deleted_conflicts integer := 0;
    deleted_backups integer := 0;
    cutoff_date timestamptz;
BEGIN
    cutoff_date := now() - (p_days_to_keep || ' days')::interval;

    -- Delete related records first (foreign key constraints)
    DELETE FROM pricelist_validation_errors
    WHERE session_id IN (
        SELECT id FROM pricelist_upload_sessions
        WHERE completed_at < cutoff_date
    );
    GET DIAGNOSTICS deleted_errors = ROW_COUNT;

    DELETE FROM pricelist_conflicts
    WHERE session_id IN (
        SELECT id FROM pricelist_upload_sessions
        WHERE completed_at < cutoff_date
    );
    GET DIAGNOSTICS deleted_conflicts = ROW_COUNT;

    DELETE FROM pricelist_upload_progress
    WHERE session_id IN (
        SELECT id FROM pricelist_upload_sessions
        WHERE completed_at < cutoff_date
    );
    GET DIAGNOSTICS deleted_progress = ROW_COUNT;

    DELETE FROM pricelist_backup_records
    WHERE backup_id IN (
        SELECT backup_id FROM pricelist_upload_sessions
        WHERE completed_at < cutoff_date AND backup_id IS NOT NULL
    );
    GET DIAGNOSTICS deleted_backups = ROW_COUNT;

    -- Finally delete sessions
    DELETE FROM pricelist_upload_sessions
    WHERE completed_at < cutoff_date;
    GET DIAGNOSTICS deleted_sessions = ROW_COUNT;

    RETURN jsonb_build_object(
        'deleted_sessions', deleted_sessions,
        'deleted_progress', deleted_progress,
        'deleted_errors', deleted_errors,
        'deleted_conflicts', deleted_conflicts,
        'deleted_backups', deleted_backups,
        'cutoff_date', cutoff_date
    );
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;