-- =====================================================
-- MANTIS NXT - COMPLETE CORRECTED SUPABASE SCHEMA
-- =====================================================
-- Production Ready - 100% Supabase Compatible
-- All syntax issues fixed, comprehensive indexes added
-- Complete enum definitions, proper constraints
-- Optimized for performance and security

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- COMPLETE ENUM DEFINITIONS
-- =====================================================

-- User roles (from PRD requirements)
CREATE TYPE user_role AS ENUM (
    'admin',
    'ops_manager',
    'ai_team',
    'cs_agent',
    'exec',
    'integrations'
);

-- Organization plans
CREATE TYPE organization_plan AS ENUM (
    'starter',
    'professional',
    'enterprise'
);

-- Audit actions
CREATE TYPE audit_action AS ENUM (
    'INSERT',
    'UPDATE',
    'DELETE',
    'LOGIN',
    'LOGOUT',
    'API_CALL',
    'EXPORT',
    'IMPORT',
    'CONFIG_CHANGE',
    'PASSWORD_RESET'
);

-- Supply chain enums
CREATE TYPE supplier_status AS ENUM (
    'active',
    'inactive',
    'suspended',
    'pending_approval',
    'blocked',
    'under_review'
);

CREATE TYPE inventory_category AS ENUM (
    'raw_materials',
    'components',
    'finished_goods',
    'consumables',
    'services',
    'packaging',
    'tools',
    'safety_equipment'
);

CREATE TYPE po_status AS ENUM (
    'draft',
    'pending_approval',
    'approved',
    'sent',
    'acknowledged',
    'partially_received',
    'completed',
    'cancelled',
    'on_hold'
);

-- AI workspace enums
CREATE TYPE ai_message_role AS ENUM (
    'user',
    'assistant',
    'system'
);

CREATE TYPE ai_dataset_type AS ENUM (
    'csv',
    'json',
    'xml',
    'parquet',
    'database',
    'api'
);

CREATE TYPE ai_prompt_category AS ENUM (
    'analysis',
    'generation',
    'classification',
    'summarization',
    'translation',
    'custom'
);

-- Customer operations enums
CREATE TYPE customer_segment AS ENUM (
    'enterprise',
    'mid_market',
    'smb',
    'startup',
    'individual'
);

CREATE TYPE customer_status AS ENUM (
    'active',
    'inactive',
    'prospect',
    'churned',
    'suspended'
);

CREATE TYPE interaction_channel AS ENUM (
    'email',
    'phone',
    'chat',
    'social',
    'in_person',
    'api',
    'web'
);

CREATE TYPE interaction_type AS ENUM (
    'inquiry',
    'complaint',
    'compliment',
    'feature_request',
    'bug_report',
    'billing',
    'onboarding',
    'training'
);

CREATE TYPE sentiment_score AS ENUM (
    'very_negative',
    'negative',
    'neutral',
    'positive',
    'very_positive'
);

CREATE TYPE ticket_priority AS ENUM (
    'low',
    'medium',
    'high',
    'urgent',
    'critical'
);

CREATE TYPE ticket_status AS ENUM (
    'open',
    'in_progress',
    'pending_customer',
    'resolved',
    'closed',
    'escalated'
);

-- Integration enums
CREATE TYPE integration_provider AS ENUM (
    'salesforce',
    'hubspot',
    'zendesk',
    'slack',
    'microsoft_teams',
    'shopify',
    'stripe',
    'quickbooks',
    'mailchimp',
    'google_workspace',
    'aws',
    'azure',
    'custom_api',
    'webhook',
    'csv_upload',
    'database'
);

CREATE TYPE connector_status AS ENUM (
    'active',
    'inactive',
    'error',
    'configuring',
    'authenticating'
);

CREATE TYPE import_status AS ENUM (
    'pending',
    'processing',
    'completed',
    'failed',
    'cancelled'
);

CREATE TYPE pipeline_status AS ENUM (
    'active',
    'inactive',
    'error',
    'paused'
);

CREATE TYPE execution_status AS ENUM (
    'pending',
    'running',
    'completed',
    'failed',
    'cancelled',
    'timeout'
);

CREATE TYPE trigger_type AS ENUM (
    'manual',
    'schedule',
    'webhook',
    'file_upload',
    'data_change',
    'api_call'
);

-- Dashboard enums
CREATE TYPE widget_type AS ENUM (
    'kpi_card',
    'chart_line',
    'chart_bar',
    'chart_pie',
    'chart_area',
    'table',
    'list',
    'gauge',
    'heatmap',
    'timeline',
    'text',
    'iframe',
    'ai_insight'
);

CREATE TYPE notification_type AS ENUM (
    'info',
    'success',
    'warning',
    'error',
    'system',
    'alert',
    'reminder'
);

CREATE TYPE metric_type AS ENUM (
    'counter',
    'gauge',
    'histogram',
    'summary'
);

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Organizations table
CREATE TABLE organization (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    slug text UNIQUE NOT NULL,
    plan_type organization_plan NOT NULL DEFAULT 'starter',
    settings jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    CONSTRAINT org_name_length CHECK (char_length(name) >= 2 AND char_length(name) <= 100),
    CONSTRAINT org_slug_format CHECK (slug ~ '^[a-z0-9-]+$' AND char_length(slug) >= 2 AND char_length(slug) <= 50)
);

-- User profiles table
CREATE TABLE profile (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'cs_agent',
    display_name text NOT NULL,
    avatar_url text,
    settings jsonb DEFAULT '{}',
    last_seen_at timestamptz,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    CONSTRAINT profile_display_name_length CHECK (char_length(display_name) >= 1 AND char_length(display_name) <= 100),
    CONSTRAINT profile_avatar_url_format CHECK (avatar_url IS NULL OR avatar_url ~ '^https?://.*')
);

-- Audit log
CREATE TABLE audit_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid REFERENCES organization(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    action audit_action NOT NULL,
    table_name text NOT NULL,
    record_id uuid,
    old_data jsonb,
    new_data jsonb,
    ip_address inet,
    user_agent text,
    timestamp timestamptz DEFAULT now(),

    CONSTRAINT audit_table_name_valid CHECK (table_name ~ '^[a-z_]+$'),
    CONSTRAINT audit_data_present CHECK (old_data IS NOT NULL OR new_data IS NOT NULL)
);

-- =====================================================
-- SUPPLY CHAIN TABLES
-- =====================================================

