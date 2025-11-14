-- Migration: 0006_dashboards.sql
-- Description: Dashboard and observability tables - dashboards, widgets, notifications, metrics
-- up

-- Dashboard enums
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'widget_type') THEN
        CREATE TYPE widget_type AS ENUM ('kpi_card', 'chart_line', 'chart_bar', 'chart_pie', 'chart_area', 'table', 'list', 'gauge', 'heatmap', 'timeline', 'text', 'iframe', 'ai_insight');
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
        CREATE TYPE notification_type AS ENUM ('info', 'success', 'warning', 'error', 'system', 'alert', 'reminder');
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'metric_type') THEN
        CREATE TYPE metric_type AS ENUM ('counter', 'gauge', 'histogram', 'summary');
    END IF;
END$$;

-- Dashboards table
CREATE TABLE IF NOT EXISTS dashboard (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    layout_config jsonb NOT NULL DEFAULT '{}',
    theme_config jsonb DEFAULT '{}',
    is_public boolean DEFAULT false,
    is_template boolean DEFAULT false,
    template_category text,
    view_count integer DEFAULT 0,
    last_viewed_at timestamptz,
    refresh_interval_seconds integer DEFAULT 300,
    created_by uuid NOT NULL REFERENCES auth.users_extended(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    CONSTRAINT dashboard_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 200),
    CONSTRAINT dashboard_view_count_non_negative CHECK (view_count >= 0),
    CONSTRAINT dashboard_refresh_interval_positive CHECK (refresh_interval_seconds IS NULL OR refresh_interval_seconds > 0)
);

-- Dashboard widgets table
CREATE TABLE IF NOT EXISTS widget (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    dashboard_id uuid NOT NULL REFERENCES dashboard(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    type widget_type NOT NULL,
    config jsonb NOT NULL DEFAULT '{}',
    data_source_config jsonb DEFAULT '{}',
    position jsonb NOT NULL DEFAULT '{}',
    size jsonb NOT NULL DEFAULT '{}',
    is_visible boolean DEFAULT true,
    cache_ttl_seconds integer DEFAULT 300,
    last_refreshed_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    CONSTRAINT widget_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 200),
    CONSTRAINT widget_cache_ttl_positive CHECK (cache_ttl_seconds IS NULL OR cache_ttl_seconds > 0)
);

-- Widget data cache table (for performance optimization)
CREATE TABLE IF NOT EXISTS widget_data_cache (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    widget_id uuid NOT NULL REFERENCES widget(id) ON DELETE CASCADE,
    data_hash text NOT NULL,
    cached_data jsonb NOT NULL,
    expires_at timestamptz NOT NULL,
    created_at timestamptz DEFAULT now(),

    CONSTRAINT widget_data_cache_expires_future CHECK (expires_at > created_at)
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notification (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users_extended(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    action_url text,
    metadata jsonb DEFAULT '{}',
    read_at timestamptz,
    expires_at timestamptz,
    created_at timestamptz DEFAULT now(),

    CONSTRAINT notification_title_length CHECK (char_length(title) >= 1 AND char_length(title) <= 200),
    CONSTRAINT notification_message_not_empty CHECK (char_length(message) > 0),
    CONSTRAINT notification_action_url_format CHECK (action_url IS NULL OR action_url ~ '^(/|https?://)')
);

-- System metrics table (partitioned by timestamp for performance)
CREATE TABLE IF NOT EXISTS system_metric (
    id uuid DEFAULT uuid_generate_v4(),
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    metric_name text NOT NULL,
    metric_type metric_type NOT NULL DEFAULT 'gauge',
    metric_value numeric NOT NULL,
    unit text,
    tags jsonb DEFAULT '{}',
    source text,
    timestamp timestamptz DEFAULT now(),

    PRIMARY KEY (id, timestamp),
    CONSTRAINT metric_name_not_empty CHECK (char_length(metric_name) > 0),
    CONSTRAINT metric_value_is_number CHECK (metric_value IS NOT NULL)
) PARTITION BY RANGE (timestamp);

-- Create partitions for system_metric (current month and next 6 months)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'system_metric_2024_q4') THEN
        CREATE TABLE system_metric_2024_q4 PARTITION OF system_metric
            FOR VALUES FROM ('2024-10-01') TO ('2025-01-01');
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'system_metric_2025_q1') THEN
        CREATE TABLE system_metric_2025_q1 PARTITION OF system_metric
            FOR VALUES FROM ('2025-01-01') TO ('2025-04-01');
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'system_metric_2025_q2') THEN
        CREATE TABLE system_metric_2025_q2 PARTITION OF system_metric
            FOR VALUES FROM ('2025-04-01') TO ('2025-07-01');
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'system_metric_2025_q3') THEN
        CREATE TABLE system_metric_2025_q3 PARTITION OF system_metric
            FOR VALUES FROM ('2025-07-01') TO ('2025-10-01');
    END IF;
