-- Migration: 0005_integrations.sql
-- Description: Integration and automation tables - connectors, imports, pipelines
-- up

-- Integration enums
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'integration_provider') THEN
        CREATE TYPE integration_provider AS ENUM ('salesforce', 'hubspot', 'zendesk', 'slack', 'microsoft_teams', 'shopify', 'stripe', 'quickbooks', 'mailchimp', 'google_workspace', 'aws', 'azure', 'custom_api', 'webhook', 'csv_upload', 'database');
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'connector_status') THEN
        CREATE TYPE connector_status AS ENUM ('active', 'inactive', 'error', 'configuring', 'authenticating');
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'import_status') THEN
        CREATE TYPE import_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled');
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pipeline_status') THEN
        CREATE TYPE pipeline_status AS ENUM ('active', 'inactive', 'error', 'paused');
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'execution_status') THEN
        CREATE TYPE execution_status AS ENUM ('pending', 'running', 'completed', 'failed', 'cancelled', 'timeout');
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'trigger_type') THEN
        CREATE TYPE trigger_type AS ENUM ('manual', 'schedule', 'webhook', 'file_upload', 'data_change', 'api_call');
    END IF;
END$$;

-- Integration connectors table
CREATE TABLE IF NOT EXISTS integration_connector (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    name text NOT NULL,
    provider integration_provider NOT NULL,
    config jsonb NOT NULL DEFAULT '{}',
    credentials_encrypted text,
    status connector_status DEFAULT 'configuring',
    last_sync_at timestamptz,
    sync_frequency_minutes integer DEFAULT 60,
    error_message text,
    retry_count integer DEFAULT 0,
    max_retries integer DEFAULT 3,
    created_by uuid NOT NULL REFERENCES auth.users_extended(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    CONSTRAINT connector_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 200),
    CONSTRAINT connector_sync_frequency_positive CHECK (sync_frequency_minutes > 0),
    CONSTRAINT connector_retry_count_non_negative CHECK (retry_count >= 0),
    CONSTRAINT connector_max_retries_positive CHECK (max_retries > 0)
);