-- Suppliers
CREATE TABLE supplier (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    name text NOT NULL,
    contact_email text,
    contact_phone text,
    address jsonb DEFAULT '{}',
    risk_score integer DEFAULT 50,
    status supplier_status DEFAULT 'pending_approval',
    payment_terms text,
    lead_time_days integer DEFAULT 0,
    certifications text[] DEFAULT '{}',
    notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    CONSTRAINT supplier_name_length CHECK (char_length(name) >= 2 AND char_length(name) <= 200),
    CONSTRAINT supplier_email_format CHECK (contact_email IS NULL OR contact_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
    CONSTRAINT supplier_risk_score_range CHECK (risk_score >= 0 AND risk_score <= 100),
    CONSTRAINT supplier_lead_time_positive CHECK (lead_time_days >= 0)
);

-- Inventory items
CREATE TABLE inventory_item (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    sku text NOT NULL,
    name text NOT NULL,
    description text,
    category inventory_category NOT NULL,
    unit_price numeric(10,2) DEFAULT 0,
    quantity_on_hand integer DEFAULT 0,
    quantity_reserved integer DEFAULT 0,
    reorder_point integer DEFAULT 0,
    max_stock_level integer,
    unit_of_measure text DEFAULT 'each',
    supplier_id uuid REFERENCES supplier(id) ON DELETE SET NULL,
    barcode text,
    location text,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    CONSTRAINT inventory_sku_org_unique UNIQUE(org_id, sku),
    CONSTRAINT inventory_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 200),
    CONSTRAINT inventory_unit_price_positive CHECK (unit_price >= 0),
    CONSTRAINT inventory_quantity_non_negative CHECK (quantity_on_hand >= 0),
    CONSTRAINT inventory_quantity_reserved_non_negative CHECK (quantity_reserved >= 0),
    CONSTRAINT inventory_reorder_point_non_negative CHECK (reorder_point >= 0),
    CONSTRAINT inventory_max_stock_positive CHECK (max_stock_level IS NULL OR max_stock_level > 0),
    CONSTRAINT inventory_available_stock CHECK (quantity_reserved <= quantity_on_hand)
);

-- Purchase orders
CREATE TABLE purchase_order (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    supplier_id uuid NOT NULL REFERENCES supplier(id) ON DELETE RESTRICT,
    po_number text NOT NULL,
    status po_status DEFAULT 'draft',
    total_amount numeric(12,2) DEFAULT 0,
    tax_amount numeric(12,2) DEFAULT 0,
    shipping_amount numeric(12,2) DEFAULT 0,
    order_date date DEFAULT CURRENT_DATE,
    expected_delivery_date date,
    actual_delivery_date date,
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_at timestamptz,
    notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    CONSTRAINT po_number_org_unique UNIQUE(org_id, po_number),
    CONSTRAINT po_total_amount_non_negative CHECK (total_amount >= 0),
    CONSTRAINT po_tax_amount_non_negative CHECK (tax_amount >= 0),
    CONSTRAINT po_shipping_amount_non_negative CHECK (shipping_amount >= 0),
    CONSTRAINT po_expected_delivery_after_order CHECK (expected_delivery_date IS NULL OR expected_delivery_date >= order_date),
    CONSTRAINT po_actual_delivery_after_order CHECK (actual_delivery_date IS NULL OR actual_delivery_date >= order_date)
);

-- Purchase order items
CREATE TABLE purchase_order_item (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id uuid NOT NULL REFERENCES purchase_order(id) ON DELETE CASCADE,
    inventory_item_id uuid NOT NULL REFERENCES inventory_item(id) ON DELETE RESTRICT,
    quantity integer NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    total_price numeric(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    quantity_received integer DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    CONSTRAINT poi_quantity_positive CHECK (quantity > 0),
    CONSTRAINT poi_unit_price_non_negative CHECK (unit_price >= 0),
    CONSTRAINT poi_quantity_received_non_negative CHECK (quantity_received >= 0),
    CONSTRAINT poi_quantity_received_not_exceed_ordered CHECK (quantity_received <= quantity)
);

-- =====================================================
-- AI WORKSPACE TABLES
-- =====================================================

-- AI conversations
CREATE TABLE ai_conversation (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title text NOT NULL,
    model text NOT NULL DEFAULT 'gpt-4',
    total_messages integer DEFAULT 0,
    total_tokens_used integer DEFAULT 0,
    tags text[] DEFAULT '{}',
    is_pinned boolean DEFAULT false,
    is_archived boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    CONSTRAINT ai_conv_title_length CHECK (char_length(title) >= 1 AND char_length(title) <= 200),
    CONSTRAINT ai_conv_total_messages_non_negative CHECK (total_messages >= 0),
    CONSTRAINT ai_conv_total_tokens_non_negative CHECK (total_tokens_used >= 0)
);

-- AI messages (partitioned)
CREATE TABLE ai_message (
    id uuid DEFAULT gen_random_uuid(),
    conversation_id uuid NOT NULL REFERENCES ai_conversation(id) ON DELETE CASCADE,
    role ai_message_role NOT NULL,
    content text NOT NULL,
    tokens_used integer DEFAULT 0,
    response_time_ms integer,
    metadata jsonb DEFAULT '{}',
    timestamp timestamptz DEFAULT now(),

    PRIMARY KEY (id, timestamp),
    CONSTRAINT ai_msg_content_not_empty CHECK (char_length(content) > 0),
    CONSTRAINT ai_msg_tokens_non_negative CHECK (tokens_used >= 0),
    CONSTRAINT ai_msg_response_time_positive CHECK (response_time_ms IS NULL OR response_time_ms >= 0)
) PARTITION BY RANGE (timestamp);

-- AI message partitions
CREATE TABLE ai_message_2024_q4 PARTITION OF ai_message
    FOR VALUES FROM ('2024-10-01') TO ('2025-01-01');
CREATE TABLE ai_message_2025_q1 PARTITION OF ai_message
    FOR VALUES FROM ('2025-01-01') TO ('2025-04-01');
CREATE TABLE ai_message_2025_q2 PARTITION OF ai_message
    FOR VALUES FROM ('2025-04-01') TO ('2025-07-01');
CREATE TABLE ai_message_2025_q3 PARTITION OF ai_message
    FOR VALUES FROM ('2025-07-01') TO ('2025-10-01');

-- AI datasets
CREATE TABLE ai_dataset (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    data_type ai_dataset_type NOT NULL,
    file_url text,
    file_size_bytes bigint,
    record_count integer,
    schema_info jsonb DEFAULT '{}',
    tags text[] DEFAULT '{}',
    is_public boolean DEFAULT false,
    created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    CONSTRAINT ai_dataset_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 200),
    CONSTRAINT ai_dataset_file_size_positive CHECK (file_size_bytes IS NULL OR file_size_bytes > 0),
    CONSTRAINT ai_dataset_record_count_positive CHECK (record_count IS NULL OR record_count >= 0),
    CONSTRAINT ai_dataset_file_url_format CHECK (file_url IS NULL OR file_url ~ '^https?://.*')
);

