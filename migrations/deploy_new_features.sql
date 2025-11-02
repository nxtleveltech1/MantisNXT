-- Deployment script for new feature tables
-- This script adds ONLY the new tables needed for the 4 feature systems
-- Designed to work with existing MantisNXT database structure

BEGIN;

-- ============================================================================
-- 1. CUSTOMER MANAGEMENT SYSTEM
-- ============================================================================

-- Create customer operations enums
DO $$ BEGIN
    CREATE TYPE customer_segment AS ENUM ('enterprise', 'mid_market', 'smb', 'startup', 'individual');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE customer_status AS ENUM ('active', 'inactive', 'prospect', 'churned', 'suspended');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE interaction_channel AS ENUM ('email', 'phone', 'chat', 'social', 'in_person', 'api', 'web');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE interaction_type AS ENUM ('inquiry', 'complaint', 'compliment', 'feature_request', 'bug_report', 'billing', 'onboarding', 'training');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE sentiment_score AS ENUM ('very_negative', 'negative', 'neutral', 'positive', 'very_positive');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent', 'critical');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE ticket_status AS ENUM ('open', 'in_progress', 'pending_customer', 'resolved', 'closed', 'escalated');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Customers table (simplified - no org_id foreign key for now)
CREATE TABLE IF NOT EXISTS customer (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid, -- Will add FK later if organization table exists
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
    CONSTRAINT customer_email_format CHECK (email IS NULL OR email ~ '^[^@]+@[^@]+\.[^@]+$'),
    CONSTRAINT customer_lifetime_value_non_negative CHECK (lifetime_value >= 0)
);

-- Support tickets table
CREATE TABLE IF NOT EXISTS support_ticket (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid,
    customer_id uuid REFERENCES customer(id) ON DELETE CASCADE,
    assigned_to uuid,
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

    CONSTRAINT ticket_title_length CHECK (char_length(title) >= 1 AND char_length(title) <= 500),
    CONSTRAINT ticket_description_not_empty CHECK (char_length(description) > 0)
);

-- Ticket comments
CREATE TABLE IF NOT EXISTS ticket_comment (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id uuid NOT NULL REFERENCES support_ticket(id) ON DELETE CASCADE,
    user_id uuid,
    content text NOT NULL,
    is_internal boolean DEFAULT false,
    is_resolution boolean DEFAULT false,
    attachments text[] DEFAULT '{}',
    created_at timestamptz DEFAULT now(),

    CONSTRAINT ticket_comment_content_not_empty CHECK (char_length(content) > 0)
);

-- ============================================================================
-- 2. INTEGRATION SYSTEM (WooCommerce & Odoo)
-- ============================================================================

-- Integration enums
DO $$ BEGIN
    CREATE TYPE integration_provider AS ENUM (
        'salesforce', 'hubspot', 'zendesk', 'slack', 'microsoft_teams',
        'shopify', 'stripe', 'quickbooks', 'mailchimp', 'google_workspace',
        'aws', 'azure', 'custom_api', 'webhook', 'csv_upload', 'database',
        'woocommerce', 'odoo'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE connector_status AS ENUM ('active', 'inactive', 'error', 'configuring', 'authenticating');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE sync_status AS ENUM ('pending', 'in_progress', 'completed', 'failed', 'partial');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Integration connectors
CREATE TABLE IF NOT EXISTS integration_connector (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid,
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
    created_by uuid,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    CONSTRAINT connector_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 200)
);

-- WooCommerce sync tracking
CREATE TABLE IF NOT EXISTS woocommerce_sync (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    connector_id uuid NOT NULL REFERENCES integration_connector(id) ON DELETE CASCADE,
    entity_type text NOT NULL, -- 'product', 'order', 'customer'
    local_id uuid NOT NULL,
    remote_id text NOT NULL,
    last_sync_at timestamptz DEFAULT now(),
    sync_status sync_status DEFAULT 'completed',
    sync_direction text, -- 'to_woo', 'from_woo', 'bidirectional'
    last_modified_at timestamptz,
    sync_hash text,
    error_count integer DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    CONSTRAINT woocommerce_sync_unique UNIQUE (connector_id, entity_type, local_id)
);

