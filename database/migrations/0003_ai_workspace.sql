-- Migration: 0003_ai_workspace.sql
-- Description: AI workspace tables - conversations, datasets, prompt templates
-- up

-- AI workspace enums
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ai_message_role') THEN
        CREATE TYPE ai_message_role AS ENUM ('user', 'assistant', 'system');
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ai_dataset_type') THEN
        CREATE TYPE ai_dataset_type AS ENUM ('csv', 'json', 'xml', 'parquet', 'database', 'api');
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ai_prompt_category') THEN
        CREATE TYPE ai_prompt_category AS ENUM ('analysis', 'generation', 'classification', 'summarization', 'translation', 'custom');
    END IF;
END$$;

-- AI conversations table
CREATE TABLE IF NOT EXISTS ai_conversation (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users_extended(id) ON DELETE CASCADE,
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

-- AI messages table (partitioned by created_at for performance)
CREATE TABLE IF NOT EXISTS ai_message (
    id uuid DEFAULT uuid_generate_v4(),
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

-- Create partitions for ai_message (current month and next 6 months)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'ai_message_2024_q4') THEN
        CREATE TABLE ai_message_2024_q4 PARTITION OF ai_message
            FOR VALUES FROM ('2024-10-01') TO ('2025-01-01');
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'ai_message_2025_q1') THEN
        CREATE TABLE ai_message_2025_q1 PARTITION OF ai_message
            FOR VALUES FROM ('2025-01-01') TO ('2025-04-01');
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'ai_message_2025_q2') THEN
        CREATE TABLE ai_message_2025_q2 PARTITION OF ai_message
            FOR VALUES FROM ('2025-04-01') TO ('2025-07-01');
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'ai_message_2025_q3') THEN
        CREATE TABLE ai_message_2025_q3 PARTITION OF ai_message
            FOR VALUES FROM ('2025-07-01') TO ('2025-10-01');
    END IF;
END$$;

-- AI datasets table
CREATE TABLE IF NOT EXISTS ai_dataset (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
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
    created_by uuid NOT NULL REFERENCES auth.users_extended(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    CONSTRAINT ai_dataset_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 200),
    CONSTRAINT ai_dataset_file_size_positive CHECK (file_size_bytes IS NULL OR file_size_bytes > 0),
    CONSTRAINT ai_dataset_record_count_positive CHECK (record_count IS NULL OR record_count >= 0),
    CONSTRAINT ai_dataset_file_url_format CHECK (file_url IS NULL OR file_url ~ '^https?://')
);

-- AI prompt templates table
CREATE TABLE IF NOT EXISTS ai_prompt_template (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    template_text text NOT NULL,
    category ai_prompt_category NOT NULL,
    variables text[] DEFAULT '{}',
    usage_count integer DEFAULT 0,
    is_public boolean DEFAULT false,
    created_by uuid NOT NULL REFERENCES auth.users_extended(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    CONSTRAINT ai_prompt_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 200),
    CONSTRAINT ai_prompt_template_not_empty CHECK (char_length(template_text) > 0),
    CONSTRAINT ai_prompt_usage_count_non_negative CHECK (usage_count >= 0)
);

-- Function to update conversation stats when messages are added/removed
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

-- Function to increment prompt template usage
CREATE OR REPLACE FUNCTION increment_prompt_usage()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE ai_prompt_template
    SET usage_count = usage_count + 1
    WHERE id = NEW.template_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_ai_conversation_updated_at ON ai_conversation;
CREATE TRIGGER update_ai_conversation_updated_at BEFORE UPDATE ON ai_conversation FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ai_dataset_updated_at ON ai_dataset;
CREATE TRIGGER update_ai_dataset_updated_at BEFORE UPDATE ON ai_dataset FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ai_prompt_template_updated_at ON ai_prompt_template;
CREATE TRIGGER update_ai_prompt_template_updated_at BEFORE UPDATE ON ai_prompt_template FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update conversation stats
DROP TRIGGER IF EXISTS update_conversation_stats_trigger ON ai_message;
CREATE TRIGGER update_conversation_stats_trigger
    AFTER INSERT OR UPDATE OR DELETE ON ai_message
    FOR EACH ROW EXECUTE FUNCTION update_conversation_stats();

-- Audit triggers
DROP TRIGGER IF EXISTS audit_ai_conversation ON ai_conversation;
CREATE TRIGGER audit_ai_conversation AFTER INSERT OR UPDATE OR DELETE ON ai_conversation FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_ai_dataset ON ai_dataset;
CREATE TRIGGER audit_ai_dataset AFTER INSERT OR UPDATE OR DELETE ON ai_dataset FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_ai_prompt_template ON ai_prompt_template;
CREATE TRIGGER audit_ai_prompt_template AFTER INSERT OR UPDATE OR DELETE ON ai_prompt_template FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

INSERT INTO schema_migrations (migration_name)
VALUES ('0003_ai_workspace')
ON CONFLICT (migration_name) DO NOTHING;

-- down

DROP TRIGGER IF EXISTS audit_ai_prompt_template ON ai_prompt_template;
DROP TRIGGER IF EXISTS audit_ai_dataset ON ai_dataset;
DROP TRIGGER IF EXISTS audit_ai_conversation ON ai_conversation;
DROP TRIGGER IF EXISTS update_conversation_stats_trigger ON ai_message;
DROP TRIGGER IF EXISTS update_ai_prompt_template_updated_at ON ai_prompt_template;
DROP TRIGGER IF EXISTS update_ai_dataset_updated_at ON ai_dataset;
DROP TRIGGER IF EXISTS update_ai_conversation_updated_at ON ai_conversation;
DROP FUNCTION IF EXISTS increment_prompt_usage();
DROP FUNCTION IF EXISTS update_conversation_stats();
DROP TABLE IF EXISTS ai_message_2025_q3;
DROP TABLE IF EXISTS ai_message_2025_q2;
DROP TABLE IF EXISTS ai_message_2025_q1;
DROP TABLE IF EXISTS ai_message_2024_q4;
DROP TABLE IF EXISTS ai_message;
DROP TABLE IF EXISTS ai_prompt_template;
DROP TABLE IF EXISTS ai_dataset;
DROP TABLE IF EXISTS ai_conversation;
DROP TYPE IF EXISTS ai_prompt_category;
DROP TYPE IF EXISTS ai_dataset_type;
DROP TYPE IF EXISTS ai_message_role;