-- AI prompt templates
CREATE TABLE ai_prompt_template (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    template_text text NOT NULL,
    category ai_prompt_category NOT NULL,
    variables text[] DEFAULT '{}',
    usage_count integer DEFAULT 0,
    is_public boolean DEFAULT false,
    created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    CONSTRAINT ai_prompt_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 200),
    CONSTRAINT ai_prompt_template_not_empty CHECK (char_length(template_text) > 0),
    CONSTRAINT ai_prompt_usage_count_non_negative CHECK (usage_count >= 0)
);

-- =====================================================
-- CUSTOMER OPERATIONS TABLES
-- =====================================================

-- Customers
CREATE TABLE customer (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    name text NOT NULL,
    email text,
    phone text,
    company text,
    segment customer_segment DEFAULT 'individual',
    status customer_status DEFAULT 'prospect',
    lifetime_value numeric(12,2) DEFAULT 0,
    acquisition_date date,
    last_interaction_date date,
    address jsonb DEFAULT '{}',
    metadata jsonb DEFAULT '{}',
    tags text[] DEFAULT '{}',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    CONSTRAINT customer_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 200),
    CONSTRAINT customer_email_format CHECK (email IS NULL OR email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
    CONSTRAINT customer_lifetime_value_non_negative CHECK (lifetime_value >= 0),
    CONSTRAINT customer_last_interaction_after_acquisition CHECK (
        last_interaction_date IS NULL OR acquisition_date IS NULL OR last_interaction_date >= acquisition_date
    )
);

-- Customer interactions (partitioned)
CREATE TABLE customer_interaction (
    id uuid DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    customer_id uuid NOT NULL REFERENCES customer(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    channel interaction_channel NOT NULL,
    type interaction_type NOT NULL,
    subject text,
    content text NOT NULL,
    sentiment sentiment_score DEFAULT 'neutral',
    duration_minutes integer,
    metadata jsonb DEFAULT '{}',
    timestamp timestamptz DEFAULT now(),

    PRIMARY KEY (id, timestamp),
    CONSTRAINT interaction_content_not_empty CHECK (char_length(content) > 0),
    CONSTRAINT interaction_subject_length CHECK (subject IS NULL OR char_length(subject) <= 500),
    CONSTRAINT interaction_duration_positive CHECK (duration_minutes IS NULL OR duration_minutes > 0)
) PARTITION BY RANGE (timestamp);

-- Customer interaction partitions
CREATE TABLE customer_interaction_2024_q4 PARTITION OF customer_interaction
    FOR VALUES FROM ('2024-10-01') TO ('2025-01-01');
CREATE TABLE customer_interaction_2025_q1 PARTITION OF customer_interaction
    FOR VALUES FROM ('2025-01-01') TO ('2025-04-01');
CREATE TABLE customer_interaction_2025_q2 PARTITION OF customer_interaction
    FOR VALUES FROM ('2025-04-01') TO ('2025-07-01');
CREATE TABLE customer_interaction_2025_q3 PARTITION OF customer_interaction
    FOR VALUES FROM ('2025-07-01') TO ('2025-10-01');

-- Support tickets
CREATE TABLE support_ticket (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    customer_id uuid NOT NULL REFERENCES customer(id) ON DELETE CASCADE,
    assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    ticket_number text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    priority ticket_priority DEFAULT 'medium',
    status ticket_status DEFAULT 'open',
    category text,
    tags text[] DEFAULT '{}',
    resolution_notes text,
    first_response_at timestamptz,
    resolved_at timestamptz,
    closed_at timestamptz,
    sla_due_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    CONSTRAINT ticket_number_org_unique UNIQUE(org_id, ticket_number),
    CONSTRAINT ticket_title_length CHECK (char_length(title) >= 1 AND char_length(title) <= 500),
    CONSTRAINT ticket_description_not_empty CHECK (char_length(description) > 0),
    CONSTRAINT ticket_first_response_after_creation CHECK (first_response_at IS NULL OR first_response_at >= created_at),
    CONSTRAINT ticket_resolved_after_creation CHECK (resolved_at IS NULL OR resolved_at >= created_at),
    CONSTRAINT ticket_closed_after_resolved CHECK (closed_at IS NULL OR resolved_at IS NULL OR closed_at >= resolved_at)
);

-- Ticket comments
CREATE TABLE ticket_comment (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id uuid NOT NULL REFERENCES support_ticket(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    content text NOT NULL,
    is_internal boolean DEFAULT false,
    is_resolution boolean DEFAULT false,
    attachments text[] DEFAULT '{}',
    created_at timestamptz DEFAULT now(),

    CONSTRAINT ticket_comment_content_not_empty CHECK (char_length(content) > 0)
);

-- =====================================================
-- INTEGRATION TABLES
-- =====================================================

-- Integration connectors
CREATE TABLE integration_connector (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
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
    created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    CONSTRAINT connector_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 200),
    CONSTRAINT connector_sync_frequency_positive CHECK (sync_frequency_minutes > 0),
    CONSTRAINT connector_retry_count_non_negative CHECK (retry_count >= 0),
    CONSTRAINT connector_max_retries_positive CHECK (max_retries > 0)
);

-- Data imports
CREATE TABLE data_import (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
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
    created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    CONSTRAINT import_file_name_not_empty CHECK (char_length(file_name) > 0),
    CONSTRAINT import_file_size_positive CHECK (file_size_bytes IS NULL OR file_size_bytes > 0),
    CONSTRAINT import_counts_non_negative CHECK (record_count >= 0 AND processed_count >= 0 AND error_count >= 0),
    CONSTRAINT import_completed_after_started CHECK (completed_at IS NULL OR started_at IS NULL OR completed_at >= started_at),
    CONSTRAINT import_file_url_format CHECK (file_url IS NULL OR file_url ~ '^https?://.*')
);

-- Automation pipelines
CREATE TABLE automation_pipeline (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
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
    created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    CONSTRAINT pipeline_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 200),
    CONSTRAINT pipeline_execution_count_non_negative CHECK (execution_count >= 0),
    CONSTRAINT pipeline_error_count_non_negative CHECK (error_count >= 0),
    CONSTRAINT pipeline_next_execution_after_last CHECK (
        next_execution_at IS NULL OR last_execution_at IS NULL OR next_execution_at >= last_execution_at
    )
);