-- Data imports table (for file uploads and manual imports)
CREATE TABLE IF NOT EXISTS data_import (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    connector_id uuid REFERENCES integration_connector(id) ON DELETE SET NULL,
    file_name text NOT NULL,
    file_size_bytes bigint,
    file_url text,
    target_table text,
    mapping_config jsonb DEFAULT '{}',
    record_count integer DEFAULT 0,
    processed_count integer DEFAULT 0,
    error_count integer DEFAULT 0,
    status import_status DEFAULT 'pending',
    error_log jsonb DEFAULT '[]',
    preview_data jsonb DEFAULT '{}',
    started_at timestamptz,
    completed_at timestamptz,
    created_by uuid NOT NULL REFERENCES auth.users_extended(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    CONSTRAINT import_file_name_not_empty CHECK (char_length(file_name) > 0),
    CONSTRAINT import_file_size_positive CHECK (file_size_bytes IS NULL OR file_size_bytes > 0),
    CONSTRAINT import_counts_non_negative CHECK (record_count >= 0 AND processed_count >= 0 AND error_count >= 0),
    CONSTRAINT import_completed_after_started CHECK (completed_at IS NULL OR started_at IS NULL OR completed_at >= started_at),
    CONSTRAINT import_file_url_format CHECK (file_url IS NULL OR file_url ~ '^https?://')
);

-- Automation pipelines table
CREATE TABLE IF NOT EXISTS automation_pipeline (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    trigger_type trigger_type NOT NULL,
    trigger_config jsonb NOT NULL DEFAULT '{}',
    action_config jsonb NOT NULL DEFAULT '{}',
    status pipeline_status DEFAULT 'inactive',
    execution_count integer DEFAULT 0,
    last_execution_at timestamptz,
    next_execution_at timestamptz,
    error_count integer DEFAULT 0,
    created_by uuid NOT NULL REFERENCES auth.users_extended(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    CONSTRAINT pipeline_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 200),
    CONSTRAINT pipeline_execution_count_non_negative CHECK (execution_count >= 0),
    CONSTRAINT pipeline_error_count_non_negative CHECK (error_count >= 0),
    CONSTRAINT pipeline_next_execution_after_last CHECK (next_execution_at IS NULL OR last_execution_at IS NULL OR next_execution_at >= last_execution_at)
);

-- Pipeline executions table (partitioned by started_at for performance)
CREATE TABLE IF NOT EXISTS pipeline_execution (
    id uuid DEFAULT uuid_generate_v4(),
    pipeline_id uuid NOT NULL REFERENCES automation_pipeline(id) ON DELETE CASCADE,
    status execution_status DEFAULT 'pending',
    trigger_data jsonb DEFAULT '{}',
    execution_data jsonb DEFAULT '{}',
    error_message text,
    records_processed integer DEFAULT 0,
    started_at timestamptz DEFAULT now(),
    completed_at timestamptz,
    duration_ms integer,

    PRIMARY KEY (id, started_at),
    CONSTRAINT execution_records_processed_non_negative CHECK (records_processed >= 0),
    CONSTRAINT execution_completed_after_started CHECK (completed_at IS NULL OR completed_at >= started_at),
    CONSTRAINT execution_duration_positive CHECK (duration_ms IS NULL OR duration_ms >= 0)
) PARTITION BY RANGE (started_at);

-- Create partitions for pipeline_execution (current month and next 6 months)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'pipeline_execution_2024_q4') THEN
        CREATE TABLE pipeline_execution_2024_q4 PARTITION OF pipeline_execution
            FOR VALUES FROM ('2024-10-01') TO ('2025-01-01');
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'pipeline_execution_2025_q1') THEN
        CREATE TABLE pipeline_execution_2025_q1 PARTITION OF pipeline_execution
            FOR VALUES FROM ('2025-01-01') TO ('2025-04-01');
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'pipeline_execution_2025_q2') THEN
        CREATE TABLE pipeline_execution_2025_q2 PARTITION OF pipeline_execution
            FOR VALUES FROM ('2025-04-01') TO ('2025-07-01');
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'pipeline_execution_2025_q3') THEN
        CREATE TABLE pipeline_execution_2025_q3 PARTITION OF pipeline_execution
            FOR VALUES FROM ('2025-07-01') TO ('2025-10-01');
    END IF;
END$$;

-- Integration logs table for debugging and monitoring
CREATE TABLE IF NOT EXISTS integration_log (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    connector_id uuid REFERENCES integration_connector(id) ON DELETE CASCADE,
    pipeline_id uuid REFERENCES automation_pipeline(id) ON DELETE CASCADE,
    import_id uuid REFERENCES data_import(id) ON DELETE CASCADE,
    level text NOT NULL DEFAULT 'info',
    message text NOT NULL,
    metadata jsonb DEFAULT '{}',
    timestamp timestamptz DEFAULT now(),

    CONSTRAINT log_level_valid CHECK (level IN ('debug', 'info', 'warn', 'error', 'fatal')),
    CONSTRAINT log_message_not_empty CHECK (char_length(message) > 0)
);

-- Function to update pipeline execution stats
CREATE OR REPLACE FUNCTION update_pipeline_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE automation_pipeline
        SET
            execution_count = execution_count + 1,
            last_execution_at = NEW.started_at
        WHERE id = NEW.pipeline_id;
    ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status AND NEW.status = 'failed' THEN
        UPDATE automation_pipeline
        SET error_count = error_count + 1
        WHERE id = NEW.pipeline_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Function to calculate execution duration
CREATE OR REPLACE FUNCTION calculate_execution_duration()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.completed_at IS NOT NULL AND NEW.started_at IS NOT NULL THEN
        NEW.duration_ms := EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at)) * 1000;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to schedule next pipeline execution
CREATE OR REPLACE FUNCTION schedule_next_execution()
RETURNS TRIGGER AS $$
DECLARE
    interval_minutes integer;
BEGIN
    -- Only schedule for pipelines with schedule triggers
    IF NEW.trigger_type = 'schedule' AND NEW.status = 'active' THEN
        interval_minutes := (NEW.trigger_config->>'interval_minutes')::integer;
        IF interval_minutes IS NOT NULL AND interval_minutes > 0 THEN
            NEW.next_execution_at := now() + (interval_minutes || ' minutes')::interval;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_integration_connector_updated_at ON integration_connector;
