-- Migration: 0206_ecommerce_integrations.sql
-- Description: Production-ready WooCommerce and Odoo ERP integrations
-- Dependencies: 0005_integrations.sql
-- up

-- Extend integration_provider enum to include WooCommerce and Odoo
ALTER TYPE integration_provider ADD VALUE IF NOT EXISTS 'woocommerce';
ALTER TYPE integration_provider ADD VALUE IF NOT EXISTS 'odoo';

-- Sync direction enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sync_direction') THEN
        CREATE TYPE sync_direction AS ENUM ('inbound', 'outbound', 'bidirectional');
    END IF;
END
$$;

-- Sync status enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sync_status') THEN
        CREATE TYPE sync_status AS ENUM ('pending', 'in_progress', 'completed', 'failed', 'partial', 'conflict');
    END IF;
END
$$;

-- Entity type enum for mappings
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'entity_type') THEN
        CREATE TYPE entity_type AS ENUM (
            'product',
            'customer',
            'order',
            'supplier',
            'inventory',
            'category',
            'payment',
            'shipment',
            'invoice',
            'purchase_order'
        );
    END IF;
END
$$;

-- Drop legacy tables to ensure clean re-creation
DROP TABLE IF EXISTS sync_conflict CASCADE;
DROP TABLE IF EXISTS integration_webhook CASCADE;
DROP TABLE IF EXISTS sync_log CASCADE;
DROP TABLE IF EXISTS integration_mapping CASCADE;
DROP TABLE IF EXISTS odoo_sync CASCADE;
DROP TABLE IF EXISTS woocommerce_sync CASCADE;

-- WooCommerce sync state table
CREATE TABLE woocommerce_sync (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    connector_id uuid NOT NULL REFERENCES integration_connector(id) ON DELETE CASCADE,
    entity_type entity_type NOT NULL,
    entity_id uuid NOT NULL, -- Local MantisNXT entity ID
    external_id text NOT NULL, -- WooCommerce ID
    direction sync_direction NOT NULL,
    last_sync_at timestamptz,
    last_sync_status sync_status DEFAULT 'pending',
    sync_data jsonb DEFAULT '{}', -- Store entity snapshot for conflict detection
    sync_hash text, -- Hash of sync_data for quick comparison
    error_message text,
    retry_count integer DEFAULT 0,
    metadata jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    CONSTRAINT woocommerce_sync_external_id_check CHECK (char_length(external_id) > 0),
    CONSTRAINT woocommerce_sync_retry_count_non_negative CHECK (retry_count >= 0),
    CONSTRAINT woocommerce_sync_unique_mapping UNIQUE (connector_id, entity_type, entity_id),
    CONSTRAINT woocommerce_sync_unique_external UNIQUE (connector_id, entity_type, external_id)
);

-- Odoo sync state table
CREATE TABLE odoo_sync (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    connector_id uuid NOT NULL REFERENCES integration_connector(id) ON DELETE CASCADE,
    entity_type entity_type NOT NULL,
    entity_id uuid NOT NULL, -- Local MantisNXT entity ID
    external_id integer NOT NULL, -- Odoo uses integer IDs
    odoo_model text NOT NULL, -- Odoo model name (e.g., 'product.template', 'res.partner')
    direction sync_direction NOT NULL,
    last_sync_at timestamptz,
    last_sync_status sync_status DEFAULT 'pending',
    sync_data jsonb DEFAULT '{}',
    sync_hash text,
    error_message text,
    retry_count integer DEFAULT 0,
    metadata jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    CONSTRAINT odoo_sync_external_id_positive CHECK (external_id > 0),
    CONSTRAINT odoo_sync_retry_count_non_negative CHECK (retry_count >= 0),
    CONSTRAINT odoo_sync_model_not_empty CHECK (char_length(odoo_model) > 0),
    CONSTRAINT odoo_sync_unique_mapping UNIQUE (connector_id, entity_type, entity_id),
    CONSTRAINT odoo_sync_unique_external UNIQUE (connector_id, odoo_model, external_id)
);