-- Odoo sync tracking
CREATE TABLE IF NOT EXISTS odoo_sync (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    connector_id uuid NOT NULL REFERENCES integration_connector(id) ON DELETE CASCADE,
    entity_type text NOT NULL, -- 'product', 'partner', 'purchase_order', 'stock'
    odoo_model text NOT NULL, -- 'product.product', 'res.partner', etc.
    local_id uuid NOT NULL,
    remote_id integer NOT NULL,
    last_sync_at timestamptz DEFAULT now(),
    sync_status sync_status DEFAULT 'completed',
    sync_direction text,
    last_modified_at timestamptz,
    sync_hash text,
    error_count integer DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    CONSTRAINT odoo_sync_unique UNIQUE (connector_id, entity_type, local_id)
);

-- Integration mapping (generic ID mapping)
CREATE TABLE IF NOT EXISTS integration_mapping (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    connector_id uuid NOT NULL REFERENCES integration_connector(id) ON DELETE CASCADE,
    entity_type text NOT NULL,
    local_id uuid NOT NULL,
    remote_id text NOT NULL,
    remote_system text NOT NULL,
    metadata jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    CONSTRAINT integration_mapping_unique UNIQUE (connector_id, entity_type, local_id)
);

-- ============================================================================
-- 3. PRICING & OPTIMIZATION SYSTEM
-- ============================================================================

-- Pricing enums
DO $$ BEGIN
    CREATE TYPE pricing_strategy AS ENUM ('cost_plus', 'market_based', 'value_based', 'competitive', 'dynamic', 'tiered');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE price_tier AS ENUM ('standard', 'wholesale', 'retail', 'vip', 'promotional');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Pricing rules
