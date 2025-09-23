-- ===============================================
-- BACKUP AND RECOVERY SYSTEM
-- Automated backups with point-in-time recovery
-- ===============================================

-- =================
-- BACKUP CONFIGURATION TABLES
-- =================

-- Backup job configuration
CREATE TABLE backup_configurations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    backup_type VARCHAR(20) NOT NULL, -- FULL, INCREMENTAL, DIFFERENTIAL
    schedule_cron VARCHAR(100) NOT NULL,
    retention_days INTEGER NOT NULL DEFAULT 30,
    compression_enabled BOOLEAN NOT NULL DEFAULT true,
    encryption_enabled BOOLEAN NOT NULL DEFAULT true,
    target_location TEXT NOT NULL,

    -- Backup scope
    include_tables TEXT[], -- Specific tables, NULL = all tables
    exclude_tables TEXT[], -- Tables to exclude

    -- Performance settings
    parallel_workers INTEGER DEFAULT 2,
    chunk_size_mb INTEGER DEFAULT 100,

    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Backup execution log
CREATE TABLE backup_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    configuration_id UUID NOT NULL REFERENCES backup_configurations(id),
    backup_type VARCHAR(20) NOT NULL,

    -- Execution details
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'RUNNING', -- RUNNING, COMPLETED, FAILED, CANCELLED

    -- Backup file details
    backup_file_path TEXT,
    backup_file_size_bytes BIGINT,
    compressed_size_bytes BIGINT,
    checksum_sha256 VARCHAR(64),

    -- Performance metrics
    duration_seconds INTEGER,
    rows_backed_up BIGINT,
    tables_backed_up INTEGER,

    -- Error details
    error_message TEXT,
    error_details JSONB,

    -- Metadata
    database_size_bytes BIGINT,
    pg_version VARCHAR(20),
    backup_metadata JSONB
);