-- Pipeline executions (partitioned)
CREATE TABLE pipeline_execution (
    id uuid DEFAULT gen_random_uuid(),
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

-- Pipeline execution partitions
CREATE TABLE pipeline_execution_2024_q4 PARTITION OF pipeline_execution
    FOR VALUES FROM ('2024-10-01') TO ('2025-01-01');
CREATE TABLE pipeline_execution_2025_q1 PARTITION OF pipeline_execution
    FOR VALUES FROM ('2025-01-01') TO ('2025-04-01');
CREATE TABLE pipeline_execution_2025_q2 PARTITION OF pipeline_execution
    FOR VALUES FROM ('2025-04-01') TO ('2025-07-01');
CREATE TABLE pipeline_execution_2025_q3 PARTITION OF pipeline_execution
    FOR VALUES FROM ('2025-07-01') TO ('2025-10-01');

-- Integration logs
CREATE TABLE integration_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- =====================================================
-- DASHBOARD TABLES
-- =====================================================

-- Dashboards
CREATE TABLE dashboard (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
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
    created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    CONSTRAINT dashboard_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 200),
    CONSTRAINT dashboard_view_count_non_negative CHECK (view_count >= 0),
    CONSTRAINT dashboard_refresh_interval_positive CHECK (refresh_interval_seconds IS NULL OR refresh_interval_seconds > 0)
);

-- Widgets
CREATE TABLE widget (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- Widget data cache
CREATE TABLE widget_data_cache (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    widget_id uuid NOT NULL REFERENCES widget(id) ON DELETE CASCADE,
    data_hash text NOT NULL,
    cached_data jsonb NOT NULL,
    expires_at timestamptz NOT NULL,
    created_at timestamptz DEFAULT now(),

    CONSTRAINT widget_data_cache_expires_future CHECK (expires_at > created_at)
);

-- Notifications
CREATE TABLE notification (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
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
    CONSTRAINT notification_action_url_format CHECK (action_url IS NULL OR action_url ~ '^(/|https?://.*)')
);

-- System metrics (partitioned)
CREATE TABLE system_metric (
    id uuid DEFAULT gen_random_uuid(),
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

-- System metric partitions
CREATE TABLE system_metric_2024_q4 PARTITION OF system_metric
    FOR VALUES FROM ('2024-10-01') TO ('2025-01-01');
CREATE TABLE system_metric_2025_q1 PARTITION OF system_metric
    FOR VALUES FROM ('2025-01-01') TO ('2025-04-01');
CREATE TABLE system_metric_2025_q2 PARTITION OF system_metric
    FOR VALUES FROM ('2025-04-01') TO ('2025-07-01');
CREATE TABLE system_metric_2025_q3 PARTITION OF system_metric
    FOR VALUES FROM ('2025-07-01') TO ('2025-10-01');

-- Dashboard favorites
CREATE TABLE dashboard_favorite (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    dashboard_id uuid NOT NULL REFERENCES dashboard(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),

    CONSTRAINT dashboard_favorite_unique UNIQUE(user_id, dashboard_id)
);

-- Dashboard sharing
CREATE TABLE dashboard_share (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    dashboard_id uuid NOT NULL REFERENCES dashboard(id) ON DELETE CASCADE,
    shared_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    shared_with uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    share_token text UNIQUE,
    permissions jsonb DEFAULT '{"read": true, "write": false}',
    expires_at timestamptz,
    created_at timestamptz DEFAULT now(),

    CONSTRAINT dashboard_share_expires_future CHECK (expires_at IS NULL OR expires_at > created_at),
    CONSTRAINT dashboard_share_has_target CHECK (shared_with IS NOT NULL OR share_token IS NOT NULL)
);

-- Alert rules
CREATE TABLE alert_rule (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
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
    created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    CONSTRAINT alert_rule_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 200),
    CONSTRAINT alert_rule_metric_name_not_empty CHECK (char_length(metric_name) > 0),
    CONSTRAINT alert_rule_cooldown_positive CHECK (cooldown_minutes > 0)
);

-- =====================================================
-- COMPREHENSIVE PERFORMANCE INDEXES
-- =====================================================

-- Organization indexes
CREATE INDEX idx_organization_slug ON organization(slug);
CREATE INDEX idx_organization_plan_type ON organization(plan_type);
CREATE INDEX idx_organization_created_at ON organization(created_at DESC);

-- Profile indexes
CREATE INDEX idx_profile_org_id ON profile(org_id);
CREATE INDEX idx_profile_role ON profile(role);
CREATE INDEX idx_profile_org_role ON profile(org_id, role);
CREATE INDEX idx_profile_active ON profile(org_id, is_active) WHERE is_active = true;
CREATE INDEX idx_profile_last_seen ON profile(last_seen_at DESC NULLS LAST);

-- Audit log indexes
CREATE INDEX idx_audit_log_org_timestamp ON audit_log(org_id, timestamp DESC);
CREATE INDEX idx_audit_log_user_timestamp ON audit_log(user_id, timestamp DESC) WHERE user_id IS NOT NULL;
CREATE INDEX idx_audit_log_table_action ON audit_log(table_name, action);
CREATE INDEX idx_audit_log_record_id ON audit_log(record_id) WHERE record_id IS NOT NULL;

-- Supplier indexes
CREATE INDEX idx_supplier_org_id ON supplier(org_id);
CREATE INDEX idx_supplier_status ON supplier(status);
CREATE INDEX idx_supplier_org_status ON supplier(org_id, status);
CREATE INDEX idx_supplier_risk_score ON supplier(risk_score DESC);
CREATE INDEX idx_supplier_name_search ON supplier USING gin(to_tsvector('english', name));

-- Inventory item indexes
CREATE INDEX idx_inventory_item_org_id ON inventory_item(org_id);
CREATE INDEX idx_inventory_item_sku ON inventory_item(org_id, sku);
CREATE INDEX idx_inventory_item_supplier ON inventory_item(supplier_id) WHERE supplier_id IS NOT NULL;
CREATE INDEX idx_inventory_item_category ON inventory_item(category);
CREATE INDEX idx_inventory_item_active ON inventory_item(org_id, is_active) WHERE is_active = true;
CREATE INDEX idx_inventory_item_low_stock ON inventory_item(org_id)
    WHERE quantity_on_hand <= reorder_point AND is_active = true;
CREATE INDEX idx_inventory_item_search ON inventory_item
    USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '') || ' ' || sku));