-- Generic integration mapping table for flexible ID mapping
CREATE TABLE integration_mapping (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    connector_id uuid NOT NULL REFERENCES integration_connector(id) ON DELETE CASCADE,
    entity_type entity_type NOT NULL,
    internal_id uuid NOT NULL, -- MantisNXT entity ID
    external_id text NOT NULL, -- External system ID (string for flexibility)
    external_model text, -- For systems like Odoo that use model names
    mapping_data jsonb DEFAULT '{}', -- Additional mapping metadata
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    CONSTRAINT integration_mapping_external_id_check CHECK (char_length(external_id) > 0),
    CONSTRAINT integration_mapping_unique UNIQUE (connector_id, entity_type, internal_id)
);

-- Sync logs table (partitioned for performance)
CREATE TABLE sync_log (
    id uuid DEFAULT uuid_generate_v4(),
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    connector_id uuid NOT NULL REFERENCES integration_connector(id) ON DELETE CASCADE,
    entity_type entity_type NOT NULL,
    entity_id uuid,
    external_id text,
    sync_direction sync_direction NOT NULL,
    sync_status sync_status NOT NULL,
    operation text NOT NULL, -- 'create', 'update', 'delete', 'read'
    records_affected integer DEFAULT 0,
    error_details jsonb,
    request_payload jsonb,
    response_payload jsonb,
    duration_ms integer,
    started_at timestamptz DEFAULT now(),
    completed_at timestamptz,

    PRIMARY KEY (id, started_at),
    CONSTRAINT sync_log_operation_valid CHECK (operation IN ('create', 'update', 'delete', 'read', 'sync')),
    CONSTRAINT sync_log_records_non_negative CHECK (records_affected >= 0),
    CONSTRAINT sync_log_duration_positive CHECK (duration_ms IS NULL OR duration_ms >= 0),
    CONSTRAINT sync_log_completed_after_started CHECK (completed_at IS NULL OR completed_at >= started_at)
) PARTITION BY RANGE (started_at);

-- Create partitions for sync_log (quarterly partitions)
CREATE TABLE sync_log_2024_q4 PARTITION OF sync_log
    FOR VALUES FROM ('2024-10-01') TO ('2025-01-01');
CREATE TABLE sync_log_2025_q1 PARTITION OF sync_log
    FOR VALUES FROM ('2025-01-01') TO ('2025-04-01');
CREATE TABLE sync_log_2025_q2 PARTITION OF sync_log
    FOR VALUES FROM ('2025-04-01') TO ('2025-07-01');
CREATE TABLE sync_log_2025_q3 PARTITION OF sync_log
    FOR VALUES FROM ('2025-07-01') TO ('2025-10-01');

-- Webhook registrations table
CREATE TABLE integration_webhook (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    connector_id uuid NOT NULL REFERENCES integration_connector(id) ON DELETE CASCADE,
    webhook_url text NOT NULL,
    external_webhook_id text, -- ID from external system
    event_types text[] NOT NULL, -- Array of events this webhook handles
    secret text NOT NULL, -- For signature validation
    is_active boolean DEFAULT true,
    last_triggered_at timestamptz,
    trigger_count integer DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    CONSTRAINT webhook_url_format CHECK (webhook_url ~ '^https?://'),
    CONSTRAINT webhook_event_types_not_empty CHECK (array_length(event_types, 1) > 0),
    CONSTRAINT webhook_secret_not_empty CHECK (char_length(secret) >= 16),
    CONSTRAINT webhook_trigger_count_non_negative CHECK (trigger_count >= 0)
);