END$$;

-- Dashboard favorites table
CREATE TABLE IF NOT EXISTS dashboard_favorite (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES auth.users_extended(id) ON DELETE CASCADE,
    dashboard_id uuid NOT NULL REFERENCES dashboard(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),

    CONSTRAINT dashboard_favorite_unique UNIQUE(user_id, dashboard_id)
);

-- Dashboard sharing table
CREATE TABLE IF NOT EXISTS dashboard_share (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    dashboard_id uuid NOT NULL REFERENCES dashboard(id) ON DELETE CASCADE,
    shared_by uuid NOT NULL REFERENCES auth.users_extended(id) ON DELETE CASCADE,
    shared_with uuid REFERENCES auth.users_extended(id) ON DELETE CASCADE,
    share_token text UNIQUE,
    permissions jsonb DEFAULT '{"read": true, "write": false}',
    expires_at timestamptz,
    created_at timestamptz DEFAULT now(),

    CONSTRAINT dashboard_share_expires_future CHECK (expires_at IS NULL OR expires_at > created_at),
    CONSTRAINT dashboard_share_has_target CHECK (shared_with IS NOT NULL OR share_token IS NOT NULL)
);

-- Alert rules table for proactive monitoring
CREATE TABLE IF NOT EXISTS alert_rule (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    metric_name text NOT NULL,
    condition jsonb NOT NULL,
    severity notification_type DEFAULT 'warning',
    is_active boolean DEFAULT true,
    notification_channels jsonb DEFAULT '{}',
    cooldown_minutes integer DEFAULT 60,
    last_triggered_at timestamptz,
    created_by uuid NOT NULL REFERENCES auth.users_extended(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    CONSTRAINT alert_rule_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 200),
    CONSTRAINT alert_rule_metric_name_not_empty CHECK (char_length(metric_name) > 0),
    CONSTRAINT alert_rule_cooldown_positive CHECK (cooldown_minutes > 0)
);

-- Function to increment dashboard view count
CREATE OR REPLACE FUNCTION increment_dashboard_views()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE dashboard
    SET
        view_count = view_count + 1,
        last_viewed_at = now()
    WHERE id = NEW.dashboard_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to clean expired widget cache
CREATE OR REPLACE FUNCTION clean_expired_widget_cache()
RETURNS void AS $$
BEGIN
    DELETE FROM widget_data_cache
    WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql;

-- Function to clean expired notifications
CREATE OR REPLACE FUNCTION clean_expired_notifications()
RETURNS void AS $$
BEGIN
    DELETE FROM notification
    WHERE expires_at IS NOT NULL AND expires_at < now();
END;
$$ LANGUAGE plpgsql;

-- Function to evaluate alert rules (simplified example)
CREATE OR REPLACE FUNCTION evaluate_alert_rules()
RETURNS void AS $$
DECLARE
    rule_record alert_rule%ROWTYPE;
    latest_value numeric;
    threshold numeric;
    should_trigger boolean := false;
