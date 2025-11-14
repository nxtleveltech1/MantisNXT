-- =====================================================
-- MANTIS NXT - UNIFIED POSTGRES SCHEMA (2025-09-22)
-- =====================================================
-- This schema consolidates core, supply chain, AI workspace, customer ops,
-- integrations, dashboards/observability, and enhanced inventory features.
-- Includes enums, constraints, FK relationships, triggers, partitions,
-- views, and comprehensive performance indexes.

-- =====================================================
-- EXTENSIONS AND SCHEMAS
-- =====================================================
CREATE SCHEMA IF NOT EXISTS auth;
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Minimal auth schema stub (if not provided by external auth provider)
CREATE TABLE IF NOT EXISTS auth.users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text UNIQUE,
    encrypted_password text,
    created_at timestamptz DEFAULT now()
);

-- Provide a stub for auth.uid() for non-managed Postgres environments
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(current_setting('app.user_id', true)::uuid,
                  '00000000-0000-0000-0000-000000000001'::uuid)
$$;

-- Seed a system user used by audit/automation when no session user is set
INSERT INTO auth.users (id, email, encrypted_password)
VALUES ('00000000-0000-0000-0000-000000000001', 'system@mantis.local', NULL)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- ENUM DEFINITIONS
-- =====================================================

-- User roles
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM (
            'admin', 'ops_manager', 'ai_team', 'cs_agent', 'exec', 'integrations'
        );
    END IF;
END $$;

-- Organization plans
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'organization_plan') THEN
        CREATE TYPE organization_plan AS ENUM ('starter', 'professional', 'enterprise');
    END IF;
END $$;

-- Audit actions
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audit_action') THEN
        CREATE TYPE audit_action AS ENUM (
            'INSERT', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'API_CALL', 'EXPORT', 'IMPORT', 'CONFIG_CHANGE', 'PASSWORD_RESET'
        );
    END IF;
END $$;

-- Supply chain enums
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'supplier_status') THEN
        CREATE TYPE supplier_status AS ENUM ('active','inactive','suspended','pending_approval','blocked','under_review');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inventory_category') THEN
        CREATE TYPE inventory_category AS ENUM (
            'raw_materials','components','finished_goods','consumables','services','packaging','tools','safety_equipment'
        );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'po_status') THEN
        CREATE TYPE po_status AS ENUM (
            'draft','pending_approval','approved','sent','acknowledged','partially_received','completed','cancelled','on_hold'
        );
    END IF;
END $$;

-- Enhanced inventory enums
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'supplier_performance_tier') THEN
        CREATE TYPE supplier_performance_tier AS ENUM ('platinum','gold','silver','bronze','unrated');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'stock_movement_type') THEN
        CREATE TYPE stock_movement_type AS ENUM (
            'purchase_receipt','sale_shipment','transfer_in','transfer_out','adjustment_positive','adjustment_negative','damaged','expired','returned','stolen','cycle_count','manufacturing_use','sample','promotion'
        );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'price_change_reason') THEN
        CREATE TYPE price_change_reason AS ENUM (
            'cost_increase','cost_decrease','market_adjustment','promotion','currency_change','bulk_discount','seasonal','competitive','manual','automated'
        );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vat_rate_type') THEN
        CREATE TYPE vat_rate_type AS ENUM ('standard','zero','exempt','reduced','custom');
    END IF;
END $$;

-- AI workspace enums
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ai_message_role') THEN
        CREATE TYPE ai_message_role AS ENUM ('user','assistant','system');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ai_dataset_type') THEN
        CREATE TYPE ai_dataset_type AS ENUM ('csv','json','xml','parquet','database','api');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ai_prompt_category') THEN
        CREATE TYPE ai_prompt_category AS ENUM ('analysis','generation','classification','summarization','translation','custom');
    END IF;
END $$;

-- Customer operations enums
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'customer_segment') THEN
        CREATE TYPE customer_segment AS ENUM ('enterprise','mid_market','smb','startup','individual');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'customer_status') THEN
        CREATE TYPE customer_status AS ENUM ('active','inactive','prospect','churned','suspended');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'interaction_channel') THEN
        CREATE TYPE interaction_channel AS ENUM ('email','phone','chat','social','in_person','api','web');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'interaction_type') THEN
        CREATE TYPE interaction_type AS ENUM ('inquiry','complaint','compliment','feature_request','bug_report','billing','onboarding','training');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sentiment_score') THEN
        CREATE TYPE sentiment_score AS ENUM ('very_negative','negative','neutral','positive','very_positive');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_priority') THEN
        CREATE TYPE ticket_priority AS ENUM ('low','medium','high','urgent','critical');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_status') THEN
        CREATE TYPE ticket_status AS ENUM ('open','in_progress','pending_customer','resolved','closed','escalated');
    END IF;
END $$;

-- Integration enums
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'integration_provider') THEN
        CREATE TYPE integration_provider AS ENUM (
            'salesforce','hubspot','zendesk','slack','microsoft_teams','shopify','stripe','quickbooks','mailchimp','google_workspace','aws','azure','custom_api','webhook','csv_upload','database'
        );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'connector_status') THEN
        CREATE TYPE connector_status AS ENUM ('active','inactive','error','configuring','authenticating');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'import_status') THEN
        CREATE TYPE import_status AS ENUM ('pending','processing','completed','failed','cancelled');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pipeline_status') THEN
        CREATE TYPE pipeline_status AS ENUM ('active','inactive','error','paused');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'execution_status') THEN
        CREATE TYPE execution_status AS ENUM ('pending','running','completed','failed','cancelled','timeout');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'trigger_type') THEN
        CREATE TYPE trigger_type AS ENUM ('manual','schedule','webhook','file_upload','data_change','api_call');
    END IF;
END $$;

-- Dashboard enums
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'widget_type') THEN
        CREATE TYPE widget_type AS ENUM ('kpi_card','chart_line','chart_bar','chart_pie','chart_area','table','list','gauge','heatmap','timeline','text','iframe','ai_insight');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
        CREATE TYPE notification_type AS ENUM ('info','success','warning','error','system','alert','reminder');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'metric_type') THEN
        CREATE TYPE metric_type AS ENUM ('counter','gauge','histogram','summary');
    END IF;
END $$;

-- =====================================================
-- CORE TABLES
-- =====================================================

CREATE TABLE IF NOT EXISTS organization (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    slug text UNIQUE NOT NULL,
    plan_type organization_plan NOT NULL DEFAULT 'starter',
    settings jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT org_name_length CHECK (char_length(name) BETWEEN 2 AND 100),
    CONSTRAINT org_slug_format CHECK (slug ~ '^[a-z0-9-]+$' AND char_length(slug) BETWEEN 2 AND 50)
);

CREATE TABLE IF NOT EXISTS profile (
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
    CONSTRAINT profile_display_name_length CHECK (char_length(display_name) BETWEEN 1 AND 100),
    CONSTRAINT profile_avatar_url_format CHECK (avatar_url IS NULL OR avatar_url ~ '^https?://.*')
);