-- Sync conflicts table for conflict resolution
CREATE TABLE sync_conflict (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    connector_id uuid NOT NULL REFERENCES integration_connector(id) ON DELETE CASCADE,
    entity_type entity_type NOT NULL,
    entity_id uuid NOT NULL,
    external_id text NOT NULL,
    conflict_type text NOT NULL, -- 'data_mismatch', 'version_conflict', 'deletion_conflict'
    local_data jsonb NOT NULL,
    remote_data jsonb NOT NULL,
    resolution_strategy text, -- 'manual', 'local_wins', 'remote_wins', 'merge'
    is_resolved boolean DEFAULT false,
    resolved_at timestamptz,
    resolved_by uuid REFERENCES auth.users_extended(id) ON DELETE SET NULL,
    resolution_data jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    CONSTRAINT conflict_type_valid CHECK (conflict_type IN ('data_mismatch', 'version_conflict', 'deletion_conflict', 'duplicate')),
    CONSTRAINT conflict_resolution_strategy_valid CHECK (
        resolution_strategy IS NULL OR
        resolution_strategy IN ('manual', 'local_wins', 'remote_wins', 'merge', 'skip')
    )
);

-- Indexes for WooCommerce sync
CREATE INDEX idx_woocommerce_sync_org ON woocommerce_sync(org_id);
CREATE INDEX idx_woocommerce_sync_connector ON woocommerce_sync(connector_id);
CREATE INDEX idx_woocommerce_sync_entity ON woocommerce_sync(entity_type, entity_id);
CREATE INDEX idx_woocommerce_sync_external ON woocommerce_sync(external_id);
CREATE INDEX idx_woocommerce_sync_status ON woocommerce_sync(last_sync_status) WHERE last_sync_status IN ('failed', 'pending');
CREATE INDEX idx_woocommerce_sync_updated ON woocommerce_sync(updated_at DESC);

-- Indexes for Odoo sync
CREATE INDEX idx_odoo_sync_org ON odoo_sync(org_id);
CREATE INDEX idx_odoo_sync_connector ON odoo_sync(connector_id);
CREATE INDEX idx_odoo_sync_entity ON odoo_sync(entity_type, entity_id);
CREATE INDEX idx_odoo_sync_external ON odoo_sync(odoo_model, external_id);
CREATE INDEX idx_odoo_sync_status ON odoo_sync(last_sync_status) WHERE last_sync_status IN ('failed', 'pending');
CREATE INDEX idx_odoo_sync_updated ON odoo_sync(updated_at DESC);

-- Indexes for integration mapping
CREATE INDEX idx_integration_mapping_org ON integration_mapping(org_id);
CREATE INDEX idx_integration_mapping_connector ON integration_mapping(connector_id);
CREATE INDEX idx_integration_mapping_entity ON integration_mapping(entity_type, internal_id);
CREATE INDEX idx_integration_mapping_external ON integration_mapping(external_id);
CREATE INDEX idx_integration_mapping_active ON integration_mapping(is_active) WHERE is_active = true;

-- Indexes for sync log (on each partition)
CREATE INDEX idx_sync_log_2024_q4_org ON sync_log_2024_q4(org_id);
CREATE INDEX idx_sync_log_2024_q4_connector ON sync_log_2024_q4(connector_id);
CREATE INDEX idx_sync_log_2024_q4_status ON sync_log_2024_q4(sync_status);
CREATE INDEX idx_sync_log_2024_q4_entity ON sync_log_2024_q4(entity_type, entity_id);

CREATE INDEX idx_sync_log_2025_q1_org ON sync_log_2025_q1(org_id);
CREATE INDEX idx_sync_log_2025_q1_connector ON sync_log_2025_q1(connector_id);
CREATE INDEX idx_sync_log_2025_q1_status ON sync_log_2025_q1(sync_status);
CREATE INDEX idx_sync_log_2025_q1_entity ON sync_log_2025_q1(entity_type, entity_id);

-- Indexes for webhooks
CREATE INDEX idx_webhook_org ON integration_webhook(org_id);
CREATE INDEX idx_webhook_connector ON integration_webhook(connector_id);
CREATE INDEX idx_webhook_active ON integration_webhook(is_active) WHERE is_active = true;

