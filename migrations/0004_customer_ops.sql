-- Migration: 0004_customer_ops.sql
-- Description: Customer operations tables - customers, interactions, support tickets
-- up

-- Customer operations enums
CREATE TYPE customer_segment AS ENUM ('enterprise', 'mid_market', 'smb', 'startup', 'individual');
CREATE TYPE customer_status AS ENUM ('active', 'inactive', 'prospect', 'churned', 'suspended');
CREATE TYPE interaction_channel AS ENUM ('email', 'phone', 'chat', 'social', 'in_person', 'api', 'web');
CREATE TYPE interaction_type AS ENUM ('inquiry', 'complaint', 'compliment', 'feature_request', 'bug_report', 'billing', 'onboarding', 'training');
CREATE TYPE sentiment_score AS ENUM ('very_negative', 'negative', 'neutral', 'positive', 'very_positive');
CREATE TYPE ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent', 'critical');
CREATE TYPE ticket_status AS ENUM ('open', 'in_progress', 'pending_customer', 'resolved', 'closed', 'escalated');

-- Customers table
CREATE TABLE customer (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
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
    CONSTRAINT customer_email_format CHECK (email IS NULL OR email ~ '^[^@]+@[^@]+\.[^@]+$'),
    CONSTRAINT customer_lifetime_value_non_negative CHECK (lifetime_value >= 0),
    CONSTRAINT customer_last_interaction_after_acquisition CHECK (last_interaction_date IS NULL OR acquisition_date IS NULL OR last_interaction_date >= acquisition_date)
);

-- Customer interactions table (partitioned by timestamp for performance)
CREATE TABLE customer_interaction (
    id uuid DEFAULT uuid_generate_v4(),
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

-- Create partitions for customer_interaction (current quarter and next 3 quarters)
CREATE TABLE customer_interaction_2024_q4 PARTITION OF customer_interaction
    FOR VALUES FROM ('2024-10-01') TO ('2025-01-01');
CREATE TABLE customer_interaction_2025_q1 PARTITION OF customer_interaction
    FOR VALUES FROM ('2025-01-01') TO ('2025-04-01');
CREATE TABLE customer_interaction_2025_q2 PARTITION OF customer_interaction
    FOR VALUES FROM ('2025-04-01') TO ('2025-07-01');
CREATE TABLE customer_interaction_2025_q3 PARTITION OF customer_interaction
    FOR VALUES FROM ('2025-07-01') TO ('2025-10-01');

-- Support tickets table
CREATE TABLE support_ticket (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- Support ticket comments/updates
CREATE TABLE ticket_comment (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id uuid NOT NULL REFERENCES support_ticket(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    content text NOT NULL,
    is_internal boolean DEFAULT false,
    is_resolution boolean DEFAULT false,
    attachments text[] DEFAULT '{}',
    created_at timestamptz DEFAULT now(),

    CONSTRAINT ticket_comment_content_not_empty CHECK (char_length(content) > 0)
);

-- Function to update customer last interaction date
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

-- Function to update ticket first response time
CREATE OR REPLACE FUNCTION update_ticket_first_response()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update if this is the first response and it's not internal
    IF NEW.is_internal = false THEN
        UPDATE support_ticket
        SET first_response_at = COALESCE(first_response_at, now())
        WHERE id = NEW.ticket_id AND first_response_at IS NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-generate ticket numbers
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER AS $$
DECLARE
    next_num integer;
    org_prefix text;
BEGIN
    -- Get organization slug for prefix
    SELECT slug INTO org_prefix FROM organization WHERE id = NEW.org_id;

    -- Get next ticket number for this org
    SELECT COALESCE(MAX(CAST(substring(ticket_number FROM '\d+$') AS integer)), 0) + 1
    INTO next_num
    FROM support_ticket
    WHERE org_id = NEW.org_id AND ticket_number ~ '^[A-Z]+-\d+$';

    -- Generate ticket number
    NEW.ticket_number := UPPER(org_prefix) || '-' || LPAD(next_num::text, 6, '0');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_customer_updated_at BEFORE UPDATE ON customer FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_support_ticket_updated_at BEFORE UPDATE ON support_ticket FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update customer last interaction
CREATE TRIGGER update_customer_last_interaction_trigger
    AFTER INSERT ON customer_interaction
    FOR EACH ROW EXECUTE FUNCTION update_customer_last_interaction();

-- Trigger to update ticket first response
CREATE TRIGGER update_ticket_first_response_trigger
    AFTER INSERT ON ticket_comment
    FOR EACH ROW EXECUTE FUNCTION update_ticket_first_response();

-- Trigger to auto-generate ticket numbers
CREATE TRIGGER generate_ticket_number_trigger
    BEFORE INSERT ON support_ticket
    FOR EACH ROW
    WHEN (NEW.ticket_number IS NULL OR NEW.ticket_number = '')
    EXECUTE FUNCTION generate_ticket_number();

-- Audit triggers
CREATE TRIGGER audit_customer AFTER INSERT OR UPDATE OR DELETE ON customer FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER audit_support_ticket AFTER INSERT OR UPDATE OR DELETE ON support_ticket FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER audit_ticket_comment AFTER INSERT OR UPDATE OR DELETE ON ticket_comment FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- down

DROP TRIGGER IF EXISTS audit_ticket_comment ON ticket_comment;
DROP TRIGGER IF EXISTS audit_support_ticket ON support_ticket;
DROP TRIGGER IF EXISTS audit_customer ON customer;
DROP TRIGGER IF EXISTS generate_ticket_number_trigger ON support_ticket;
DROP TRIGGER IF EXISTS update_ticket_first_response_trigger ON ticket_comment;
DROP TRIGGER IF EXISTS update_customer_last_interaction_trigger ON customer_interaction;
DROP TRIGGER IF EXISTS update_support_ticket_updated_at ON support_ticket;
DROP TRIGGER IF EXISTS update_customer_updated_at ON customer;
DROP FUNCTION IF EXISTS generate_ticket_number();
DROP FUNCTION IF EXISTS update_ticket_first_response();
DROP FUNCTION IF EXISTS update_customer_last_interaction();
DROP TABLE IF EXISTS ticket_comment;
DROP TABLE IF EXISTS support_ticket;
DROP TABLE IF EXISTS customer_interaction_2025_q3;
DROP TABLE IF EXISTS customer_interaction_2025_q2;
DROP TABLE IF EXISTS customer_interaction_2025_q1;
DROP TABLE IF EXISTS customer_interaction_2024_q4;
DROP TABLE IF EXISTS customer_interaction;
DROP TABLE IF EXISTS customer;
DROP TYPE IF EXISTS ticket_status;
DROP TYPE IF EXISTS ticket_priority;
DROP TYPE IF EXISTS sentiment_score;
DROP TYPE IF EXISTS interaction_type;
DROP TYPE IF EXISTS interaction_channel;
DROP TYPE IF EXISTS customer_status;
DROP TYPE IF EXISTS customer_segment;