CREATE TABLE IF NOT EXISTS audit_log (
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
-- SUPPLY CHAIN AND ENHANCED INVENTORY TABLES
-- =====================================================

-- Brands
CREATE TABLE IF NOT EXISTS brand (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    logo_url text,
    website text,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT brand_name_org_unique UNIQUE(org_id, name),
    CONSTRAINT brand_name_length CHECK (char_length(name) BETWEEN 1 AND 100),
    CONSTRAINT brand_logo_url_format CHECK (logo_url IS NULL OR logo_url ~ '^https?://.*'),
    CONSTRAINT brand_website_format CHECK (website IS NULL OR website ~ '^https?://.*')
);

-- Suppliers (enhanced)
CREATE TABLE IF NOT EXISTS supplier (
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
    -- Enhanced performance fields
    performance_tier supplier_performance_tier DEFAULT 'unrated',
    performance_score numeric(5,2) DEFAULT 0.00,
    on_time_delivery_rate numeric(5,2) DEFAULT 0.00,
    quality_rating numeric(3,2) DEFAULT 0.00,
    last_evaluation_date date,
    preferred_supplier boolean DEFAULT false,
    minimum_order_value numeric(10,2),
    currency_code text DEFAULT 'ZAR',
    tax_number text,
    bank_details jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT supplier_name_length CHECK (char_length(name) BETWEEN 2 AND 200),
    CONSTRAINT supplier_email_format CHECK (contact_email IS NULL OR contact_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
    CONSTRAINT supplier_risk_score_range CHECK (risk_score >= 0 AND risk_score <= 100),
    CONSTRAINT supplier_lead_time_positive CHECK (lead_time_days >= 0),
    CONSTRAINT supplier_performance_score_range CHECK (performance_score >= 0 AND performance_score <= 100),
    CONSTRAINT supplier_delivery_rate_range CHECK (on_time_delivery_rate >= 0 AND on_time_delivery_rate <= 100),
    CONSTRAINT supplier_quality_rating_range CHECK (quality_rating >= 0 AND quality_rating <= 5)
);

-- Inventory items (enhanced)
CREATE TABLE IF NOT EXISTS inventory_item (
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
    brand_id uuid REFERENCES brand(id) ON DELETE SET NULL,
    barcode text,
    location text,
    -- Enhanced attributes
    weight_kg numeric(8,3),
    dimensions_json jsonb DEFAULT '{}',
    batch_tracking boolean DEFAULT false,
    expiry_tracking boolean DEFAULT false,
    serial_tracking boolean DEFAULT false,
    default_vat_rate_type vat_rate_type DEFAULT 'standard',
    default_vat_rate numeric(5,2) DEFAULT 15.00,
    cost_price numeric(10,2) DEFAULT 0.00,
    markup_percentage numeric(5,2) DEFAULT 0.00,
    alternative_skus text[] DEFAULT '{}',
    tags text[] DEFAULT '{}',
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT inventory_sku_org_unique UNIQUE(org_id, sku),
    CONSTRAINT inventory_name_length CHECK (char_length(name) BETWEEN 1 AND 200),
    CONSTRAINT inventory_unit_price_positive CHECK (unit_price >= 0),
    CONSTRAINT inventory_quantity_non_negative CHECK (quantity_on_hand >= 0),
    CONSTRAINT inventory_quantity_reserved_non_negative CHECK (quantity_reserved >= 0),
    CONSTRAINT inventory_reorder_point_non_negative CHECK (reorder_point >= 0),
    CONSTRAINT inventory_max_stock_positive CHECK (max_stock_level IS NULL OR max_stock_level > 0),
    CONSTRAINT inventory_available_stock CHECK (quantity_reserved <= quantity_on_hand),
    CONSTRAINT inventory_weight_positive CHECK (weight_kg IS NULL OR weight_kg >= 0),
    CONSTRAINT inventory_vat_rate_range CHECK (default_vat_rate >= 0 AND default_vat_rate <= 100),
    CONSTRAINT inventory_cost_price_positive CHECK (cost_price >= 0)
);

-- Purchase orders
CREATE TABLE IF NOT EXISTS purchase_order (
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
CREATE TABLE IF NOT EXISTS purchase_order_item (
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

-- Stock movements
CREATE TABLE IF NOT EXISTS stock_movement (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    inventory_item_id uuid NOT NULL REFERENCES inventory_item(id) ON DELETE RESTRICT,
    movement_type stock_movement_type NOT NULL,
    quantity_change integer NOT NULL,
    quantity_before integer NOT NULL DEFAULT 0,
    quantity_after integer NOT NULL DEFAULT 0,
    unit_cost numeric(10,2),
    total_cost numeric(12,2),
    reference_number text,
    reference_table text,
    reference_id uuid,
    batch_number text,
    expiry_date date,
    serial_number text,
    location_from text,
    location_to text,
    notes text,
    movement_date timestamptz DEFAULT now(),
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now(),
    CONSTRAINT stock_movement_quantity_not_zero CHECK (quantity_change != 0),
    CONSTRAINT stock_movement_quantities_valid CHECK (quantity_after = quantity_before + quantity_change),
    CONSTRAINT stock_movement_cost_positive CHECK (unit_cost IS NULL OR unit_cost >= 0),
    CONSTRAINT stock_movement_total_cost_positive CHECK (total_cost IS NULL OR total_cost >= 0),
    CONSTRAINT stock_movement_reference_valid CHECK (
        (reference_table IS NULL AND reference_id IS NULL) OR (reference_table IS NOT NULL AND reference_id IS NOT NULL)
    )
);

-- Price lists
CREATE TABLE IF NOT EXISTS price_list (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    currency_code text NOT NULL DEFAULT 'ZAR',
    is_default boolean DEFAULT false,
    effective_from date NOT NULL DEFAULT CURRENT_DATE,
    effective_until date,
    created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT price_list_name_org_unique UNIQUE(org_id, name),
    CONSTRAINT price_list_name_length CHECK (char_length(name) BETWEEN 1 AND 100),
    CONSTRAINT price_list_effective_dates CHECK (effective_until IS NULL OR effective_until >= effective_from),
    CONSTRAINT price_list_currency_format CHECK (currency_code ~ '^[A-Z]{3}$')
);

-- Price list items
CREATE TABLE IF NOT EXISTS price_list_item (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    price_list_id uuid NOT NULL REFERENCES price_list(id) ON DELETE CASCADE,
    inventory_item_id uuid NOT NULL REFERENCES inventory_item(id) ON DELETE CASCADE,
    price numeric(10,2) NOT NULL,
    vat_rate_type vat_rate_type NOT NULL DEFAULT 'standard',
    vat_rate numeric(5,2) NOT NULL DEFAULT 15.00,
    min_quantity integer DEFAULT 1,
    max_quantity integer,
    effective_from timestamptz NOT NULL DEFAULT now(),
    effective_until timestamptz,
    created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    CONSTRAINT price_list_item_unique UNIQUE(price_list_id, inventory_item_id, effective_from),
    CONSTRAINT price_list_item_price_positive CHECK (price > 0),
    CONSTRAINT price_list_item_vat_rate_range CHECK (vat_rate >= 0 AND vat_rate <= 100),
    CONSTRAINT price_list_item_quantities_valid CHECK (max_quantity IS NULL OR max_quantity >= min_quantity),
    CONSTRAINT price_list_item_min_quantity_positive CHECK (min_quantity > 0),
    CONSTRAINT price_list_item_effective_dates CHECK (effective_until IS NULL OR effective_until > effective_from)
);

-- Price change history
CREATE TABLE IF NOT EXISTS price_change_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_item_id uuid NOT NULL REFERENCES inventory_item(id) ON DELETE CASCADE,
    price_list_id uuid REFERENCES price_list(id) ON DELETE SET NULL,
    old_price numeric(10,2),
    new_price numeric(10,2) NOT NULL,
    old_vat_rate numeric(5,2),
    new_vat_rate numeric(5,2) NOT NULL,
    change_reason price_change_reason NOT NULL,
    change_percentage numeric(6,3),
    effective_date timestamptz NOT NULL DEFAULT now(),
    notes text,
    changed_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    CONSTRAINT price_change_prices_positive CHECK ((old_price IS NULL OR old_price >= 0) AND new_price > 0),
    CONSTRAINT price_change_vat_rates_valid CHECK ((old_vat_rate IS NULL OR old_vat_rate >= 0) AND new_vat_rate >= 0 AND new_vat_rate <= 100)
);

-- Supplier product mapping
CREATE TABLE IF NOT EXISTS supplier_product (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id uuid NOT NULL REFERENCES supplier(id) ON DELETE CASCADE,
    inventory_item_id uuid NOT NULL REFERENCES inventory_item(id) ON DELETE CASCADE,
    supplier_sku text,
    supplier_name text,
    supplier_description text,
    cost_price numeric(10,2) NOT NULL,
    currency_code text NOT NULL DEFAULT 'ZAR',
    lead_time_days integer DEFAULT 0,
    minimum_order_quantity integer DEFAULT 1,
    pack_size integer DEFAULT 1,
    last_cost_update_date date DEFAULT CURRENT_DATE,
    is_preferred boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT supplier_product_unique UNIQUE(supplier_id, inventory_item_id),
    CONSTRAINT supplier_product_cost_positive CHECK (cost_price > 0),
    CONSTRAINT supplier_product_lead_time_positive CHECK (lead_time_days >= 0),
    CONSTRAINT supplier_product_moq_positive CHECK (minimum_order_quantity > 0),
    CONSTRAINT supplier_product_pack_size_positive CHECK (pack_size > 0),
    CONSTRAINT supplier_product_currency_format CHECK (currency_code ~ '^[A-Z]{3}$')
);

-- Stock level (per location)
CREATE TABLE IF NOT EXISTS stock_level (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    inventory_item_id uuid NOT NULL REFERENCES inventory_item(id) ON DELETE CASCADE,
    location_code text NOT NULL,
    location_name text NOT NULL,
    quantity_on_hand integer NOT NULL DEFAULT 0,
    quantity_reserved integer NOT NULL DEFAULT 0,
    quantity_available integer GENERATED ALWAYS AS (quantity_on_hand - quantity_reserved) STORED,
    reorder_point integer DEFAULT 0,
    max_stock_level integer,
    last_counted_date date,
    last_counted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT stock_level_location_item_unique UNIQUE(org_id, inventory_item_id, location_code),
    CONSTRAINT stock_level_quantities_non_negative CHECK (quantity_on_hand >= 0 AND quantity_reserved >= 0),
    CONSTRAINT stock_level_reserved_not_exceed_on_hand CHECK (quantity_reserved <= quantity_on_hand),
    CONSTRAINT stock_level_reorder_point_non_negative CHECK (reorder_point >= 0),
    CONSTRAINT stock_level_max_stock_positive CHECK (max_stock_level IS NULL OR max_stock_level > 0)
);

-- =====================================================
-- AI WORKSPACE TABLES
-- =====================================================

CREATE TABLE IF NOT EXISTS ai_conversation (
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
    CONSTRAINT ai_conv_title_length CHECK (char_length(title) BETWEEN 1 AND 200),
    CONSTRAINT ai_conv_total_messages_non_negative CHECK (total_messages >= 0),
    CONSTRAINT ai_conv_total_tokens_non_negative CHECK (total_tokens_used >= 0)
);

CREATE TABLE IF NOT EXISTS ai_message (
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

CREATE TABLE IF NOT EXISTS ai_message_2024_q4 PARTITION OF ai_message FOR VALUES FROM ('2024-10-01') TO ('2025-01-01');
CREATE TABLE IF NOT EXISTS ai_message_2025_q1 PARTITION OF ai_message FOR VALUES FROM ('2025-01-01') TO ('2025-04-01');
CREATE TABLE IF NOT EXISTS ai_message_2025_q2 PARTITION OF ai_message FOR VALUES FROM ('2025-04-01') TO ('2025-07-01');
CREATE TABLE IF NOT EXISTS ai_message_2025_q3 PARTITION OF ai_message FOR VALUES FROM ('2025-07-01') TO ('2025-10-01');

CREATE TABLE IF NOT EXISTS ai_dataset (
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
    CONSTRAINT ai_dataset_name_length CHECK (char_length(name) BETWEEN 1 AND 200),
    CONSTRAINT ai_dataset_file_size_positive CHECK (file_size_bytes IS NULL OR file_size_bytes > 0),
    CONSTRAINT ai_dataset_record_count_positive CHECK (record_count IS NULL OR record_count >= 0),
    CONSTRAINT ai_dataset_file_url_format CHECK (file_url IS NULL OR file_url ~ '^https?://.*')
);

CREATE TABLE IF NOT EXISTS ai_prompt_template (
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
    CONSTRAINT ai_prompt_name_length CHECK (char_length(name) BETWEEN 1 AND 200),
    CONSTRAINT ai_prompt_template_not_empty CHECK (char_length(template_text) > 0),
    CONSTRAINT ai_prompt_usage_count_non_negative CHECK (usage_count >= 0)
);

-- =====================================================
-- CUSTOMER OPERATIONS TABLES
-- =====================================================

CREATE TABLE IF NOT EXISTS customer (
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
    CONSTRAINT customer_name_length CHECK (char_length(name) BETWEEN 1 AND 200),
    CONSTRAINT customer_email_format CHECK (email IS NULL OR email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
    CONSTRAINT customer_lifetime_value_non_negative CHECK (lifetime_value >= 0),
    CONSTRAINT customer_last_interaction_after_acquisition CHECK (
        last_interaction_date IS NULL OR acquisition_date IS NULL OR last_interaction_date >= acquisition_date
    )
);

CREATE TABLE IF NOT EXISTS customer_interaction (
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

CREATE TABLE IF NOT EXISTS customer_interaction_2024_q4 PARTITION OF customer_interaction FOR VALUES FROM ('2024-10-01') TO ('2025-01-01');
CREATE TABLE IF NOT EXISTS customer_interaction_2025_q1 PARTITION OF customer_interaction FOR VALUES FROM ('2025-01-01') TO ('2025-04-01');
CREATE TABLE IF NOT EXISTS customer_interaction_2025_q2 PARTITION OF customer_interaction FOR VALUES FROM ('2025-04-01') TO ('2025-07-01');
CREATE TABLE IF NOT EXISTS customer_interaction_2025_q3 PARTITION OF customer_interaction FOR VALUES FROM ('2025-07-01') TO ('2025-10-01');

CREATE TABLE IF NOT EXISTS support_ticket (
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
    CONSTRAINT ticket_title_length CHECK (char_length(title) BETWEEN 1 AND 500),
    CONSTRAINT ticket_description_not_empty CHECK (char_length(description) > 0),
    CONSTRAINT ticket_first_response_after_creation CHECK (first_response_at IS NULL OR first_response_at >= created_at),
    CONSTRAINT ticket_resolved_after_creation CHECK (resolved_at IS NULL OR resolved_at >= created_at),
    CONSTRAINT ticket_closed_after_resolved CHECK (closed_at IS NULL OR resolved_at IS NULL OR closed_at >= resolved_at)
);

CREATE TABLE IF NOT EXISTS ticket_comment (
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
-- INTEGRATION AND AUTOMATION TABLES
-- =====================================================

CREATE TABLE IF NOT EXISTS integration_connector (
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
    CONSTRAINT connector_name_length CHECK (char_length(name) BETWEEN 1 AND 200),
    CONSTRAINT connector_sync_frequency_positive CHECK (sync_frequency_minutes > 0),
    CONSTRAINT connector_retry_count_non_negative CHECK (retry_count >= 0),
    CONSTRAINT connector_max_retries_positive CHECK (max_retries > 0)
);

CREATE TABLE IF NOT EXISTS data_import (
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

CREATE TABLE IF NOT EXISTS automation_pipeline (
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
    CONSTRAINT pipeline_name_length CHECK (char_length(name) BETWEEN 1 AND 200),
    CONSTRAINT pipeline_execution_count_non_negative CHECK (execution_count >= 0),
    CONSTRAINT pipeline_error_count_non_negative CHECK (error_count >= 0),
    CONSTRAINT pipeline_next_execution_after_last CHECK (next_execution_at IS NULL OR last_execution_at IS NULL OR next_execution_at >= last_execution_at)
);

CREATE TABLE IF NOT EXISTS pipeline_execution (
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

CREATE TABLE IF NOT EXISTS pipeline_execution_2024_q4 PARTITION OF pipeline_execution FOR VALUES FROM ('2024-10-01') TO ('2025-01-01');
CREATE TABLE IF NOT EXISTS pipeline_execution_2025_q1 PARTITION OF pipeline_execution FOR VALUES FROM ('2025-01-01') TO ('2025-04-01');
CREATE TABLE IF NOT EXISTS pipeline_execution_2025_q2 PARTITION OF pipeline_execution FOR VALUES FROM ('2025-04-01') TO ('2025-07-01');
CREATE TABLE IF NOT EXISTS pipeline_execution_2025_q3 PARTITION OF pipeline_execution FOR VALUES FROM ('2025-07-01') TO ('2025-10-01');

CREATE TABLE IF NOT EXISTS integration_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    connector_id uuid REFERENCES integration_connector(id) ON DELETE CASCADE,
    pipeline_id uuid REFERENCES automation_pipeline(id) ON DELETE CASCADE,
    import_id uuid REFERENCES data_import(id) ON DELETE CASCADE,
    level text NOT NULL DEFAULT 'info',
    message text NOT NULL,
    metadata jsonb DEFAULT '{}',
    timestamp timestamptz DEFAULT now(),
    CONSTRAINT log_level_valid CHECK (level IN ('debug','info','warn','error','fatal')),
    CONSTRAINT log_message_not_empty CHECK (char_length(message) > 0)
);

-- =====================================================
-- DASHBOARDS AND OBSERVABILITY TABLES
-- =====================================================

CREATE TABLE IF NOT EXISTS dashboard (
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
    CONSTRAINT dashboard_name_length CHECK (char_length(name) BETWEEN 1 AND 200),
    CONSTRAINT dashboard_view_count_non_negative CHECK (view_count >= 0),
    CONSTRAINT dashboard_refresh_interval_positive CHECK (refresh_interval_seconds IS NULL OR refresh_interval_seconds > 0)
);

CREATE TABLE IF NOT EXISTS widget (
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
    CONSTRAINT widget_name_length CHECK (char_length(name) BETWEEN 1 AND 200),
    CONSTRAINT widget_cache_ttl_positive CHECK (cache_ttl_seconds IS NULL OR cache_ttl_seconds > 0)
);

CREATE TABLE IF NOT EXISTS widget_data_cache (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    widget_id uuid NOT NULL REFERENCES widget(id) ON DELETE CASCADE,
    data_hash text NOT NULL,
    cached_data jsonb NOT NULL,
    expires_at timestamptz NOT NULL,
    created_at timestamptz DEFAULT now(),
    CONSTRAINT widget_data_cache_expires_future CHECK (expires_at > created_at)
);

CREATE TABLE IF NOT EXISTS notification (
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
    CONSTRAINT notification_title_length CHECK (char_length(title) BETWEEN 1 AND 200),
    CONSTRAINT notification_message_not_empty CHECK (char_length(message) > 0),
    CONSTRAINT notification_action_url_format CHECK (action_url IS NULL OR action_url ~ '^(/|https?://.*)')
);

CREATE TABLE IF NOT EXISTS system_metric (
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

CREATE TABLE IF NOT EXISTS system_metric_2024_q4 PARTITION OF system_metric FOR VALUES FROM ('2024-10-01') TO ('2025-01-01');
CREATE TABLE IF NOT EXISTS system_metric_2025_q1 PARTITION OF system_metric FOR VALUES FROM ('2025-01-01') TO ('2025-04-01');
CREATE TABLE IF NOT EXISTS system_metric_2025_q2 PARTITION OF system_metric FOR VALUES FROM ('2025-04-01') TO ('2025-07-01');
CREATE TABLE IF NOT EXISTS system_metric_2025_q3 PARTITION OF system_metric FOR VALUES FROM ('2025-07-01') TO ('2025-10-01');

CREATE TABLE IF NOT EXISTS dashboard_favorite (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    dashboard_id uuid NOT NULL REFERENCES dashboard(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    CONSTRAINT dashboard_favorite_unique UNIQUE(user_id, dashboard_id)
);

CREATE TABLE IF NOT EXISTS dashboard_share (
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

CREATE TABLE IF NOT EXISTS alert_rule (
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
    CONSTRAINT alert_rule_name_length CHECK (char_length(name) BETWEEN 1 AND 200),
    CONSTRAINT alert_rule_metric_name_not_empty CHECK (char_length(metric_name) > 0),
    CONSTRAINT alert_rule_cooldown_positive CHECK (cooldown_minutes > 0)
);

-- =====================================================
-- INDEXES (COMPREHENSIVE)
-- =====================================================

-- Organization
CREATE INDEX IF NOT EXISTS idx_organization_slug ON organization(slug);
CREATE INDEX IF NOT EXISTS idx_organization_plan_type ON organization(plan_type);
CREATE INDEX IF NOT EXISTS idx_organization_created_at ON organization(created_at DESC);

-- Profile
CREATE INDEX IF NOT EXISTS idx_profile_org_id ON profile(org_id);
CREATE INDEX IF NOT EXISTS idx_profile_role ON profile(role);
CREATE INDEX IF NOT EXISTS idx_profile_org_role ON profile(org_id, role);
CREATE INDEX IF NOT EXISTS idx_profile_active ON profile(org_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_profile_last_seen ON profile(last_seen_at DESC NULLS LAST);

-- Audit log
CREATE INDEX IF NOT EXISTS idx_audit_log_org_timestamp ON audit_log(org_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_timestamp ON audit_log(user_id, timestamp DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_log_table_action ON audit_log(table_name, action);
CREATE INDEX IF NOT EXISTS idx_audit_log_record_id ON audit_log(record_id) WHERE record_id IS NOT NULL;

-- Brand
CREATE INDEX IF NOT EXISTS idx_brand_org_id ON brand(org_id);
CREATE INDEX IF NOT EXISTS idx_brand_active ON brand(org_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_brand_name_search ON brand USING gin(to_tsvector('english'::regconfig, name));
CREATE INDEX IF NOT EXISTS idx_brand_fulltext ON brand USING gin(to_tsvector('english'::regconfig, name || ' ' || COALESCE(description, ''))) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_brand_name_validation ON brand(org_id, LOWER(name)) WHERE is_active = true;

-- Supplier
CREATE INDEX IF NOT EXISTS idx_supplier_org_id ON supplier(org_id);
CREATE INDEX IF NOT EXISTS idx_supplier_status ON supplier(status);
CREATE INDEX IF NOT EXISTS idx_supplier_org_status ON supplier(org_id, status);
CREATE INDEX IF NOT EXISTS idx_supplier_risk_score ON supplier(risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_supplier_name_search ON supplier USING gin(to_tsvector('english'::regconfig, name));
CREATE INDEX IF NOT EXISTS idx_supplier_performance_tier ON supplier(performance_tier);
CREATE INDEX IF NOT EXISTS idx_supplier_preferred ON supplier(org_id, preferred_supplier) WHERE preferred_supplier = true;
CREATE INDEX IF NOT EXISTS idx_supplier_performance_score ON supplier(performance_score DESC);
CREATE INDEX IF NOT EXISTS idx_supplier_currency ON supplier(currency_code);
CREATE INDEX IF NOT EXISTS idx_supplier_fulltext_enhanced ON supplier USING gin(to_tsvector('english'::regconfig, name || ' ' || COALESCE(contact_email, '') || ' ' || COALESCE(notes, ''))) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_supplier_performance_ranking ON supplier(org_id, performance_tier, performance_score DESC, on_time_delivery_rate DESC) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_supplier_preferred_active ON supplier(org_id, preferred_supplier, status, performance_score DESC) WHERE preferred_supplier = true AND status = 'active';
CREATE INDEX IF NOT EXISTS idx_supplier_currency_performance ON supplier(org_id, currency_code, performance_tier) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_supplier_name_validation ON supplier(org_id, LOWER(name)) WHERE status != 'inactive';

-- Inventory item
CREATE INDEX IF NOT EXISTS idx_inventory_item_org_id ON inventory_item(org_id);
CREATE INDEX IF NOT EXISTS idx_inventory_item_sku ON inventory_item(org_id, sku);
CREATE INDEX IF NOT EXISTS idx_inventory_item_supplier ON inventory_item(supplier_id) WHERE supplier_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_item_category ON inventory_item(category);
CREATE INDEX IF NOT EXISTS idx_inventory_item_active ON inventory_item(org_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_inventory_item_low_stock ON inventory_item(org_id) WHERE quantity_on_hand <= reorder_point AND is_active = true;
CREATE INDEX IF NOT EXISTS idx_inventory_item_search ON inventory_item USING gin(to_tsvector('english'::regconfig, name || ' ' || COALESCE(description, '') || ' ' || sku));
CREATE INDEX IF NOT EXISTS idx_inventory_item_brand ON inventory_item(brand_id) WHERE brand_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_item_vat_rate ON inventory_item(default_vat_rate_type);
CREATE INDEX IF NOT EXISTS idx_inventory_item_batch_tracking ON inventory_item(org_id, batch_tracking) WHERE batch_tracking = true;
CREATE INDEX IF NOT EXISTS idx_inventory_item_expiry_tracking ON inventory_item(org_id, expiry_tracking) WHERE expiry_tracking = true;
CREATE INDEX IF NOT EXISTS idx_inventory_item_serial_tracking ON inventory_item(org_id, serial_tracking) WHERE serial_tracking = true;
CREATE INDEX IF NOT EXISTS idx_inventory_item_cost_price ON inventory_item(cost_price DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_item_tags ON inventory_item USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_inventory_dashboard_active ON inventory_item(org_id, is_active, category, quantity_on_hand) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_inventory_supplier_brand_active ON inventory_item(org_id, supplier_id, brand_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_inventory_pricing ON inventory_item(org_id, unit_price, cost_price, markup_percentage) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_inventory_reorder_alert ON inventory_item(org_id, quantity_on_hand, reorder_point, supplier_id) WHERE is_active = true AND quantity_on_hand <= reorder_point;
CREATE INDEX IF NOT EXISTS idx_inventory_fulltext_enhanced ON inventory_item USING gin(to_tsvector('english'::regconfig, name || ' ' || COALESCE(description, '') || ' ' || sku || ' ' || COALESCE(alternative_skus::text, '') || ' ' || COALESCE(tags::text, ''))) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_inventory_valuation_daily ON inventory_item(org_id, (quantity_on_hand * unit_price)) WHERE is_active = true AND quantity_on_hand > 0;
CREATE INDEX IF NOT EXISTS idx_inventory_category_performance ON inventory_item(org_id, category, (quantity_on_hand * unit_price)) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_inventory_profit_margin ON inventory_item(((unit_price - cost_price) / NULLIF(unit_price, 0) * 100)) WHERE cost_price > 0 AND unit_price > 0 AND is_active = true;
CREATE INDEX IF NOT EXISTS idx_inventory_sku_validation ON inventory_item(org_id, LOWER(sku)) WHERE is_active = true;

-- Purchase orders
CREATE INDEX IF NOT EXISTS idx_purchase_order_org_id ON purchase_order(org_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_supplier ON purchase_order(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_status ON purchase_order(status);
CREATE INDEX IF NOT EXISTS idx_purchase_order_org_status ON purchase_order(org_id, status);
CREATE INDEX IF NOT EXISTS idx_purchase_order_number ON purchase_order(org_id, po_number);
CREATE INDEX IF NOT EXISTS idx_purchase_order_created_by ON purchase_order(created_by) WHERE created_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_purchase_order_dates ON purchase_order(order_date, expected_delivery_date);
CREATE INDEX IF NOT EXISTS idx_purchase_order_approval ON purchase_order(org_id, status) WHERE status = 'pending_approval';
CREATE INDEX IF NOT EXISTS idx_po_workflow ON purchase_order(org_id, status, created_at DESC, total_amount) WHERE status IN ('pending_approval','approved','sent');
CREATE INDEX IF NOT EXISTS idx_po_supplier_history ON purchase_order(supplier_id, order_date DESC, total_amount, status) WHERE status = 'completed';
CREATE INDEX IF NOT EXISTS idx_po_delivery_performance ON purchase_order(supplier_id, expected_delivery_date, actual_delivery_date) WHERE actual_delivery_date IS NOT NULL AND expected_delivery_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_po_financial_reporting ON purchase_order(org_id, order_date, total_amount, tax_amount, status) WHERE status IN ('completed','partially_received');

-- Purchase order items
CREATE INDEX IF NOT EXISTS idx_purchase_order_item_po ON purchase_order_item(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_item_inventory ON purchase_order_item(inventory_item_id);

-- Stock movement
CREATE INDEX IF NOT EXISTS idx_stock_movement_org_date ON stock_movement(org_id, movement_date DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movement_item_date ON stock_movement(inventory_item_id, movement_date DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movement_type ON stock_movement(movement_type);
CREATE INDEX IF NOT EXISTS idx_stock_movement_reference ON stock_movement(reference_table, reference_id) WHERE reference_table IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stock_movement_batch ON stock_movement(batch_number) WHERE batch_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stock_movement_serial ON stock_movement(serial_number) WHERE serial_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stock_movement_created_by ON stock_movement(created_by) WHERE created_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stock_movement_timeseries ON stock_movement(org_id, movement_date DESC, movement_type, total_cost);
CREATE INDEX IF NOT EXISTS idx_stock_movement_item_analysis ON stock_movement(inventory_item_id, movement_date DESC, movement_type, quantity_change);
CREATE INDEX IF NOT EXISTS idx_stock_movement_location ON stock_movement(org_id, location_to, location_from, movement_date DESC) WHERE location_to IS NOT NULL OR location_from IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stock_movement_cost_analysis ON stock_movement(org_id, movement_type, movement_date, total_cost) WHERE total_cost IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stock_movement_batch_tracking ON stock_movement(org_id, batch_number, expiry_date, movement_date DESC) WHERE batch_number IS NOT NULL;
-- Removed monthly date_trunc index due to non-IMMUTABLE function in index expression
-- CREATE INDEX IF NOT EXISTS idx_stock_movement_monthly ON stock_movement(org_id, date_trunc('month', movement_date), movement_type);

-- Price lists
CREATE INDEX IF NOT EXISTS idx_price_list_org_id ON price_list(org_id);
CREATE INDEX IF NOT EXISTS idx_price_list_default ON price_list(org_id, is_default) WHERE is_default = true;
CREATE INDEX IF NOT EXISTS idx_price_list_effective ON price_list(effective_from, effective_until);
CREATE INDEX IF NOT EXISTS idx_price_list_currency ON price_list(currency_code);

-- Price list items
CREATE INDEX IF NOT EXISTS idx_price_list_item_list ON price_list_item(price_list_id);
CREATE INDEX IF NOT EXISTS idx_price_list_item_inventory ON price_list_item(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_price_list_item_effective ON price_list_item(effective_from, effective_until);
CREATE INDEX IF NOT EXISTS idx_price_list_item_current ON price_list_item(price_list_id, inventory_item_id) WHERE effective_until IS NULL;
CREATE INDEX IF NOT EXISTS idx_price_list_current_pricing ON price_list_item(inventory_item_id, price_list_id, effective_from DESC) WHERE effective_until IS NULL;
CREATE INDEX IF NOT EXISTS idx_price_list_comparison ON price_list_item(inventory_item_id, price, vat_rate, effective_from) WHERE effective_until IS NULL;
CREATE INDEX IF NOT EXISTS idx_price_list_vat_reporting ON price_list_item(vat_rate_type, vat_rate, effective_from) WHERE effective_until IS NULL;

-- Price change history
CREATE INDEX IF NOT EXISTS idx_price_change_item_date ON price_change_history(inventory_item_id, effective_date DESC);
CREATE INDEX IF NOT EXISTS idx_price_change_reason ON price_change_history(change_reason);
CREATE INDEX IF NOT EXISTS idx_price_change_changed_by ON price_change_history(changed_by);

-- Supplier product
CREATE INDEX IF NOT EXISTS idx_supplier_product_supplier ON supplier_product(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_product_item ON supplier_product(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_supplier_product_preferred ON supplier_product(inventory_item_id, is_preferred) WHERE is_preferred = true;
CREATE INDEX IF NOT EXISTS idx_supplier_product_active ON supplier_product(supplier_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_supplier_product_cost_update ON supplier_product(last_cost_update_date DESC);
CREATE INDEX IF NOT EXISTS idx_supplier_product_preferred_2 ON supplier_product(inventory_item_id, is_preferred, cost_price) WHERE is_preferred = true AND is_active = true;
CREATE INDEX IF NOT EXISTS idx_supplier_product_cost_comparison ON supplier_product(inventory_item_id, cost_price ASC, lead_time_days) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_supplier_product_catalog ON supplier_product(supplier_id, is_active, last_cost_update_date DESC) WHERE is_active = true;

-- Stock level
CREATE INDEX IF NOT EXISTS idx_stock_level_org_location ON stock_level(org_id, location_code);
CREATE INDEX IF NOT EXISTS idx_stock_level_item_location ON stock_level(inventory_item_id, location_code);
CREATE INDEX IF NOT EXISTS idx_stock_level_low_stock ON stock_level(org_id) WHERE quantity_on_hand <= reorder_point;
CREATE INDEX IF NOT EXISTS idx_stock_level_zero_stock ON stock_level(org_id) WHERE quantity_on_hand = 0;
CREATE INDEX IF NOT EXISTS idx_stock_level_last_counted ON stock_level(last_counted_date) WHERE last_counted_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stock_level_location_summary ON stock_level(org_id, location_code, quantity_on_hand DESC, quantity_reserved);
CREATE INDEX IF NOT EXISTS idx_stock_level_item_locations ON stock_level(inventory_item_id, quantity_available DESC, location_code) WHERE quantity_on_hand > 0;
-- Removed CURRENT_DATE usage to satisfy IMMUTABLE predicate requirement
CREATE INDEX IF NOT EXISTS idx_stock_level_cycle_count ON stock_level(org_id, last_counted_date ASC NULLS FIRST, location_code) WHERE last_counted_date IS NULL;

-- AI workspace
CREATE INDEX IF NOT EXISTS idx_ai_conversation_org_id ON ai_conversation(org_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversation_user ON ai_conversation(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversation_org_user ON ai_conversation(org_id, user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversation_created ON ai_conversation(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_conversation_updated ON ai_conversation(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_conversation_pinned ON ai_conversation(org_id, is_pinned) WHERE is_pinned = true;
CREATE INDEX IF NOT EXISTS idx_ai_conversation_archived ON ai_conversation(is_archived);
CREATE INDEX IF NOT EXISTS idx_ai_conversation_search ON ai_conversation USING gin(to_tsvector('english'::regconfig, title));
CREATE INDEX IF NOT EXISTS idx_ai_message_2024_q4_conversation ON ai_message_2024_q4(conversation_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ai_message_2024_q4_role ON ai_message_2024_q4(role);
CREATE INDEX IF NOT EXISTS idx_ai_message_2025_q1_conversation ON ai_message_2025_q1(conversation_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ai_message_2025_q1_role ON ai_message_2025_q1(role);
CREATE INDEX IF NOT EXISTS idx_ai_message_2025_q2_conversation ON ai_message_2025_q2(conversation_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ai_message_2025_q2_role ON ai_message_2025_q2(role);
CREATE INDEX IF NOT EXISTS idx_ai_message_2025_q3_conversation ON ai_message_2025_q3(conversation_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ai_message_2025_q3_role ON ai_message_2025_q3(role);
CREATE INDEX IF NOT EXISTS idx_ai_dataset_org_id ON ai_dataset(org_id);
CREATE INDEX IF NOT EXISTS idx_ai_dataset_created_by ON ai_dataset(created_by);
CREATE INDEX IF NOT EXISTS idx_ai_dataset_type ON ai_dataset(data_type);
CREATE INDEX IF NOT EXISTS idx_ai_dataset_public ON ai_dataset(org_id, is_public);
CREATE INDEX IF NOT EXISTS idx_ai_dataset_search ON ai_dataset USING gin(to_tsvector('english'::regconfig, name || ' ' || COALESCE(description, '')));
CREATE INDEX IF NOT EXISTS idx_ai_prompt_org_id ON ai_prompt_template(org_id);
CREATE INDEX IF NOT EXISTS idx_ai_prompt_created_by ON ai_prompt_template(created_by);
CREATE INDEX IF NOT EXISTS idx_ai_prompt_category ON ai_prompt_template(category);
CREATE INDEX IF NOT EXISTS idx_ai_prompt_public ON ai_prompt_template(org_id, is_public);
CREATE INDEX IF NOT EXISTS idx_ai_prompt_usage ON ai_prompt_template(usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_ai_prompt_search ON ai_prompt_template USING gin(to_tsvector('english'::regconfig, name || ' ' || COALESCE(description, '')));

-- Customer ops
CREATE INDEX IF NOT EXISTS idx_customer_org_id ON customer(org_id);
CREATE INDEX IF NOT EXISTS idx_customer_status ON customer(status);
CREATE INDEX IF NOT EXISTS idx_customer_segment ON customer(segment);
CREATE INDEX IF NOT EXISTS idx_customer_org_status ON customer(org_id, status);
CREATE INDEX IF NOT EXISTS idx_customer_email ON customer(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customer_company ON customer(company) WHERE company IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customer_acquisition_date ON customer(acquisition_date DESC) WHERE acquisition_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customer_lifetime_value ON customer(lifetime_value DESC) WHERE lifetime_value > 0;
CREATE INDEX IF NOT EXISTS idx_customer_last_interaction ON customer(last_interaction_date DESC) WHERE last_interaction_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customer_search ON customer USING gin(to_tsvector('english'::regconfig, name || ' ' || COALESCE(company, '') || ' ' || COALESCE(email, '')));
CREATE INDEX IF NOT EXISTS idx_customer_interaction_2024_q4_org ON customer_interaction_2024_q4(org_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_customer_interaction_2024_q4_customer ON customer_interaction_2024_q4(customer_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_customer_interaction_2024_q4_user ON customer_interaction_2024_q4(user_id, timestamp DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customer_interaction_2024_q4_channel ON customer_interaction_2024_q4(channel);
CREATE INDEX IF NOT EXISTS idx_customer_interaction_2024_q4_type ON customer_interaction_2024_q4(type);
CREATE INDEX IF NOT EXISTS idx_customer_interaction_2024_q4_sentiment ON customer_interaction_2024_q4(sentiment);
CREATE INDEX IF NOT EXISTS idx_customer_interaction_2025_q1_org ON customer_interaction_2025_q1(org_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_customer_interaction_2025_q1_customer ON customer_interaction_2025_q1(customer_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_customer_interaction_2025_q1_user ON customer_interaction_2025_q1(user_id, timestamp DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customer_interaction_2025_q1_channel ON customer_interaction_2025_q1(channel);
CREATE INDEX IF NOT EXISTS idx_customer_interaction_2025_q1_type ON customer_interaction_2025_q1(type);
CREATE INDEX IF NOT EXISTS idx_customer_interaction_2025_q1_sentiment ON customer_interaction_2025_q1(sentiment);
CREATE INDEX IF NOT EXISTS idx_customer_interaction_2025_q2_org ON customer_interaction_2025_q2(org_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_customer_interaction_2025_q2_customer ON customer_interaction_2025_q2(customer_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_customer_interaction_2025_q2_user ON customer_interaction_2025_q2(user_id, timestamp DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customer_interaction_2025_q2_channel ON customer_interaction_2025_q2(channel);
CREATE INDEX IF NOT EXISTS idx_customer_interaction_2025_q2_type ON customer_interaction_2025_q2(type);
CREATE INDEX IF NOT EXISTS idx_customer_interaction_2025_q2_sentiment ON customer_interaction_2025_q2(sentiment);
CREATE INDEX IF NOT EXISTS idx_customer_interaction_2025_q3_org ON customer_interaction_2025_q3(org_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_customer_interaction_2025_q3_customer ON customer_interaction_2025_q3(customer_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_customer_interaction_2025_q3_user ON customer_interaction_2025_q3(user_id, timestamp DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customer_interaction_2025_q3_channel ON customer_interaction_2025_q3(channel);
CREATE INDEX IF NOT EXISTS idx_customer_interaction_2025_q3_type ON customer_interaction_2025_q3(type);
CREATE INDEX IF NOT EXISTS idx_customer_interaction_2025_q3_sentiment ON customer_interaction_2025_q3(sentiment);

CREATE INDEX IF NOT EXISTS idx_support_ticket_org_id ON support_ticket(org_id);
CREATE INDEX IF NOT EXISTS idx_support_ticket_customer ON support_ticket(customer_id);
CREATE INDEX IF NOT EXISTS idx_support_ticket_assigned ON support_ticket(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_support_ticket_org_assigned ON support_ticket(org_id, assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_support_ticket_status ON support_ticket(status);
CREATE INDEX IF NOT EXISTS idx_support_ticket_priority ON support_ticket(priority);
CREATE INDEX IF NOT EXISTS idx_support_ticket_org_status ON support_ticket(org_id, status);
CREATE INDEX IF NOT EXISTS idx_support_ticket_org_priority ON support_ticket(org_id, priority);
CREATE INDEX IF NOT EXISTS idx_support_ticket_number ON support_ticket(org_id, ticket_number);
CREATE INDEX IF NOT EXISTS idx_support_ticket_sla ON support_ticket(sla_due_at) WHERE sla_due_at IS NOT NULL AND status IN ('open','in_progress');
CREATE INDEX IF NOT EXISTS idx_support_ticket_created ON support_ticket(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_ticket_search ON support_ticket USING gin(to_tsvector('english'::regconfig, title || ' ' || description));
CREATE INDEX IF NOT EXISTS idx_ticket_comment_ticket ON ticket_comment(ticket_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ticket_comment_user ON ticket_comment(user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ticket_comment_internal ON ticket_comment(is_internal);

-- Integration
CREATE INDEX IF NOT EXISTS idx_integration_connector_org_id ON integration_connector(org_id);
CREATE INDEX IF NOT EXISTS idx_integration_connector_provider ON integration_connector(provider);
CREATE INDEX IF NOT EXISTS idx_integration_connector_status ON integration_connector(status);
CREATE INDEX IF NOT EXISTS idx_integration_connector_org_provider ON integration_connector(org_id, provider);
CREATE INDEX IF NOT EXISTS idx_integration_connector_last_sync ON integration_connector(last_sync_at DESC) WHERE last_sync_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_data_import_org_id ON data_import(org_id);
CREATE INDEX IF NOT EXISTS idx_data_import_connector ON data_import(connector_id) WHERE connector_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_data_import_status ON data_import(status);
CREATE INDEX IF NOT EXISTS idx_data_import_created_by ON data_import(created_by);
CREATE INDEX IF NOT EXISTS idx_data_import_org_status ON data_import(org_id, status);
CREATE INDEX IF NOT EXISTS idx_data_import_created ON data_import(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_automation_pipeline_org_id ON automation_pipeline(org_id);
CREATE INDEX IF NOT EXISTS idx_automation_pipeline_status ON automation_pipeline(status);
CREATE INDEX IF NOT EXISTS idx_automation_pipeline_trigger_type ON automation_pipeline(trigger_type);
CREATE INDEX IF NOT EXISTS idx_automation_pipeline_next_execution ON automation_pipeline(next_execution_at) WHERE next_execution_at IS NOT NULL AND status = 'active';
CREATE INDEX IF NOT EXISTS idx_automation_pipeline_created_by ON automation_pipeline(created_by);
CREATE INDEX IF NOT EXISTS idx_pipeline_execution_2024_q4_pipeline ON pipeline_execution_2024_q4(pipeline_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_pipeline_execution_2024_q4_status ON pipeline_execution_2024_q4(status);
CREATE INDEX IF NOT EXISTS idx_pipeline_execution_2025_q1_pipeline ON pipeline_execution_2025_q1(pipeline_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_pipeline_execution_2025_q1_status ON pipeline_execution_2025_q1(status);
CREATE INDEX IF NOT EXISTS idx_pipeline_execution_2025_q2_pipeline ON pipeline_execution_2025_q2(pipeline_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_pipeline_execution_2025_q2_status ON pipeline_execution_2025_q2(status);
CREATE INDEX IF NOT EXISTS idx_pipeline_execution_2025_q3_pipeline ON pipeline_execution_2025_q3(pipeline_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_pipeline_execution_2025_q3_status ON pipeline_execution_2025_q3(status);
CREATE INDEX IF NOT EXISTS idx_integration_log_org_timestamp ON integration_log(org_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_integration_log_connector ON integration_log(connector_id, timestamp DESC) WHERE connector_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_integration_log_pipeline ON integration_log(pipeline_id, timestamp DESC) WHERE pipeline_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_integration_log_level ON integration_log(level, timestamp DESC);

-- Dashboard
CREATE INDEX IF NOT EXISTS idx_dashboard_org_id ON dashboard(org_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_created_by ON dashboard(created_by);
CREATE INDEX IF NOT EXISTS idx_dashboard_public ON dashboard(org_id, is_public);
CREATE INDEX IF NOT EXISTS idx_dashboard_template ON dashboard(is_template, template_category) WHERE is_template = true;
CREATE INDEX IF NOT EXISTS idx_dashboard_last_viewed ON dashboard(last_viewed_at DESC) WHERE last_viewed_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dashboard_search ON dashboard USING gin(to_tsvector('english'::regconfig, name || ' ' || COALESCE(description, '')));
CREATE INDEX IF NOT EXISTS idx_widget_org_id ON widget(org_id);
CREATE INDEX IF NOT EXISTS idx_widget_dashboard ON widget(dashboard_id);
CREATE INDEX IF NOT EXISTS idx_widget_type ON widget(type);
CREATE INDEX IF NOT EXISTS idx_widget_visible ON widget(dashboard_id, is_visible) WHERE is_visible = true;
CREATE INDEX IF NOT EXISTS idx_widget_last_refreshed ON widget(last_refreshed_at) WHERE last_refreshed_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_widget_cache_widget ON widget_data_cache(widget_id);
CREATE INDEX IF NOT EXISTS idx_widget_cache_expires ON widget_data_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_widget_cache_hash ON widget_data_cache(data_hash);
CREATE INDEX IF NOT EXISTS idx_notification_org_id ON notification(org_id);
CREATE INDEX IF NOT EXISTS idx_notification_user ON notification(user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notification_org_system ON notification(org_id, created_at DESC) WHERE user_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_notification_type ON notification(type);
CREATE INDEX IF NOT EXISTS idx_notification_unread ON notification(user_id, read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notification_expires ON notification(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_system_metric_2024_q4_org_name ON system_metric_2024_q4(org_id, metric_name, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_system_metric_2024_q4_name_timestamp ON system_metric_2024_q4(metric_name, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_system_metric_2025_q1_org_name ON system_metric_2025_q1(org_id, metric_name, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_system_metric_2025_q1_name_timestamp ON system_metric_2025_q1(metric_name, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_system_metric_2025_q2_org_name ON system_metric_2025_q2(org_id, metric_name, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_system_metric_2025_q2_name_timestamp ON system_metric_2025_q2(metric_name, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_system_metric_2025_q3_org_name ON system_metric_2025_q3(org_id, metric_name, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_system_metric_2025_q3_name_timestamp ON system_metric_2025_q3(metric_name, timestamp DESC);

-- Maintenance views (analytics for indexes and tables)
CREATE OR REPLACE VIEW index_usage_stats AS
SELECT
    schemaname,
    relname AS tablename,
    indexrelname AS indexname,
    idx_tup_read,
    idx_tup_fetch,
    idx_scan,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
AND relname IN (
    'inventory_item','supplier','purchase_order','stock_movement',
    'price_list','price_list_item','supplier_product','stock_level','brand'
)
ORDER BY idx_scan DESC;

CREATE OR REPLACE VIEW table_size_summary AS
SELECT
    schemaname,
    relname AS tablename,
    pg_size_pretty(pg_total_relation_size(format('%I.%I', schemaname, relname))) AS total_size,
    pg_size_pretty(pg_relation_size(format('%I.%I', schemaname, relname))) AS table_size,
    n_tup_ins AS inserts,
    n_tup_upd AS updates,
    n_tup_del AS deletes,
    n_live_tup AS live_rows,
    n_dead_tup AS dead_rows
FROM pg_stat_user_tables
WHERE schemaname = 'public'
AND relname IN (
    'inventory_item','supplier','purchase_order','stock_movement',
    'price_list','price_list_item','supplier_product','stock_level','brand'
)
ORDER BY pg_total_relation_size(format('%I.%I', schemaname, relname)) DESC;

-- =====================================================
-- TRIGGER FUNCTIONS
-- =====================================================

-- Update updated_at column
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

-- Update conversation stats
CREATE OR REPLACE FUNCTION update_conversation_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE ai_conversation
        SET total_messages = total_messages + 1,
            total_tokens_used = total_tokens_used + COALESCE(NEW.tokens_used, 0),
            updated_at = now()
        WHERE id = NEW.conversation_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE ai_conversation
        SET total_messages = GREATEST(total_messages - 1, 0),
            total_tokens_used = GREATEST(total_tokens_used - COALESCE(OLD.tokens_used, 0), 0),
            updated_at = now()
        WHERE id = OLD.conversation_id;
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE ai_conversation
        SET total_tokens_used = total_tokens_used - COALESCE(OLD.tokens_used, 0) + COALESCE(NEW.tokens_used, 0),
            updated_at = now()
        WHERE id = NEW.conversation_id;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Update customer last interaction
CREATE OR REPLACE FUNCTION update_customer_last_interaction()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE customer
    SET last_interaction_date = CURRENT_DATE,
        updated_at = now()
    WHERE id = NEW.customer_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update first response time for tickets
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
    SELECT COALESCE(MAX(CAST(substring(ticket_number FROM '\\d+$') AS integer)), 0) + 1
    INTO next_num
    FROM support_ticket
    WHERE org_id = NEW.org_id AND ticket_number ~ '^[A-Z]+-\\d+$';
    NEW.ticket_number := UPPER(org_prefix) || '-' || LPAD(next_num::text, 6, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update pipeline stats
CREATE OR REPLACE FUNCTION update_pipeline_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE automation_pipeline
        SET execution_count = execution_count + 1, last_execution_at = NEW.started_at
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

-- Inventory: update stock levels after movement
CREATE OR REPLACE FUNCTION update_stock_levels_from_movement()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE inventory_item
    SET quantity_on_hand = quantity_on_hand + NEW.quantity_change,
        updated_at = now()
    WHERE id = NEW.inventory_item_id;

    IF NEW.location_to IS NOT NULL THEN
        INSERT INTO stock_level (org_id, inventory_item_id, location_code, location_name, quantity_on_hand)
        SELECT NEW.org_id, NEW.inventory_item_id, NEW.location_to, NEW.location_to, NEW.quantity_change
        ON CONFLICT (org_id, inventory_item_id, location_code)
        DO UPDATE SET quantity_on_hand = stock_level.quantity_on_hand + NEW.quantity_change, updated_at = now();
    END IF;

    IF NEW.location_from IS NOT NULL AND NEW.location_from != NEW.location_to THEN
        UPDATE stock_level
        SET quantity_on_hand = quantity_on_hand - ABS(NEW.quantity_change), updated_at = now()
        WHERE org_id = NEW.org_id AND inventory_item_id = NEW.inventory_item_id AND location_code = NEW.location_from;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Inventory: validate stock movement quantities
CREATE OR REPLACE FUNCTION validate_stock_movement()
RETURNS TRIGGER AS $$
DECLARE
    current_quantity integer;
BEGIN
    SELECT quantity_on_hand INTO current_quantity FROM inventory_item WHERE id = NEW.inventory_item_id;
    IF NEW.quantity_before = 0 THEN
        NEW.quantity_before := COALESCE(current_quantity, 0);
    END IF;
    NEW.quantity_after := NEW.quantity_before + NEW.quantity_change;
    IF NEW.quantity_after < 0 AND NEW.movement_type NOT IN ('adjustment_negative','damaged','expired','stolen') THEN
        RAISE EXCEPTION 'Insufficient stock. Current: %, Requested: %', current_quantity, ABS(NEW.quantity_change);
    END IF;
    IF NEW.unit_cost IS NOT NULL THEN
        NEW.total_cost := ABS(NEW.quantity_change) * NEW.unit_cost;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Inventory: track price changes
CREATE OR REPLACE FUNCTION track_price_changes()
RETURNS TRIGGER AS $$
DECLARE
    old_price numeric(10,2);
    old_vat_rate numeric(5,2);
    change_pct numeric(6,3);
BEGIN
    IF OLD.unit_price != NEW.unit_price OR OLD.default_vat_rate != NEW.default_vat_rate THEN
        old_price := OLD.unit_price;
        old_vat_rate := OLD.default_vat_rate;
        IF old_price > 0 THEN
            change_pct := ((NEW.unit_price - old_price) / old_price) * 100;
        END IF;
        INSERT INTO price_change_history (
            inventory_item_id, old_price, new_price, old_vat_rate, new_vat_rate, change_reason, change_percentage, changed_by
        ) VALUES (
            NEW.id, old_price, NEW.unit_price, old_vat_rate, NEW.default_vat_rate, 'manual', change_pct, auth.uid()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Supplier performance update (based on PO delivery)
CREATE OR REPLACE FUNCTION update_supplier_performance()
RETURNS TRIGGER AS $$
DECLARE
    supplier_id_val uuid;
    total_orders integer;
    on_time_orders integer;
    delivery_rate numeric(5,2);
    performance_score_val numeric(5,2);
    performance_tier_val supplier_performance_tier;
BEGIN
    SELECT supplier_id INTO supplier_id_val FROM purchase_order WHERE id = NEW.purchase_order_id;
    SELECT COUNT(*) AS total,
           COUNT(*) FILTER (WHERE actual_delivery_date <= expected_delivery_date) AS on_time
    INTO total_orders, on_time_orders
    FROM purchase_order
    WHERE supplier_id = supplier_id_val AND status = 'completed' AND actual_delivery_date IS NOT NULL AND expected_delivery_date IS NOT NULL;

    IF total_orders > 0 THEN
        delivery_rate := (on_time_orders::numeric / total_orders::numeric) * 100;
        performance_score_val := delivery_rate;
        CASE
            WHEN performance_score_val >= 95 THEN performance_tier_val := 'platinum';
            WHEN performance_score_val >= 85 THEN performance_tier_val := 'gold';
            WHEN performance_score_val >= 70 THEN performance_tier_val := 'silver';
            WHEN performance_score_val >= 50 THEN performance_tier_val := 'bronze';
            ELSE performance_tier_val := 'unrated';
        END CASE;
        UPDATE supplier
        SET on_time_delivery_rate = delivery_rate,
            performance_score = performance_score_val,
            performance_tier = performance_tier_val,
            last_evaluation_date = CURRENT_DATE,
            updated_at = now()
        WHERE id = supplier_id_val;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Dashboard utilities
CREATE OR REPLACE FUNCTION increment_dashboard_views()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE dashboard
    SET view_count = view_count + 1, last_viewed_at = now()
    WHERE id = NEW.dashboard_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION clean_expired_widget_cache()
RETURNS void AS $$
BEGIN
    DELETE FROM widget_data_cache WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION clean_expired_notifications()
RETURNS void AS $$
BEGIN
    DELETE FROM notification WHERE expires_at IS NOT NULL AND expires_at < now();
END;
$$ LANGUAGE plpgsql;

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
        SELECT metric_value INTO latest_value
        FROM system_metric
        WHERE metric_name = rule_record.metric_name
          AND org_id = rule_record.org_id
        ORDER BY timestamp DESC
        LIMIT 1;

        threshold := (rule_record.condition->>'threshold')::numeric;
        IF rule_record.condition->>'operator' = '>' AND latest_value > threshold THEN
            should_trigger := true;
        ELSIF rule_record.condition->>'operator' = '<' AND latest_value < threshold THEN
            should_trigger := true;
        END IF;

        IF should_trigger THEN
            INSERT INTO notification (org_id, type, title, message, metadata)
            VALUES (
                rule_record.org_id,
                rule_record.severity,
                'Alert: ' || rule_record.name,
                format('Metric %s has value %s which exceeds threshold %s', rule_record.metric_name, latest_value, threshold),
                jsonb_build_object('alert_rule_id', rule_record.id, 'metric_value', latest_value)
            );
            UPDATE alert_rule SET last_triggered_at = now() WHERE id = rule_record.id;
        END IF;
        should_trigger := false;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Updated timestamp triggers
DROP TRIGGER IF EXISTS update_organization_updated_at ON organization; CREATE TRIGGER update_organization_updated_at BEFORE UPDATE ON organization FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_profile_updated_at ON profile; CREATE TRIGGER update_profile_updated_at BEFORE UPDATE ON profile FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_supplier_updated_at ON supplier; CREATE TRIGGER update_supplier_updated_at BEFORE UPDATE ON supplier FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_inventory_item_updated_at ON inventory_item; CREATE TRIGGER update_inventory_item_updated_at BEFORE UPDATE ON inventory_item FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_purchase_order_updated_at ON purchase_order; CREATE TRIGGER update_purchase_order_updated_at BEFORE UPDATE ON purchase_order FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_purchase_order_item_updated_at ON purchase_order_item; CREATE TRIGGER update_purchase_order_item_updated_at BEFORE UPDATE ON purchase_order_item FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_ai_conversation_updated_at ON ai_conversation; CREATE TRIGGER update_ai_conversation_updated_at BEFORE UPDATE ON ai_conversation FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_ai_dataset_updated_at ON ai_dataset; CREATE TRIGGER update_ai_dataset_updated_at BEFORE UPDATE ON ai_dataset FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_ai_prompt_template_updated_at ON ai_prompt_template; CREATE TRIGGER update_ai_prompt_template_updated_at BEFORE UPDATE ON ai_prompt_template FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_customer_updated_at ON customer; CREATE TRIGGER update_customer_updated_at BEFORE UPDATE ON customer FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_support_ticket_updated_at ON support_ticket; CREATE TRIGGER update_support_ticket_updated_at BEFORE UPDATE ON support_ticket FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_integration_connector_updated_at ON integration_connector; CREATE TRIGGER update_integration_connector_updated_at BEFORE UPDATE ON integration_connector FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_data_import_updated_at ON data_import; CREATE TRIGGER update_data_import_updated_at BEFORE UPDATE ON data_import FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_automation_pipeline_updated_at ON automation_pipeline; CREATE TRIGGER update_automation_pipeline_updated_at BEFORE UPDATE ON automation_pipeline FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_dashboard_updated_at ON dashboard; CREATE TRIGGER update_dashboard_updated_at BEFORE UPDATE ON dashboard FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_widget_updated_at ON widget; CREATE TRIGGER update_widget_updated_at BEFORE UPDATE ON widget FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_alert_rule_updated_at ON alert_rule; CREATE TRIGGER update_alert_rule_updated_at BEFORE UPDATE ON alert_rule FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_brand_updated_at ON brand; CREATE TRIGGER update_brand_updated_at BEFORE UPDATE ON brand FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_price_list_updated_at ON price_list; CREATE TRIGGER update_price_list_updated_at BEFORE UPDATE ON price_list FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_supplier_product_updated_at ON supplier_product; CREATE TRIGGER update_supplier_product_updated_at BEFORE UPDATE ON supplier_product FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_stock_level_updated_at ON stock_level; CREATE TRIGGER update_stock_level_updated_at BEFORE UPDATE ON stock_level FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Audit triggers
DROP TRIGGER IF EXISTS audit_organization ON organization; CREATE TRIGGER audit_organization AFTER INSERT OR UPDATE OR DELETE ON organization FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
DROP TRIGGER IF EXISTS audit_profile ON profile; CREATE TRIGGER audit_profile AFTER INSERT OR UPDATE OR DELETE ON profile FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
DROP TRIGGER IF EXISTS audit_supplier ON supplier; CREATE TRIGGER audit_supplier AFTER INSERT OR UPDATE OR DELETE ON supplier FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
DROP TRIGGER IF EXISTS audit_inventory_item ON inventory_item; CREATE TRIGGER audit_inventory_item AFTER INSERT OR UPDATE OR DELETE ON inventory_item FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
DROP TRIGGER IF EXISTS audit_purchase_order ON purchase_order; CREATE TRIGGER audit_purchase_order AFTER INSERT OR UPDATE OR DELETE ON purchase_order FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
DROP TRIGGER IF EXISTS audit_purchase_order_item ON purchase_order_item; CREATE TRIGGER audit_purchase_order_item AFTER INSERT OR UPDATE OR DELETE ON purchase_order_item FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
DROP TRIGGER IF EXISTS audit_ai_conversation ON ai_conversation; CREATE TRIGGER audit_ai_conversation AFTER INSERT OR UPDATE OR DELETE ON ai_conversation FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
DROP TRIGGER IF EXISTS audit_ai_dataset ON ai_dataset; CREATE TRIGGER audit_ai_dataset AFTER INSERT OR UPDATE OR DELETE ON ai_dataset FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
DROP TRIGGER IF EXISTS audit_ai_prompt_template ON ai_prompt_template; CREATE TRIGGER audit_ai_prompt_template AFTER INSERT OR UPDATE OR DELETE ON ai_prompt_template FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
DROP TRIGGER IF EXISTS audit_customer ON customer; CREATE TRIGGER audit_customer AFTER INSERT OR UPDATE OR DELETE ON customer FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
DROP TRIGGER IF EXISTS audit_support_ticket ON support_ticket; CREATE TRIGGER audit_support_ticket AFTER INSERT OR UPDATE OR DELETE ON support_ticket FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
DROP TRIGGER IF EXISTS audit_ticket_comment ON ticket_comment; CREATE TRIGGER audit_ticket_comment AFTER INSERT OR UPDATE OR DELETE ON ticket_comment FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
DROP TRIGGER IF EXISTS audit_integration_connector ON integration_connector; CREATE TRIGGER audit_integration_connector AFTER INSERT OR UPDATE OR DELETE ON integration_connector FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
DROP TRIGGER IF EXISTS audit_data_import ON data_import; CREATE TRIGGER audit_data_import AFTER INSERT OR UPDATE OR DELETE ON data_import FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
DROP TRIGGER IF EXISTS audit_automation_pipeline ON automation_pipeline; CREATE TRIGGER audit_automation_pipeline AFTER INSERT OR UPDATE OR DELETE ON automation_pipeline FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
DROP TRIGGER IF EXISTS audit_dashboard ON dashboard; CREATE TRIGGER audit_dashboard AFTER INSERT OR UPDATE OR DELETE ON dashboard FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
DROP TRIGGER IF EXISTS audit_widget ON widget; CREATE TRIGGER audit_widget AFTER INSERT OR UPDATE OR DELETE ON widget FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
DROP TRIGGER IF EXISTS audit_alert_rule ON alert_rule; CREATE TRIGGER audit_alert_rule AFTER INSERT OR UPDATE OR DELETE ON alert_rule FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
DROP TRIGGER IF EXISTS audit_brand ON brand; CREATE TRIGGER audit_brand AFTER INSERT OR UPDATE OR DELETE ON brand FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
DROP TRIGGER IF EXISTS audit_stock_movement ON stock_movement; CREATE TRIGGER audit_stock_movement AFTER INSERT OR UPDATE OR DELETE ON stock_movement FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
DROP TRIGGER IF EXISTS audit_price_list ON price_list; CREATE TRIGGER audit_price_list AFTER INSERT OR UPDATE OR DELETE ON price_list FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
DROP TRIGGER IF EXISTS audit_price_list_item ON price_list_item; CREATE TRIGGER audit_price_list_item AFTER INSERT OR UPDATE OR DELETE ON price_list_item FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
DROP TRIGGER IF EXISTS audit_supplier_product ON supplier_product; CREATE TRIGGER audit_supplier_product AFTER INSERT OR UPDATE OR DELETE ON supplier_product FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
DROP TRIGGER IF EXISTS audit_stock_level ON stock_level; CREATE TRIGGER audit_stock_level AFTER INSERT OR UPDATE OR DELETE ON stock_level FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Business logic triggers
DROP TRIGGER IF EXISTS update_po_total_on_item_change ON purchase_order_item; CREATE TRIGGER update_po_total_on_item_change AFTER INSERT OR UPDATE OR DELETE ON purchase_order_item FOR EACH ROW EXECUTE FUNCTION update_purchase_order_total();
DROP TRIGGER IF EXISTS update_conversation_stats_trigger ON ai_message; CREATE TRIGGER update_conversation_stats_trigger AFTER INSERT OR UPDATE OR DELETE ON ai_message FOR EACH ROW EXECUTE FUNCTION update_conversation_stats();
DROP TRIGGER IF EXISTS update_customer_last_interaction_trigger ON customer_interaction; CREATE TRIGGER update_customer_last_interaction_trigger AFTER INSERT ON customer_interaction FOR EACH ROW EXECUTE FUNCTION update_customer_last_interaction();
DROP TRIGGER IF EXISTS update_ticket_first_response_trigger ON ticket_comment; CREATE TRIGGER update_ticket_first_response_trigger AFTER INSERT ON ticket_comment FOR EACH ROW EXECUTE FUNCTION update_ticket_first_response();
DROP TRIGGER IF EXISTS generate_ticket_number_trigger ON support_ticket; CREATE TRIGGER generate_ticket_number_trigger BEFORE INSERT ON support_ticket FOR EACH ROW WHEN (NEW.ticket_number IS NULL OR NEW.ticket_number = '') EXECUTE FUNCTION generate_ticket_number();
DROP TRIGGER IF EXISTS update_pipeline_stats_trigger ON pipeline_execution; CREATE TRIGGER update_pipeline_stats_trigger AFTER INSERT OR UPDATE ON pipeline_execution FOR EACH ROW EXECUTE FUNCTION update_pipeline_stats();
DROP TRIGGER IF EXISTS calculate_execution_duration_trigger ON pipeline_execution; CREATE TRIGGER calculate_execution_duration_trigger BEFORE UPDATE ON pipeline_execution FOR EACH ROW EXECUTE FUNCTION calculate_execution_duration();
DROP TRIGGER IF EXISTS validate_stock_movement_trigger ON stock_movement; CREATE TRIGGER validate_stock_movement_trigger BEFORE INSERT ON stock_movement FOR EACH ROW EXECUTE FUNCTION validate_stock_movement();
DROP TRIGGER IF EXISTS update_stock_levels_trigger ON stock_movement; CREATE TRIGGER update_stock_levels_trigger AFTER INSERT ON stock_movement FOR EACH ROW EXECUTE FUNCTION update_stock_levels_from_movement();
DROP TRIGGER IF EXISTS track_price_changes_trigger ON inventory_item; CREATE TRIGGER track_price_changes_trigger AFTER UPDATE ON inventory_item FOR EACH ROW EXECUTE FUNCTION track_price_changes();

-- =====================================================
-- VIEWS (for analytics and XLSX compatibility)
-- =====================================================

CREATE OR REPLACE VIEW inventory_xlsx_view AS
SELECT
    i.id,
    i.org_id,
    s.name AS supplier_name,
    b.name AS brand,
    i.category::text AS category,
    i.sku,
    i.name AS description,
    i.unit_price AS price,
    i.default_vat_rate AS vat_rate,
    i.quantity_on_hand AS stock_qty,
    i.barcode,
    i.unit_of_measure,
    i.location,
    i.is_active,
    i.created_at,
    i.updated_at
FROM inventory_item i
LEFT JOIN supplier s ON i.supplier_id = s.id
LEFT JOIN brand b ON i.brand_id = b.id
WHERE i.is_active = true;

CREATE OR REPLACE VIEW supplier_performance_view AS
SELECT
    s.id,
    s.org_id,
    s.name,
    s.performance_tier,
    s.performance_score,
    s.on_time_delivery_rate,
    s.quality_rating,
    s.preferred_supplier,
    COUNT(po.id) AS total_orders,
    COUNT(po.id) FILTER (WHERE po.status = 'completed') AS completed_orders,
    AVG(po.total_amount) AS avg_order_value,
    SUM(po.total_amount) FILTER (WHERE po.status = 'completed') AS total_spend,
    s.last_evaluation_date,
    s.created_at
FROM supplier s
LEFT JOIN purchase_order po ON s.id = po.supplier_id
GROUP BY s.id, s.org_id, s.name, s.performance_tier, s.performance_score,
         s.on_time_delivery_rate, s.quality_rating, s.preferred_supplier,
         s.last_evaluation_date, s.created_at;

CREATE OR REPLACE VIEW low_stock_alert_view AS
SELECT
    i.id,
    i.org_id,
    i.sku,
    i.name,
    i.quantity_on_hand,
    i.reorder_point,
    i.max_stock_level,
    s.name AS supplier_name,
    sp.cost_price AS supplier_cost,
    sp.lead_time_days,
    sp.minimum_order_quantity,
    b.name AS brand_name,
    i.category,
    (i.reorder_point - i.quantity_on_hand) AS quantity_needed
FROM inventory_item i
LEFT JOIN supplier_product sp ON i.id = sp.inventory_item_id AND sp.is_preferred = true
LEFT JOIN supplier s ON sp.supplier_id = s.id
LEFT JOIN brand b ON i.brand_id = b.id
WHERE i.is_active = true
  AND i.quantity_on_hand <= i.reorder_point;

CREATE OR REPLACE VIEW stock_movement_summary_view AS
SELECT
    sm.id,
    sm.org_id,
    i.sku,
    i.name AS item_name,
    sm.movement_type,
    sm.quantity_change,
    sm.quantity_before,
    sm.quantity_after,
    sm.unit_cost,
    sm.total_cost,
    sm.reference_number,
    sm.location_from,
    sm.location_to,
    sm.movement_date,
    u.display_name AS created_by_name
FROM stock_movement sm
JOIN inventory_item i ON sm.inventory_item_id = i.id
LEFT JOIN profile u ON sm.created_by = u.id
ORDER BY sm.movement_date DESC;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE 'Mantis NXT unified schema created successfully.';
END;
$$;