BEGIN
    FOR rule_record IN
        SELECT * FROM alert_rule
        WHERE is_active = true
        AND (last_triggered_at IS NULL OR last_triggered_at < now() - (cooldown_minutes || ' minutes')::interval)
    LOOP
        -- Get latest metric value
        SELECT metric_value INTO latest_value
        FROM system_metric
        WHERE metric_name = rule_record.metric_name
        AND org_id = rule_record.org_id
        ORDER BY timestamp DESC
        LIMIT 1;

        -- Simple threshold check (extend this for more complex conditions)
        threshold := (rule_record.condition->>'threshold')::numeric;

        IF rule_record.condition->>'operator' = '>' AND latest_value > threshold THEN
            should_trigger := true;
        ELSIF rule_record.condition->>'operator' = '<' AND latest_value < threshold THEN
            should_trigger := true;
        END IF;

        -- Create notification if rule triggered
        IF should_trigger THEN
            INSERT INTO notification (org_id, type, title, message, metadata)
            VALUES (
                rule_record.org_id,
                rule_record.severity,
                'Alert: ' || rule_record.name,
                format('Metric %s has value %s which exceeds threshold %s',
                    rule_record.metric_name, latest_value, threshold),
                jsonb_build_object('alert_rule_id', rule_record.id, 'metric_value', latest_value)
            );

            -- Update last triggered time
            UPDATE alert_rule
            SET last_triggered_at = now()
            WHERE id = rule_record.id;
        END IF;

        should_trigger := false;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_dashboard_updated_at ON dashboard;
CREATE TRIGGER update_dashboard_updated_at BEFORE UPDATE ON dashboard FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_widget_updated_at ON widget;
CREATE TRIGGER update_widget_updated_at BEFORE UPDATE ON widget FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_alert_rule_updated_at ON alert_rule;
CREATE TRIGGER update_alert_rule_updated_at BEFORE UPDATE ON alert_rule FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Audit triggers
DROP TRIGGER IF EXISTS audit_dashboard ON dashboard;
CREATE TRIGGER audit_dashboard AFTER INSERT OR UPDATE OR DELETE ON dashboard FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_widget ON widget;
CREATE TRIGGER audit_widget AFTER INSERT OR UPDATE OR DELETE ON widget FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_alert_rule ON alert_rule;
CREATE TRIGGER audit_alert_rule AFTER INSERT OR UPDATE OR DELETE ON alert_rule FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

INSERT INTO schema_migrations (migration_name)
VALUES ('0006_dashboards')
ON CONFLICT (migration_name) DO NOTHING;

-- down

DROP TRIGGER IF EXISTS audit_alert_rule ON alert_rule;
DROP TRIGGER IF EXISTS audit_widget ON widget;
DROP TRIGGER IF EXISTS audit_dashboard ON dashboard;
DROP TRIGGER IF EXISTS update_alert_rule_updated_at ON alert_rule;
DROP TRIGGER IF EXISTS update_widget_updated_at ON widget;
DROP TRIGGER IF EXISTS update_dashboard_updated_at ON dashboard;
DROP FUNCTION IF EXISTS evaluate_alert_rules();
DROP FUNCTION IF EXISTS clean_expired_notifications();
DROP FUNCTION IF EXISTS clean_expired_widget_cache();
DROP FUNCTION IF EXISTS increment_dashboard_views();
DROP TABLE IF EXISTS alert_rule;
DROP TABLE IF EXISTS dashboard_share;
DROP TABLE IF EXISTS dashboard_favorite;
DROP TABLE IF EXISTS system_metric_2025_q3;
DROP TABLE IF EXISTS system_metric_2025_q2;
DROP TABLE IF EXISTS system_metric_2025_q1;
DROP TABLE IF EXISTS system_metric_2024_q4;
DROP TABLE IF EXISTS system_metric;
DROP TABLE IF EXISTS notification;
DROP TABLE IF EXISTS widget_data_cache;
DROP TABLE IF EXISTS widget;
DROP TABLE IF EXISTS dashboard;
DROP TYPE IF EXISTS metric_type;
DROP TYPE IF EXISTS notification_type;
DROP TYPE IF EXISTS widget_type;