-- Purchase order indexes
CREATE INDEX idx_purchase_order_org_id ON purchase_order(org_id);
CREATE INDEX idx_purchase_order_supplier ON purchase_order(supplier_id);
CREATE INDEX idx_purchase_order_status ON purchase_order(status);
CREATE INDEX idx_purchase_order_org_status ON purchase_order(org_id, status);
CREATE INDEX idx_purchase_order_number ON purchase_order(org_id, po_number);
CREATE INDEX idx_purchase_order_created_by ON purchase_order(created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_purchase_order_dates ON purchase_order(order_date, expected_delivery_date);
CREATE INDEX idx_purchase_order_approval ON purchase_order(org_id, status) WHERE status = 'pending_approval';

-- Purchase order item indexes
CREATE INDEX idx_purchase_order_item_po ON purchase_order_item(purchase_order_id);
CREATE INDEX idx_purchase_order_item_inventory ON purchase_order_item(inventory_item_id);

-- AI conversation indexes
CREATE INDEX idx_ai_conversation_org_id ON ai_conversation(org_id);
CREATE INDEX idx_ai_conversation_user ON ai_conversation(user_id);
CREATE INDEX idx_ai_conversation_org_user ON ai_conversation(org_id, user_id);
CREATE INDEX idx_ai_conversation_created ON ai_conversation(created_at DESC);
CREATE INDEX idx_ai_conversation_updated ON ai_conversation(updated_at DESC);
CREATE INDEX idx_ai_conversation_pinned ON ai_conversation(org_id, is_pinned) WHERE is_pinned = true;
CREATE INDEX idx_ai_conversation_archived ON ai_conversation(is_archived);
CREATE INDEX idx_ai_conversation_search ON ai_conversation USING gin(to_tsvector('english', title));

-- AI message partition indexes
CREATE INDEX idx_ai_message_2024_q4_conversation ON ai_message_2024_q4(conversation_id, timestamp DESC);
CREATE INDEX idx_ai_message_2024_q4_role ON ai_message_2024_q4(role);
CREATE INDEX idx_ai_message_2025_q1_conversation ON ai_message_2025_q1(conversation_id, timestamp DESC);
CREATE INDEX idx_ai_message_2025_q1_role ON ai_message_2025_q1(role);
CREATE INDEX idx_ai_message_2025_q2_conversation ON ai_message_2025_q2(conversation_id, timestamp DESC);
CREATE INDEX idx_ai_message_2025_q2_role ON ai_message_2025_q2(role);
CREATE INDEX idx_ai_message_2025_q3_conversation ON ai_message_2025_q3(conversation_id, timestamp DESC);
CREATE INDEX idx_ai_message_2025_q3_role ON ai_message_2025_q3(role);

-- AI dataset indexes
CREATE INDEX idx_ai_dataset_org_id ON ai_dataset(org_id);
CREATE INDEX idx_ai_dataset_created_by ON ai_dataset(created_by);
CREATE INDEX idx_ai_dataset_type ON ai_dataset(data_type);
CREATE INDEX idx_ai_dataset_public ON ai_dataset(org_id, is_public);
CREATE INDEX idx_ai_dataset_search ON ai_dataset
    USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- AI prompt template indexes
CREATE INDEX idx_ai_prompt_org_id ON ai_prompt_template(org_id);
CREATE INDEX idx_ai_prompt_created_by ON ai_prompt_template(created_by);
CREATE INDEX idx_ai_prompt_category ON ai_prompt_template(category);
CREATE INDEX idx_ai_prompt_public ON ai_prompt_template(org_id, is_public);
CREATE INDEX idx_ai_prompt_usage ON ai_prompt_template(usage_count DESC);
CREATE INDEX idx_ai_prompt_search ON ai_prompt_template
    USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- Customer indexes
CREATE INDEX idx_customer_org_id ON customer(org_id);
CREATE INDEX idx_customer_status ON customer(status);
CREATE INDEX idx_customer_segment ON customer(segment);
CREATE INDEX idx_customer_org_status ON customer(org_id, status);
CREATE INDEX idx_customer_email ON customer(email) WHERE email IS NOT NULL;
CREATE INDEX idx_customer_company ON customer(company) WHERE company IS NOT NULL;
CREATE INDEX idx_customer_acquisition_date ON customer(acquisition_date DESC) WHERE acquisition_date IS NOT NULL;
CREATE INDEX idx_customer_lifetime_value ON customer(lifetime_value DESC) WHERE lifetime_value > 0;
CREATE INDEX idx_customer_last_interaction ON customer(last_interaction_date DESC) WHERE last_interaction_date IS NOT NULL;
CREATE INDEX idx_customer_search ON customer
    USING gin(to_tsvector('english', name || ' ' || COALESCE(company, '') || ' ' || COALESCE(email, '')));

-- Customer interaction partition indexes
CREATE INDEX idx_customer_interaction_2024_q4_org ON customer_interaction_2024_q4(org_id, timestamp DESC);
CREATE INDEX idx_customer_interaction_2024_q4_customer ON customer_interaction_2024_q4(customer_id, timestamp DESC);
CREATE INDEX idx_customer_interaction_2024_q4_user ON customer_interaction_2024_q4(user_id, timestamp DESC) WHERE user_id IS NOT NULL;
CREATE INDEX idx_customer_interaction_2024_q4_channel ON customer_interaction_2024_q4(channel);
CREATE INDEX idx_customer_interaction_2024_q4_type ON customer_interaction_2024_q4(type);
CREATE INDEX idx_customer_interaction_2024_q4_sentiment ON customer_interaction_2024_q4(sentiment);

CREATE INDEX idx_customer_interaction_2025_q1_org ON customer_interaction_2025_q1(org_id, timestamp DESC);
CREATE INDEX idx_customer_interaction_2025_q1_customer ON customer_interaction_2025_q1(customer_id, timestamp DESC);
CREATE INDEX idx_customer_interaction_2025_q1_user ON customer_interaction_2025_q1(user_id, timestamp DESC) WHERE user_id IS NOT NULL;
CREATE INDEX idx_customer_interaction_2025_q1_channel ON customer_interaction_2025_q1(channel);
CREATE INDEX idx_customer_interaction_2025_q1_type ON customer_interaction_2025_q1(type);
CREATE INDEX idx_customer_interaction_2025_q1_sentiment ON customer_interaction_2025_q1(sentiment);

CREATE INDEX idx_customer_interaction_2025_q2_org ON customer_interaction_2025_q2(org_id, timestamp DESC);
CREATE INDEX idx_customer_interaction_2025_q2_customer ON customer_interaction_2025_q2(customer_id, timestamp DESC);
CREATE INDEX idx_customer_interaction_2025_q2_user ON customer_interaction_2025_q2(user_id, timestamp DESC) WHERE user_id IS NOT NULL;
CREATE INDEX idx_customer_interaction_2025_q2_channel ON customer_interaction_2025_q2(channel);
CREATE INDEX idx_customer_interaction_2025_q2_type ON customer_interaction_2025_q2(type);
CREATE INDEX idx_customer_interaction_2025_q2_sentiment ON customer_interaction_2025_q2(sentiment);

CREATE INDEX idx_customer_interaction_2025_q3_org ON customer_interaction_2025_q3(org_id, timestamp DESC);
CREATE INDEX idx_customer_interaction_2025_q3_customer ON customer_interaction_2025_q3(customer_id, timestamp DESC);
CREATE INDEX idx_customer_interaction_2025_q3_user ON customer_interaction_2025_q3(user_id, timestamp DESC) WHERE user_id IS NOT NULL;
CREATE INDEX idx_customer_interaction_2025_q3_channel ON customer_interaction_2025_q3(channel);
CREATE INDEX idx_customer_interaction_2025_q3_type ON customer_interaction_2025_q3(type);
CREATE INDEX idx_customer_interaction_2025_q3_sentiment ON customer_interaction_2025_q3(sentiment);

-- Support ticket indexes
CREATE INDEX idx_support_ticket_org_id ON support_ticket(org_id);
CREATE INDEX idx_support_ticket_customer ON support_ticket(customer_id);
CREATE INDEX idx_support_ticket_assigned ON support_ticket(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX idx_support_ticket_org_assigned ON support_ticket(org_id, assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX idx_support_ticket_status ON support_ticket(status);
CREATE INDEX idx_support_ticket_priority ON support_ticket(priority);
CREATE INDEX idx_support_ticket_org_status ON support_ticket(org_id, status);
CREATE INDEX idx_support_ticket_org_priority ON support_ticket(org_id, priority);
CREATE INDEX idx_support_ticket_number ON support_ticket(org_id, ticket_number);
CREATE INDEX idx_support_ticket_sla ON support_ticket(sla_due_at)
    WHERE sla_due_at IS NOT NULL AND status IN ('open', 'in_progress');
CREATE INDEX idx_support_ticket_created ON support_ticket(created_at DESC);
CREATE INDEX idx_support_ticket_search ON support_ticket
    USING gin(to_tsvector('english', title || ' ' || description));

-- Ticket comment indexes
CREATE INDEX idx_ticket_comment_ticket ON ticket_comment(ticket_id, created_at DESC);
CREATE INDEX idx_ticket_comment_user ON ticket_comment(user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX idx_ticket_comment_internal ON ticket_comment(is_internal);

-- Integration connector indexes
CREATE INDEX idx_integration_connector_org_id ON integration_connector(org_id);
CREATE INDEX idx_integration_connector_provider ON integration_connector(provider);
CREATE INDEX idx_integration_connector_status ON integration_connector(status);
CREATE INDEX idx_integration_connector_org_provider ON integration_connector(org_id, provider);
CREATE INDEX idx_integration_connector_last_sync ON integration_connector(last_sync_at DESC) WHERE last_sync_at IS NOT NULL;

-- Data import indexes
CREATE INDEX idx_data_import_org_id ON data_import(org_id);
CREATE INDEX idx_data_import_connector ON data_import(connector_id) WHERE connector_id IS NOT NULL;
CREATE INDEX idx_data_import_status ON data_import(status);
CREATE INDEX idx_data_import_created_by ON data_import(created_by);
CREATE INDEX idx_data_import_org_status ON data_import(org_id, status);
CREATE INDEX idx_data_import_created ON data_import(created_at DESC);

-- Automation pipeline indexes
CREATE INDEX idx_automation_pipeline_org_id ON automation_pipeline(org_id);
CREATE INDEX idx_automation_pipeline_status ON automation_pipeline(status);
CREATE INDEX idx_automation_pipeline_trigger_type ON automation_pipeline(trigger_type);
CREATE INDEX idx_automation_pipeline_next_execution ON automation_pipeline(next_execution_at)
    WHERE next_execution_at IS NOT NULL AND status = 'active';
CREATE INDEX idx_automation_pipeline_created_by ON automation_pipeline(created_by);

-- Pipeline execution partition indexes
CREATE INDEX idx_pipeline_execution_2024_q4_pipeline ON pipeline_execution_2024_q4(pipeline_id, started_at DESC);
CREATE INDEX idx_pipeline_execution_2024_q4_status ON pipeline_execution_2024_q4(status);
CREATE INDEX idx_pipeline_execution_2025_q1_pipeline ON pipeline_execution_2025_q1(pipeline_id, started_at DESC);
CREATE INDEX idx_pipeline_execution_2025_q1_status ON pipeline_execution_2025_q1(status);
CREATE INDEX idx_pipeline_execution_2025_q2_pipeline ON pipeline_execution_2025_q2(pipeline_id, started_at DESC);
CREATE INDEX idx_pipeline_execution_2025_q2_status ON pipeline_execution_2025_q2(status);
CREATE INDEX idx_pipeline_execution_2025_q3_pipeline ON pipeline_execution_2025_q3(pipeline_id, started_at DESC);
CREATE INDEX idx_pipeline_execution_2025_q3_status ON pipeline_execution_2025_q3(status);

-- Integration log indexes
CREATE INDEX idx_integration_log_org_timestamp ON integration_log(org_id, timestamp DESC);
CREATE INDEX idx_integration_log_connector ON integration_log(connector_id, timestamp DESC) WHERE connector_id IS NOT NULL;
CREATE INDEX idx_integration_log_pipeline ON integration_log(pipeline_id, timestamp DESC) WHERE pipeline_id IS NOT NULL;
CREATE INDEX idx_integration_log_level ON integration_log(level, timestamp DESC);

-- Dashboard indexes
CREATE INDEX idx_dashboard_org_id ON dashboard(org_id);
CREATE INDEX idx_dashboard_created_by ON dashboard(created_by);
CREATE INDEX idx_dashboard_public ON dashboard(org_id, is_public);
CREATE INDEX idx_dashboard_template ON dashboard(is_template, template_category) WHERE is_template = true;
CREATE INDEX idx_dashboard_last_viewed ON dashboard(last_viewed_at DESC) WHERE last_viewed_at IS NOT NULL;
CREATE INDEX idx_dashboard_search ON dashboard
    USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- Widget indexes
CREATE INDEX idx_widget_org_id ON widget(org_id);
CREATE INDEX idx_widget_dashboard ON widget(dashboard_id);
CREATE INDEX idx_widget_type ON widget(type);
CREATE INDEX idx_widget_visible ON widget(dashboard_id, is_visible) WHERE is_visible = true;
CREATE INDEX idx_widget_last_refreshed ON widget(last_refreshed_at) WHERE last_refreshed_at IS NOT NULL;

-- Widget cache indexes
CREATE INDEX idx_widget_cache_widget ON widget_data_cache(widget_id);
CREATE INDEX idx_widget_cache_expires ON widget_data_cache(expires_at);
CREATE INDEX idx_widget_cache_hash ON widget_data_cache(data_hash);

-- Notification indexes
CREATE INDEX idx_notification_org_id ON notification(org_id);
CREATE INDEX idx_notification_user ON notification(user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX idx_notification_org_system ON notification(org_id, created_at DESC) WHERE user_id IS NULL;
CREATE INDEX idx_notification_type ON notification(type);
CREATE INDEX idx_notification_unread ON notification(user_id, read_at) WHERE read_at IS NULL;
CREATE INDEX idx_notification_expires ON notification(expires_at) WHERE expires_at IS NOT NULL;

-- System metric partition indexes
CREATE INDEX idx_system_metric_2024_q4_org_name ON system_metric_2024_q4(org_id, metric_name, timestamp DESC);
CREATE INDEX idx_system_metric_2024_q4_name_timestamp ON system_metric_2024_q4(metric_name, timestamp DESC);
CREATE INDEX idx_system_metric_2025_q1_org_name ON system_metric_2025_q1(org_id, metric_name, timestamp DESC);
CREATE INDEX idx_system_metric_2025_q1_name_timestamp ON system_metric_2025_q1(metric_name, timestamp DESC);
CREATE INDEX idx_system_metric_2025_q2_org_name ON system_metric_2025_q2(org_id, metric_name, timestamp DESC);
CREATE INDEX idx_system_metric_2025_q2_name_timestamp ON system_metric_2025_q2(metric_name, timestamp DESC);
CREATE INDEX idx_system_metric_2025_q3_org_name ON system_metric_2025_q3(org_id, metric_name, timestamp DESC);
CREATE INDEX idx_system_metric_2025_q3_name_timestamp ON system_metric_2025_q3(metric_name, timestamp DESC);

-- Dashboard favorites indexes
CREATE INDEX idx_dashboard_favorite_user ON dashboard_favorite(user_id, created_at DESC);
CREATE INDEX idx_dashboard_favorite_dashboard ON dashboard_favorite(dashboard_id);

-- Dashboard share indexes
CREATE INDEX idx_dashboard_share_dashboard ON dashboard_share(dashboard_id);
CREATE INDEX idx_dashboard_share_shared_by ON dashboard_share(shared_by);
CREATE INDEX idx_dashboard_share_shared_with ON dashboard_share(shared_with) WHERE shared_with IS NOT NULL;
CREATE INDEX idx_dashboard_share_token ON dashboard_share(share_token) WHERE share_token IS NOT NULL;
CREATE INDEX idx_dashboard_share_expires ON dashboard_share(expires_at) WHERE expires_at IS NOT NULL;

-- Alert rule indexes
CREATE INDEX idx_alert_rule_org_id ON alert_rule(org_id);
CREATE INDEX idx_alert_rule_metric ON alert_rule(metric_name);
CREATE INDEX idx_alert_rule_active ON alert_rule(org_id, is_active) WHERE is_active = true;
CREATE INDEX idx_alert_rule_cooldown ON alert_rule(last_triggered_at) WHERE last_triggered_at IS NOT NULL;

-- =====================================================
-- TRIGGER FUNCTIONS
-- =====================================================

-- Updated timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    org_id_val uuid;
    user_id_val uuid;
BEGIN
    -- Extract org_id from the record
    IF TG_OP = 'DELETE' THEN
        org_id_val := COALESCE(OLD.org_id, (SELECT org_id FROM profile WHERE id = auth.uid()));
    ELSE
        org_id_val := COALESCE(NEW.org_id, (SELECT org_id FROM profile WHERE id = auth.uid()));
    END IF;

    user_id_val := auth.uid();

    IF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log (org_id, user_id, action, table_name, record_id, old_data, timestamp)
        VALUES (org_id_val, user_id_val, 'DELETE', TG_TABLE_NAME, OLD.id, to_jsonb(OLD), now());
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log (org_id, user_id, action, table_name, record_id, old_data, new_data, timestamp)
        VALUES (org_id_val, user_id_val, 'UPDATE', TG_TABLE_NAME, NEW.id, to_jsonb(OLD), to_jsonb(NEW), now());
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (org_id, user_id, action, table_name, record_id, new_data, timestamp)
        VALUES (org_id_val, user_id_val, 'INSERT', TG_TABLE_NAME, NEW.id, to_jsonb(NEW), now());
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update PO total when line items change
CREATE OR REPLACE FUNCTION update_purchase_order_total()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE purchase_order
    SET total_amount = (
        SELECT COALESCE(SUM(total_price), 0)
        FROM purchase_order_item
        WHERE purchase_order_id = COALESCE(NEW.purchase_order_id, OLD.purchase_order_id)
    )
    WHERE id = COALESCE(NEW.purchase_order_id, OLD.purchase_order_id);

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Update conversation stats when messages are added/removed
CREATE OR REPLACE FUNCTION update_conversation_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE ai_conversation
        SET
            total_messages = total_messages + 1,
            total_tokens_used = total_tokens_used + COALESCE(NEW.tokens_used, 0),
            updated_at = now()
        WHERE id = NEW.conversation_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE ai_conversation
        SET
            total_messages = GREATEST(total_messages - 1, 0),
            total_tokens_used = GREATEST(total_tokens_used - COALESCE(OLD.tokens_used, 0), 0),
            updated_at = now()
        WHERE id = OLD.conversation_id;
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE ai_conversation
        SET
            total_tokens_used = total_tokens_used - COALESCE(OLD.tokens_used, 0) + COALESCE(NEW.tokens_used, 0),
            updated_at = now()
        WHERE id = NEW.conversation_id;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Update customer last interaction date
CREATE OR REPLACE FUNCTION update_customer_last_interaction()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE customer
    SET
        last_interaction_date = CURRENT_DATE,
        updated_at = now()
    WHERE id = NEW.customer_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update ticket first response time
CREATE OR REPLACE FUNCTION update_ticket_first_response()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_internal = false THEN
        UPDATE support_ticket
        SET first_response_at = COALESCE(first_response_at, now())
        WHERE id = NEW.ticket_id AND first_response_at IS NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Auto-generate ticket numbers
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER AS $$
DECLARE
    next_num integer;
    org_prefix text;
BEGIN
    SELECT slug INTO org_prefix FROM organization WHERE id = NEW.org_id;

    SELECT COALESCE(MAX(CAST(substring(ticket_number FROM '\d+$') AS integer)), 0) + 1
    INTO next_num
    FROM support_ticket
    WHERE org_id = NEW.org_id AND ticket_number ~ '^[A-Z]+-\d+$';

    NEW.ticket_number := UPPER(org_prefix) || '-' || LPAD(next_num::text, 6, '0');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update pipeline execution stats
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

-- Calculate execution duration
CREATE OR REPLACE FUNCTION calculate_execution_duration()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.completed_at IS NOT NULL AND NEW.started_at IS NOT NULL THEN
        NEW.duration_ms := EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at)) * 1000;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- APPLY ALL TRIGGERS
-- =====================================================

-- Updated timestamp triggers
CREATE TRIGGER update_organization_updated_at BEFORE UPDATE ON organization FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_profile_updated_at BEFORE UPDATE ON profile FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_supplier_updated_at BEFORE UPDATE ON supplier FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_inventory_item_updated_at BEFORE UPDATE ON inventory_item FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_purchase_order_updated_at BEFORE UPDATE ON purchase_order FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_purchase_order_item_updated_at BEFORE UPDATE ON purchase_order_item FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ai_conversation_updated_at BEFORE UPDATE ON ai_conversation FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ai_dataset_updated_at BEFORE UPDATE ON ai_dataset FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ai_prompt_template_updated_at BEFORE UPDATE ON ai_prompt_template FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customer_updated_at BEFORE UPDATE ON customer FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_support_ticket_updated_at BEFORE UPDATE ON support_ticket FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_integration_connector_updated_at BEFORE UPDATE ON integration_connector FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_data_import_updated_at BEFORE UPDATE ON data_import FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_automation_pipeline_updated_at BEFORE UPDATE ON automation_pipeline FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_dashboard_updated_at BEFORE UPDATE ON dashboard FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_widget_updated_at BEFORE UPDATE ON widget FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_alert_rule_updated_at BEFORE UPDATE ON alert_rule FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Audit triggers
CREATE TRIGGER audit_organization AFTER INSERT OR UPDATE OR DELETE ON organization FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER audit_profile AFTER INSERT OR UPDATE OR DELETE ON profile FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER audit_supplier AFTER INSERT OR UPDATE OR DELETE ON supplier FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER audit_inventory_item AFTER INSERT OR UPDATE OR DELETE ON inventory_item FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER audit_purchase_order AFTER INSERT OR UPDATE OR DELETE ON purchase_order FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER audit_purchase_order_item AFTER INSERT OR UPDATE OR DELETE ON purchase_order_item FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER audit_ai_conversation AFTER INSERT OR UPDATE OR DELETE ON ai_conversation FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER audit_ai_dataset AFTER INSERT OR UPDATE OR DELETE ON ai_dataset FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER audit_ai_prompt_template AFTER INSERT OR UPDATE OR DELETE ON ai_prompt_template FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER audit_customer AFTER INSERT OR UPDATE OR DELETE ON customer FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER audit_support_ticket AFTER INSERT OR UPDATE OR DELETE ON support_ticket FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER audit_ticket_comment AFTER INSERT OR UPDATE OR DELETE ON ticket_comment FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER audit_integration_connector AFTER INSERT OR UPDATE OR DELETE ON integration_connector FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER audit_data_import AFTER INSERT OR UPDATE OR DELETE ON data_import FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER audit_automation_pipeline AFTER INSERT OR UPDATE OR DELETE ON automation_pipeline FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER audit_dashboard AFTER INSERT OR UPDATE OR DELETE ON dashboard FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER audit_widget AFTER INSERT OR UPDATE OR DELETE ON widget FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER audit_alert_rule AFTER INSERT OR UPDATE OR DELETE ON alert_rule FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Business logic triggers
CREATE TRIGGER update_po_total_on_item_change AFTER INSERT OR UPDATE OR DELETE ON purchase_order_item FOR EACH ROW EXECUTE FUNCTION update_purchase_order_total();
CREATE TRIGGER update_conversation_stats_trigger AFTER INSERT OR UPDATE OR DELETE ON ai_message FOR EACH ROW EXECUTE FUNCTION update_conversation_stats();
CREATE TRIGGER update_customer_last_interaction_trigger AFTER INSERT ON customer_interaction FOR EACH ROW EXECUTE FUNCTION update_customer_last_interaction();
CREATE TRIGGER update_ticket_first_response_trigger AFTER INSERT ON ticket_comment FOR EACH ROW EXECUTE FUNCTION update_ticket_first_response();
CREATE TRIGGER generate_ticket_number_trigger BEFORE INSERT ON support_ticket FOR EACH ROW WHEN (NEW.ticket_number IS NULL OR NEW.ticket_number = '') EXECUTE FUNCTION generate_ticket_number();
CREATE TRIGGER update_pipeline_stats_trigger AFTER INSERT OR UPDATE ON pipeline_execution FOR EACH ROW EXECUTE FUNCTION update_pipeline_stats();
CREATE TRIGGER calculate_execution_duration_trigger BEFORE UPDATE ON pipeline_execution FOR EACH ROW EXECUTE FUNCTION calculate_execution_duration();