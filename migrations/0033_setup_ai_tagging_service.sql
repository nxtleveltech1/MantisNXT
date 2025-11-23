-- Migration: Setup AI Inventory Tagging Service Configuration
-- Description: Creates the required ai_service and ai_service_config entries for Inventory Tagging
-- Note: Tables ai_service and ai_service_config already exist from migration 0026
-- Project: proud-mud-50346856

BEGIN;

-- Step 1: Insert the Inventory Tagging service for the default org
INSERT INTO ai_service (
    id, 
    org_id, 
    service_key, 
    service_label, 
    is_enabled
)
VALUES (
    'aaaaaaaa-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'inventory_tagging',
    'Inventory Tagging',
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
    'aaaaaaaa-0000-0000-0000-000000000002',
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
        'batchDelayMs', 2000,
        'webResearchEnabled', true,
        'webResearchProvider', 'google_custom_search'
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

COMMIT;

-- Log migration
INSERT INTO schema_migrations (migration_name)
VALUES ('0033_setup_ai_tagging_service')
ON CONFLICT (migration_name) DO NOTHING;

