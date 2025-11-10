-- Migration: Setup AI Category Service Configuration
-- Description: Creates the required ai_service and ai_service_config entries for product categorization
-- Note: Tables ai_service and ai_service_config already exist from migration 0026

-- Step 1: Insert the Product Categories service for the default org
INSERT INTO ai_service (
    id, 
    org_id, 
    service_key, 
    service_label, 
    is_enabled
)
VALUES (
    'aaaaaaaa-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'product_categories',
    'Product Categories',
    true
)
ON CONFLICT (org_id, service_key) 
DO UPDATE SET 
    is_enabled = true,
    updated_at = NOW();

-- Step 2: Insert a default configuration with OpenAI provider
-- NOTE: Replace 'sk-...' with your actual OpenAI API key
-- You can get one from https://platform.openai.com/api-keys
INSERT INTO ai_service_config (
    org_id, 
    service_id, 
    config, 
    is_enabled
)
VALUES (
    '00000000-0000-0000-0000-000000000000',
    'aaaaaaaa-0000-0000-0000-000000000001',
    jsonb_build_object(
        'providers', jsonb_build_object(
            'openai', jsonb_build_object(
                'enabled', true,
                'apiKey', 'sk-proj-REPLACE_WITH_YOUR_OPENAI_API_KEY',
                'model', 'gpt-4o-mini'
            )
        ),
        'activeProvider', 'openai',
        'providerOrder', jsonb_build_array('openai'),
        'timeoutMs', 45000,
        'batchSize', 50,
        'batchDelayMs', 100
    ),
    true
)
ON CONFLICT (org_id, service_id) 
DO UPDATE SET 
    config = EXCLUDED.config,
    is_enabled = true,
    updated_at = NOW();

-- Step 3: Create indexes for performance (if they don't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_ai_service_org_label'
    ) THEN
        CREATE INDEX idx_ai_service_org_label 
            ON ai_service(org_id, service_label);
    END IF;
END $$;

COMMENT ON TABLE ai_service IS 'AI service definitions for organizations';
COMMENT ON TABLE ai_service_config IS 'Configuration for AI services';
COMMENT ON COLUMN ai_service_config.config IS 'JSONB configuration containing provider settings, API keys, and operational parameters';

-- Instructions:
-- 1. Update the apiKey in the config JSONB above with your OpenAI API key
-- 2. Run this migration: psql $DATABASE_URL -f database/migrations/0031_setup_ai_category_service.sql
-- 3. Or use the Neon MCP to run it