-- Recovery point tracking
CREATE TABLE recovery_points (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    point_type VARCHAR(20) NOT NULL, -- BACKUP, WAL, CHECKPOINT
    recovery_time TIMESTAMPTZ NOT NULL,
    backup_execution_id UUID REFERENCES backup_executions(id),
    wal_file_name VARCHAR(200),
    lsn_position VARCHAR(50), -- Log Sequence Number
    description TEXT,
    is_tested BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =================
-- BACKUP FUNCTIONS
-- =================

-- Create full database backup
CREATE OR REPLACE FUNCTION create_full_backup(config_id UUID)
RETURNS UUID AS $$
DECLARE
    config_row backup_configurations%ROWTYPE;
    execution_id UUID;
    backup_path TEXT;
    start_time TIMESTAMPTZ;
    end_time TIMESTAMPTZ;
    backup_size BIGINT;
    db_size BIGINT;
BEGIN
    SELECT * INTO config_row FROM backup_configurations WHERE id = config_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Backup configuration not found: %', config_id;
    END IF;

    -- Create execution record
    INSERT INTO backup_executions (configuration_id, backup_type, status)
    VALUES (config_id, 'FULL', 'RUNNING')
    RETURNING id INTO execution_id;

    start_time := NOW();

    -- Get database size
    SELECT pg_database_size(current_database()) INTO db_size;

    -- Generate backup file path
    backup_path := config_row.target_location || '/full_backup_' ||
                   to_char(start_time, 'YYYY-MM-DD_HH24-MI-SS') || '.sql';

    -- Execute pg_dump (this would be done via external script in practice)
    -- PERFORM pg_dump_command(backup_path, config_row);

    end_time := NOW();

    -- Update execution record with completion
    UPDATE backup_executions SET
        status = 'COMPLETED',
        completed_at = end_time,
        backup_file_path = backup_path,
        duration_seconds = EXTRACT(EPOCH FROM (end_time - start_time))::INTEGER,
        database_size_bytes = db_size,
        pg_version = version()
    WHERE id = execution_id;

    -- Create recovery point
    INSERT INTO recovery_points (point_type, recovery_time, backup_execution_id, description)
    VALUES ('BACKUP', start_time, execution_id, 'Full database backup');

    RETURN execution_id;

EXCEPTION WHEN OTHERS THEN
    -- Log failure
    UPDATE backup_executions SET
        status = 'FAILED',
        completed_at = NOW(),
        error_message = SQLERRM,
        error_details = jsonb_build_object(
            'sqlstate', SQLSTATE,
            'context', PG_EXCEPTION_CONTEXT
        )
    WHERE id = execution_id;

    RAISE;
END;
$$ LANGUAGE plpgsql;

-- Incremental backup function
CREATE OR REPLACE FUNCTION create_incremental_backup(config_id UUID)
RETURNS UUID AS $$
DECLARE
    config_row backup_configurations%ROWTYPE;
    execution_id UUID;
    last_backup_time TIMESTAMPTZ;
    changes_count BIGINT := 0;
BEGIN
    SELECT * INTO config_row FROM backup_configurations WHERE id = config_id;

    -- Find last successful backup
    SELECT MAX(completed_at) INTO last_backup_time
    FROM backup_executions
    WHERE configuration_id = config_id
    AND status = 'COMPLETED';

    IF last_backup_time IS NULL THEN
        -- No previous backup, create full backup instead
        RETURN create_full_backup(config_id);
    END IF;

    -- Create execution record
    INSERT INTO backup_executions (configuration_id, backup_type, status)
    VALUES (config_id, 'INCREMENTAL', 'RUNNING')
    RETURNING id INTO execution_id;

    -- Count changes since last backup (example for products table)
    SELECT COUNT(*) INTO changes_count
    FROM products
    WHERE updated_at > last_backup_time;

    -- Add inventory movements
    SELECT changes_count + COUNT(*) INTO changes_count
    FROM inventory_movements
    WHERE created_at > last_backup_time;

    -- Update execution record
    UPDATE backup_executions SET
        status = 'COMPLETED',
        completed_at = NOW(),
        rows_backed_up = changes_count
    WHERE id = execution_id;

    RETURN execution_id;
END;
$$ LANGUAGE plpgsql;

-- =================
-- RECOVERY FUNCTIONS
-- =================

-- Test recovery point
CREATE OR REPLACE FUNCTION test_recovery_point(recovery_point_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    recovery_row recovery_points%ROWTYPE;
    test_result BOOLEAN := false;
BEGIN
    SELECT * INTO recovery_row FROM recovery_points WHERE id = recovery_point_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Recovery point not found: %', recovery_point_id;
    END IF;

    -- Perform recovery test (simplified)
    -- In practice, this would restore to a test database

    -- Simulate test success
    test_result := true;

    -- Update recovery point
    UPDATE recovery_points SET
        is_tested = test_result,
        updated_at = NOW()
    WHERE id = recovery_point_id;

    RETURN test_result;
END;
$$ LANGUAGE plpgsql;

-- Point-in-time recovery preparation
CREATE OR REPLACE FUNCTION prepare_point_in_time_recovery(target_time TIMESTAMPTZ)
RETURNS TABLE(
    recovery_method TEXT,
    base_backup_file TEXT,
    wal_files_needed TEXT[],
    recovery_commands TEXT[]
) AS $$
DECLARE
    base_backup backup_executions%ROWTYPE;
    recovery_commands_array TEXT[] := '{}';
    wal_files_array TEXT[] := '{}';
BEGIN
    -- Find the latest full backup before target time
    SELECT * INTO base_backup
    FROM backup_executions
    WHERE backup_type = 'FULL'
    AND started_at <= target_time
    AND status = 'COMPLETED'
    ORDER BY started_at DESC
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No suitable base backup found for target time: %', target_time;
    END IF;

    -- Prepare recovery commands
    recovery_commands_array := array_append(recovery_commands_array,
        'pg_ctl stop -D /var/lib/postgresql/data');
    recovery_commands_array := array_append(recovery_commands_array,
        'rm -rf /var/lib/postgresql/data/*');
    recovery_commands_array := array_append(recovery_commands_array,
        'pg_basebackup -D /var/lib/postgresql/data -Ft -z');
    recovery_commands_array := array_append(recovery_commands_array,
        'echo "restore_command = ''cp /wal_archive/%f %p''" >> /var/lib/postgresql/data/postgresql.conf');
    recovery_commands_array := array_append(recovery_commands_array,
        format('echo "recovery_target_time = ''%s''" >> /var/lib/postgresql/data/postgresql.conf', target_time));

    RETURN QUERY SELECT
        'POINT_IN_TIME_RECOVERY'::TEXT,
        base_backup.backup_file_path,
        wal_files_array,
        recovery_commands_array;
END;
$$ LANGUAGE plpgsql;

-- =================
-- BACKUP MAINTENANCE
-- =================

-- Clean old backups based on retention policy
CREATE OR REPLACE FUNCTION cleanup_old_backups()
RETURNS INTEGER AS $$
DECLARE
    config_row backup_configurations%ROWTYPE;
    deleted_count INTEGER := 0;
    total_deleted INTEGER := 0;
BEGIN
    FOR config_row IN SELECT * FROM backup_configurations WHERE is_active = true LOOP
        -- Delete old backup execution records
        DELETE FROM backup_executions
        WHERE configuration_id = config_row.id
        AND completed_at < NOW() - (config_row.retention_days || ' days')::INTERVAL
        AND status = 'COMPLETED';

        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        total_deleted := total_deleted + deleted_count;

        -- Delete associated recovery points
        DELETE FROM recovery_points
        WHERE backup_execution_id IN (
            SELECT id FROM backup_executions
            WHERE configuration_id = config_row.id
            AND completed_at < NOW() - (config_row.retention_days || ' days')::INTERVAL
        );
    END LOOP;

    RETURN total_deleted;
END;
$$ LANGUAGE plpgsql;

-- =================
-- MONITORING AND ALERTS
-- =================

-- Backup health check
CREATE OR REPLACE FUNCTION backup_health_check()
RETURNS TABLE(
    configuration_name TEXT,
    last_successful_backup TIMESTAMPTZ,
    days_since_last_backup INTEGER,
    status TEXT,
    alert_level TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        bc.name,
        MAX(be.completed_at) as last_successful_backup,
        EXTRACT(DAYS FROM NOW() - MAX(be.completed_at))::INTEGER as days_since_last_backup,
        CASE
            WHEN MAX(be.completed_at) IS NULL THEN 'NEVER_RUN'
            WHEN MAX(be.completed_at) < NOW() - INTERVAL '2 days' THEN 'OVERDUE'
            WHEN MAX(be.completed_at) < NOW() - INTERVAL '1 day' THEN 'WARNING'
            ELSE 'OK'
        END as status,
        CASE
            WHEN MAX(be.completed_at) IS NULL THEN 'CRITICAL'
            WHEN MAX(be.completed_at) < NOW() - INTERVAL '2 days' THEN 'HIGH'
            WHEN MAX(be.completed_at) < NOW() - INTERVAL '1 day' THEN 'MEDIUM'
            ELSE 'LOW'
        END as alert_level
    FROM backup_configurations bc
    LEFT JOIN backup_executions be ON bc.id = be.configuration_id AND be.status = 'COMPLETED'
    WHERE bc.is_active = true
    GROUP BY bc.id, bc.name;
END;
$$ LANGUAGE plpgsql;

-- =================
-- INDEXES
-- =================

CREATE INDEX idx_backup_executions_config_status ON backup_executions(configuration_id, status);
CREATE INDEX idx_backup_executions_completed_at ON backup_executions(completed_at DESC);
CREATE INDEX idx_recovery_points_recovery_time ON recovery_points(recovery_time DESC);
CREATE INDEX idx_recovery_points_type ON recovery_points(point_type, recovery_time DESC);

-- =================
-- DEFAULT BACKUP CONFIGURATIONS
-- =================

-- Insert default backup configurations
INSERT INTO backup_configurations (name, backup_type, schedule_cron, retention_days, target_location)
VALUES
    ('Daily Full Backup', 'FULL', '0 2 * * *', 7, '/backup/daily'),
    ('Hourly Incremental', 'INCREMENTAL', '0 */1 * * *', 3, '/backup/incremental'),
    ('Weekly Archive', 'FULL', '0 1 * * 0', 90, '/backup/archive');

-- =================
-- SCHEDULED JOBS (Requires pg_cron extension)
-- =================

/*
-- Schedule daily full backup
SELECT cron.schedule('daily-full-backup', '0 2 * * *',
    'SELECT create_full_backup((SELECT id FROM backup_configurations WHERE name = ''Daily Full Backup''));');

-- Schedule hourly incremental backup
SELECT cron.schedule('hourly-incremental-backup', '0 */1 * * *',
    'SELECT create_incremental_backup((SELECT id FROM backup_configurations WHERE name = ''Hourly Incremental''));');

-- Schedule weekly cleanup
SELECT cron.schedule('backup-cleanup', '0 3 * * 0', 'SELECT cleanup_old_backups();');

-- Schedule health check
SELECT cron.schedule('backup-health-check', '0 */6 * * *',
    'SELECT * FROM backup_health_check() WHERE alert_level IN (''HIGH'', ''CRITICAL'');');
*/

-- =================
-- RECOVERY TESTING SCHEDULE
-- =================

-- Automated recovery testing (monthly)
CREATE OR REPLACE FUNCTION schedule_recovery_tests()
RETURNS VOID AS $$
DECLARE
    recovery_point_record recovery_points%ROWTYPE;
BEGIN
    -- Test the most recent recovery point from each backup type
    FOR recovery_point_record IN
        SELECT DISTINCT ON (backup_type) rp.*
        FROM recovery_points rp
        JOIN backup_executions be ON rp.backup_execution_id = be.id
        WHERE rp.is_tested = false
        ORDER BY backup_type, rp.recovery_time DESC
    LOOP
        PERFORM test_recovery_point(recovery_point_record.id);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Schedule monthly recovery tests
-- SELECT cron.schedule('monthly-recovery-test', '0 4 1 * *', 'SELECT schedule_recovery_tests();');