-- Indexes for conflicts
CREATE INDEX idx_sync_conflict_org ON sync_conflict(org_id);
CREATE INDEX idx_sync_conflict_connector ON sync_conflict(connector_id);
CREATE INDEX idx_sync_conflict_unresolved ON sync_conflict(is_resolved, created_at) WHERE is_resolved = false;
CREATE INDEX idx_sync_conflict_entity ON sync_conflict(entity_type, entity_id);

-- Function to calculate sync hash
CREATE OR REPLACE FUNCTION calculate_sync_hash(data jsonb)
RETURNS text AS $$
BEGIN
    RETURN md5(data::text);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to update sync hash on insert/update
CREATE OR REPLACE FUNCTION update_sync_hash()
RETURNS TRIGGER AS $$
BEGIN
    NEW.sync_hash := calculate_sync_hash(NEW.sync_data);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to detect sync conflicts
CREATE OR REPLACE FUNCTION detect_sync_conflict()
RETURNS TRIGGER AS $$
DECLARE
    existing_hash text;
    has_conflict boolean := false;
BEGIN
    -- Only check for conflicts on updates
    IF TG_OP = 'UPDATE' AND OLD.sync_hash IS NOT NULL THEN
        -- Check if data changed externally since last sync
        IF NEW.sync_hash != OLD.sync_hash AND NEW.last_sync_status = 'completed' THEN
            has_conflict := true;
        END IF;

        -- Log conflict if detected
        IF has_conflict THEN
            INSERT INTO sync_conflict (
                org_id,
                connector_id,
                entity_type,
                entity_id,
                external_id,
                conflict_type,
                local_data,
                remote_data
            ) VALUES (
                NEW.org_id,
                NEW.connector_id,
                NEW.entity_type,
                NEW.entity_id,
                NEW.external_id,
                'data_mismatch',
                OLD.sync_data,
                NEW.sync_data
            );

            -- Update sync status to conflict
            NEW.last_sync_status := 'conflict';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to log sync operations