CREATE TABLE IF NOT EXISTS pricing_rule (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid,
    name text NOT NULL,
    strategy pricing_strategy NOT NULL,
    product_id uuid,
    category_id uuid,
    base_cost numeric(12,2),
    markup_percentage numeric(5,2),
    fixed_margin numeric(12,2),
    min_price numeric(12,2),
    max_price numeric(12,2),
    tier price_tier DEFAULT 'standard',
    conditions jsonb DEFAULT '{}',
    is_active boolean DEFAULT true,
    priority integer DEFAULT 0,
    valid_from timestamptz,
    valid_until timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Pricing optimization runs
CREATE TABLE IF NOT EXISTS pricing_optimization (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid,
    name text NOT NULL,
    description text,
    status text DEFAULT 'pending',
    analysis_period_start timestamptz,
    analysis_period_end timestamptz,
    products_analyzed integer DEFAULT 0,
    recommendations_generated integer DEFAULT 0,
    potential_revenue_impact numeric(12,2),
    analysis_data jsonb DEFAULT '{}',
    created_by uuid,
    started_at timestamptz,
    completed_at timestamptz,
    created_at timestamptz DEFAULT now()
);

-- Pricing recommendations
CREATE TABLE IF NOT EXISTS pricing_recommendation (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid,
    optimization_id uuid REFERENCES pricing_optimization(id) ON DELETE CASCADE,
    product_id uuid,
    current_price numeric(12,2),
    recommended_price numeric(12,2),
    recommendation_type text,
    confidence_score numeric(5,2),
    reasoning text,
    data_points jsonb DEFAULT '{}',
    estimated_impact jsonb DEFAULT '{}',
    status text DEFAULT 'pending',
    reviewed_by uuid,
    reviewed_at timestamptz,
    applied_at timestamptz,
    created_at timestamptz DEFAULT now()
);

-- Competitor pricing
CREATE TABLE IF NOT EXISTS competitor_pricing (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid,
    product_id uuid,
    competitor_name text NOT NULL,
    competitor_price numeric(12,2) NOT NULL,
    currency text DEFAULT 'USD',
    source_url text,
    scraped_at timestamptz DEFAULT now(),
    verified_at timestamptz,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

-- ============================================================================
-- 4. LOYALTY & REWARDS SYSTEM
-- ============================================================================

-- Loyalty enums
DO $$ BEGIN
    CREATE TYPE loyalty_tier AS ENUM ('bronze', 'silver', 'gold', 'platinum', 'diamond');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE reward_type AS ENUM ('points', 'discount', 'cashback', 'free_shipping', 'upgrade', 'gift');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE transaction_type AS ENUM ('earn', 'redeem', 'expire', 'adjust', 'bonus');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Loyalty programs
CREATE TABLE IF NOT EXISTS loyalty_program (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid,
    name text NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    is_default boolean DEFAULT false,
    earn_rate numeric(10,4) DEFAULT 1.0,
    tier_thresholds jsonb DEFAULT '{}',
    tier_benefits jsonb DEFAULT '{}',
    points_expiry_days integer,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Customer loyalty enrollment
CREATE TABLE IF NOT EXISTS customer_loyalty (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid,
    customer_id uuid REFERENCES customer(id) ON DELETE CASCADE,
    program_id uuid REFERENCES loyalty_program(id) ON DELETE CASCADE,
    current_tier loyalty_tier DEFAULT 'bronze',
    total_points_earned integer DEFAULT 0,
    total_points_redeemed integer DEFAULT 0,
    points_balance integer DEFAULT 0,
    tier_qualified_date timestamptz,
    lifetime_value numeric(12,2) DEFAULT 0,
    referral_count integer DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    CONSTRAINT customer_loyalty_unique UNIQUE (customer_id, program_id),
    CONSTRAINT points_balance_non_negative CHECK (points_balance >= 0)
);

-- Loyalty transactions
CREATE TABLE IF NOT EXISTS loyalty_transaction (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid,
    customer_id uuid REFERENCES customer(id) ON DELETE CASCADE,
    program_id uuid REFERENCES loyalty_program(id) ON DELETE CASCADE,
    transaction_type transaction_type NOT NULL,
    points_amount integer NOT NULL,
    reference_type text,
    reference_id uuid,
    description text,
    expires_at timestamptz,
    created_by uuid,
    created_at timestamptz DEFAULT now()
);

-- Reward catalog
CREATE TABLE IF NOT EXISTS reward_catalog (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid,
    program_id uuid REFERENCES loyalty_program(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    reward_type reward_type NOT NULL,
    points_required integer NOT NULL,
    monetary_value numeric(12,2),
    max_redemptions_per_customer integer,
    stock_quantity integer,
    is_active boolean DEFAULT true,
    is_featured boolean DEFAULT false,
    valid_from timestamptz,
    valid_until timestamptz,
    terms_conditions jsonb DEFAULT '{}',
    image_url text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    CONSTRAINT reward_points_positive CHECK (points_required > 0)
);

-- Reward redemptions
CREATE TABLE IF NOT EXISTS reward_redemption (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid,
    customer_id uuid REFERENCES customer(id) ON DELETE CASCADE,
    reward_id uuid REFERENCES reward_catalog(id) ON DELETE CASCADE,
    points_spent integer NOT NULL,
    monetary_value_used numeric(12,2),
    status text DEFAULT 'pending',
    redemption_code text UNIQUE,
    redeemed_at timestamptz DEFAULT now(),
    expires_at timestamptz,
    fulfilled_at timestamptz,
    fulfilled_by uuid,
    fulfillment_notes text,
    created_at timestamptz DEFAULT now()
);

-- ============================================================================
-- Create Indexes for Performance
-- ============================================================================

-- Customer indexes
CREATE INDEX IF NOT EXISTS idx_customer_org_id ON customer(org_id);
CREATE INDEX IF NOT EXISTS idx_customer_email ON customer(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customer_status ON customer(status);

-- Support ticket indexes
CREATE INDEX IF NOT EXISTS idx_support_ticket_customer_id ON support_ticket(customer_id);
CREATE INDEX IF NOT EXISTS idx_support_ticket_status ON support_ticket(status);
CREATE INDEX IF NOT EXISTS idx_support_ticket_created_at ON support_ticket(created_at DESC);

-- Integration indexes
CREATE INDEX IF NOT EXISTS idx_integration_connector_org_id ON integration_connector(org_id);
CREATE INDEX IF NOT EXISTS idx_integration_connector_provider ON integration_connector(provider);
CREATE INDEX IF NOT EXISTS idx_woocommerce_sync_connector ON woocommerce_sync(connector_id);
CREATE INDEX IF NOT EXISTS idx_odoo_sync_connector ON odoo_sync(connector_id);

-- Pricing indexes
CREATE INDEX IF NOT EXISTS idx_pricing_rule_org_id ON pricing_rule(org_id);
CREATE INDEX IF NOT EXISTS idx_pricing_rule_active ON pricing_rule(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_pricing_recommendation_optimization ON pricing_recommendation(optimization_id);

-- Loyalty indexes
CREATE INDEX IF NOT EXISTS idx_customer_loyalty_customer ON customer_loyalty(customer_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transaction_customer ON loyalty_transaction(customer_id);
CREATE INDEX IF NOT EXISTS idx_reward_redemption_customer ON reward_redemption(customer_id);

COMMIT;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Successfully deployed new feature tables!';
    RAISE NOTICE '   - Customer Management System';
    RAISE NOTICE '   - Integration System (WooCommerce & Odoo)';
    RAISE NOTICE '   - Pricing & Optimization';
    RAISE NOTICE '   - Loyalty & Rewards';
END $$;