CREATE TRIGGER update_integration_connector_updated_at BEFORE UPDATE ON integration_connector FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_data_import_updated_at ON data_import;
CREATE TRIGGER update_data_import_updated_at BEFORE UPDATE ON data_import FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_automation_pipeline_updated_at ON automation_pipeline;
CREATE TRIGGER update_automation_pipeline_updated_at BEFORE UPDATE ON automation_pipeline FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update pipeline stats
DROP TRIGGER IF EXISTS update_pipeline_stats_trigger ON pipeline_execution;
CREATE TRIGGER update_pipeline_stats_trigger
    AFTER INSERT OR UPDATE ON pipeline_execution
    FOR EACH ROW EXECUTE FUNCTION update_pipeline_stats();

-- Trigger to calculate execution duration
DROP TRIGGER IF EXISTS calculate_execution_duration_trigger ON pipeline_execution;
CREATE TRIGGER calculate_execution_duration_trigger
    BEFORE UPDATE ON pipeline_execution
    FOR EACH ROW EXECUTE FUNCTION calculate_execution_duration();

-- Trigger to schedule next execution
DROP TRIGGER IF EXISTS schedule_next_execution_trigger ON automation_pipeline;
CREATE TRIGGER schedule_next_execution_trigger
    BEFORE INSERT OR UPDATE ON automation_pipeline
    FOR EACH ROW EXECUTE FUNCTION schedule_next_execution();

-- Audit triggers
DROP TRIGGER IF EXISTS audit_integration_connector ON integration_connector;
CREATE TRIGGER audit_integration_connector AFTER INSERT OR UPDATE OR DELETE ON integration_connector FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_data_import ON data_import;
CREATE TRIGGER audit_data_import AFTER INSERT OR UPDATE OR DELETE ON data_import FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_automation_pipeline ON automation_pipeline;
CREATE TRIGGER audit_automation_pipeline AFTER INSERT OR UPDATE OR DELETE ON automation_pipeline FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

INSERT INTO schema_migrations (migration_name)
VALUES ('0005_integrations')
ON CONFLICT (migration_name) DO NOTHING;

-- down

DROP TRIGGER IF EXISTS audit_automation_pipeline ON automation_pipeline;
DROP TRIGGER IF EXISTS audit_data_import ON data_import;
DROP TRIGGER IF EXISTS audit_integration_connector ON integration_connector;
DROP TRIGGER IF EXISTS schedule_next_execution_trigger ON automation_pipeline;
DROP TRIGGER IF EXISTS calculate_execution_duration_trigger ON pipeline_execution;
DROP TRIGGER IF EXISTS update_pipeline_stats_trigger ON pipeline_execution;
DROP TRIGGER IF EXISTS update_automation_pipeline_updated_at ON automation_pipeline;
DROP TRIGGER IF EXISTS update_data_import_updated_at ON data_import;
DROP TRIGGER IF EXISTS update_integration_connector_updated_at ON integration_connector;
DROP FUNCTION IF EXISTS schedule_next_execution();
DROP FUNCTION IF EXISTS calculate_execution_duration();
DROP FUNCTION IF EXISTS update_pipeline_stats();
DROP TABLE IF EXISTS integration_log;
DROP TABLE IF EXISTS pipeline_execution_2025_q3;
DROP TABLE IF EXISTS pipeline_execution_2025_q2;
DROP TABLE IF EXISTS pipeline_execution_2025_q1;
DROP TABLE IF EXISTS pipeline_execution_2024_q4;
DROP TABLE IF EXISTS pipeline_execution;
DROP TABLE IF EXISTS automation_pipeline;
DROP TABLE IF EXISTS data_import;
DROP TABLE IF EXISTS integration_connector;
DROP TYPE IF EXISTS trigger_type;
DROP TYPE IF EXISTS execution_status;
DROP TYPE IF EXISTS pipeline_status;
DROP TYPE IF EXISTS import_status;
DROP TYPE IF EXISTS connector_status;
DROP TYPE IF EXISTS integration_provider;