CREATE OR REPLACE FUNCTION log_sync_operation(
    p_org_id uuid,
    p_connector_id uuid,
    p_entity_type entity_type,
    p_entity_id uuid,
    p_external_id text,
    p_direction sync_direction,
    p_status sync_status,
    p_operation text,
    p_records_affected integer,
    p_error_details jsonb DEFAULT NULL,
    p_duration_ms integer DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
    log_id uuid;
BEGIN
    INSERT INTO sync_log (
        org_id,
        connector_id,
        entity_type,
        entity_id,
        external_id,
        sync_direction,
        sync_status,
        operation,
        records_affected,
        error_details,
        duration_ms,
        completed_at
    ) VALUES (
        p_org_id,
        p_connector_id,
        p_entity_type,
        p_entity_id,
        p_external_id,
        p_direction,
        p_status,
        p_operation,
        p_records_affected,
        p_error_details,
        p_duration_ms,
        CASE WHEN p_status IN ('completed', 'failed', 'partial') THEN now() ELSE NULL END
    )
    RETURNING id INTO log_id;

    RETURN log_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get sync statistics
CREATE OR REPLACE FUNCTION get_sync_statistics(
    p_connector_id uuid,
    p_hours integer DEFAULT 24
)
RETURNS TABLE (
    entity_type entity_type,
    total_syncs bigint,
    successful_syncs bigint,
    failed_syncs bigint,
    pending_syncs bigint,
    avg_duration_ms numeric
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        sl.entity_type,
        COUNT(*) as total_syncs,
        COUNT(*) FILTER (WHERE sl.sync_status = 'completed') as successful_syncs,
        COUNT(*) FILTER (WHERE sl.sync_status = 'failed') as failed_syncs,
        COUNT(*) FILTER (WHERE sl.sync_status = 'pending') as pending_syncs,
        AVG(sl.duration_ms) as avg_duration_ms
    FROM sync_log sl
    WHERE sl.connector_id = p_connector_id
        AND sl.started_at >= now() - (p_hours || ' hours')::interval
    GROUP BY sl.entity_type;
END;
$$ LANGUAGE plpgsql;

-- Triggers for sync hash calculation
CREATE TRIGGER woocommerce_sync_hash_trigger
    BEFORE INSERT OR UPDATE ON woocommerce_sync
    FOR EACH ROW
    WHEN (NEW.sync_data IS NOT NULL)
    EXECUTE FUNCTION update_sync_hash();

CREATE TRIGGER odoo_sync_hash_trigger
    BEFORE INSERT OR UPDATE ON odoo_sync
    FOR EACH ROW
    WHEN (NEW.sync_data IS NOT NULL)
    EXECUTE FUNCTION update_sync_hash();

-- Triggers for conflict detection
CREATE TRIGGER woocommerce_conflict_detection_trigger
    BEFORE UPDATE ON woocommerce_sync
    FOR EACH ROW
    EXECUTE FUNCTION detect_sync_conflict();

CREATE TRIGGER odoo_conflict_detection_trigger
    BEFORE UPDATE ON odoo_sync
    FOR EACH ROW
    EXECUTE FUNCTION detect_sync_conflict();

-- Triggers for updated_at
CREATE TRIGGER update_woocommerce_sync_updated_at
    BEFORE UPDATE ON woocommerce_sync
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_odoo_sync_updated_at
    BEFORE UPDATE ON odoo_sync
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_integration_mapping_updated_at
    BEFORE UPDATE ON integration_mapping
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_integration_webhook_updated_at
    BEFORE UPDATE ON integration_webhook
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sync_conflict_updated_at
    BEFORE UPDATE ON sync_conflict
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Audit triggers
CREATE TRIGGER audit_woocommerce_sync
    AFTER INSERT OR UPDATE OR DELETE ON woocommerce_sync
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_odoo_sync
    AFTER INSERT OR UPDATE OR DELETE ON odoo_sync
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_integration_mapping
    AFTER INSERT OR UPDATE OR DELETE ON integration_mapping
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_integration_webhook
    AFTER INSERT OR UPDATE OR DELETE ON integration_webhook
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- RLS Policies for multi-tenant security

-- WooCommerce sync policies
ALTER TABLE woocommerce_sync ENABLE ROW LEVEL SECURITY;

CREATE POLICY woocommerce_sync_org_isolation ON woocommerce_sync
    FOR ALL
    USING (org_id = current_setting('app.current_org_id')::uuid);

-- Odoo sync policies
ALTER TABLE odoo_sync ENABLE ROW LEVEL SECURITY;

CREATE POLICY odoo_sync_org_isolation ON odoo_sync
    FOR ALL
    USING (org_id = current_setting('app.current_org_id')::uuid);

-- Integration mapping policies
ALTER TABLE integration_mapping ENABLE ROW LEVEL SECURITY;

CREATE POLICY integration_mapping_org_isolation ON integration_mapping
    FOR ALL
    USING (org_id = current_setting('app.current_org_id')::uuid);

-- Sync log policies
ALTER TABLE sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY sync_log_org_isolation ON sync_log
    FOR ALL
    USING (org_id = current_setting('app.current_org_id')::uuid);

-- Webhook policies
ALTER TABLE integration_webhook ENABLE ROW LEVEL SECURITY;

CREATE POLICY integration_webhook_org_isolation ON integration_webhook
    FOR ALL
    USING (org_id = current_setting('app.current_org_id')::uuid);

-- Conflict policies
ALTER TABLE sync_conflict ENABLE ROW LEVEL SECURITY;

CREATE POLICY sync_conflict_org_isolation ON sync_conflict
    FOR ALL
    USING (org_id = current_setting('app.current_org_id')::uuid);

INSERT INTO schema_migrations (migration_name)
VALUES ('0206_ecommerce_integrations')
ON CONFLICT (migration_name) DO NOTHING;

-- down

-- Drop RLS policies
DROP POLICY IF EXISTS sync_conflict_org_isolation ON sync_conflict;
DROP POLICY IF EXISTS integration_webhook_org_isolation ON integration_webhook;
DROP POLICY IF EXISTS sync_log_org_isolation ON sync_log;
DROP POLICY IF EXISTS integration_mapping_org_isolation ON integration_mapping;
DROP POLICY IF EXISTS odoo_sync_org_isolation ON odoo_sync;
DROP POLICY IF EXISTS woocommerce_sync_org_isolation ON woocommerce_sync;

-- Disable RLS
ALTER TABLE sync_conflict DISABLE ROW LEVEL SECURITY;
ALTER TABLE integration_webhook DISABLE ROW LEVEL SECURITY;
ALTER TABLE sync_log DISABLE ROW LEVEL SECURITY;
ALTER TABLE integration_mapping DISABLE ROW LEVEL SECURITY;
ALTER TABLE odoo_sync DISABLE ROW LEVEL SECURITY;
ALTER TABLE woocommerce_sync DISABLE ROW LEVEL SECURITY;

-- Drop triggers
DROP TRIGGER IF EXISTS audit_integration_webhook ON integration_webhook;
DROP TRIGGER IF EXISTS audit_integration_mapping ON integration_mapping;
DROP TRIGGER IF EXISTS audit_odoo_sync ON odoo_sync;
DROP TRIGGER IF EXISTS audit_woocommerce_sync ON woocommerce_sync;
DROP TRIGGER IF EXISTS update_sync_conflict_updated_at ON sync_conflict;
DROP TRIGGER IF EXISTS update_integration_webhook_updated_at ON integration_webhook;
DROP TRIGGER IF EXISTS update_integration_mapping_updated_at ON integration_mapping;
DROP TRIGGER IF EXISTS update_odoo_sync_updated_at ON odoo_sync;
DROP TRIGGER IF EXISTS update_woocommerce_sync_updated_at ON woocommerce_sync;
DROP TRIGGER IF EXISTS odoo_conflict_detection_trigger ON odoo_sync;
DROP TRIGGER IF EXISTS woocommerce_conflict_detection_trigger ON woocommerce_sync;
DROP TRIGGER IF EXISTS odoo_sync_hash_trigger ON odoo_sync;
DROP TRIGGER IF EXISTS woocommerce_sync_hash_trigger ON woocommerce_sync;

-- Drop functions
DROP FUNCTION IF EXISTS get_sync_statistics(uuid, integer);
DROP FUNCTION IF EXISTS log_sync_operation(uuid, uuid, entity_type, uuid, text, sync_direction, sync_status, text, integer, jsonb, integer);
DROP FUNCTION IF EXISTS detect_sync_conflict();
DROP FUNCTION IF EXISTS update_sync_hash();
DROP FUNCTION IF EXISTS calculate_sync_hash(jsonb);

-- Drop tables
DROP TABLE IF EXISTS sync_conflict;
DROP TABLE IF EXISTS integration_webhook;
DROP TABLE IF EXISTS sync_log_2025_q3;
DROP TABLE IF EXISTS sync_log_2025_q2;
DROP TABLE IF EXISTS sync_log_2025_q1;
DROP TABLE IF EXISTS sync_log_2024_q4;
DROP TABLE IF EXISTS sync_log;
DROP TABLE IF EXISTS integration_mapping;
DROP TABLE IF EXISTS odoo_sync;
DROP TABLE IF EXISTS woocommerce_sync;

-- Drop types
DROP TYPE IF EXISTS entity_type;
DROP TYPE IF EXISTS sync_status;
DROP TYPE IF EXISTS sync_direction;

-- Note: Cannot drop values from integration_provider enum in PostgreSQL
-- Manual intervention required if rollback is needed
