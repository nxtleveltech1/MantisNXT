-- =====================================================
-- ADD CURRENCY COLUMNS TO PRICING TABLES
-- =====================================================
-- Migration: 0253_add_currency_to_pricing_tables.sql
-- Description: Add currency_code columns to pricing optimization tables
--              to support multi-currency pricing operations
-- Author: Aster
-- Date: 2025-01-27

BEGIN;

-- Add currency to pricing_optimization table (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'pricing_optimization' 
        AND column_name = 'currency'
    ) THEN
        ALTER TABLE pricing_optimization 
        ADD COLUMN currency VARCHAR(3) NOT NULL DEFAULT 'ZAR';
        
        -- Add constraint for valid currency codes
        ALTER TABLE pricing_optimization
        ADD CONSTRAINT pricing_optimization_currency_format 
        CHECK (currency ~ '^[A-Z]{3}$');
        
        -- Create index for currency queries
        CREATE INDEX idx_pricing_optimization_currency 
        ON pricing_optimization(currency);
    END IF;
END $$;

-- Add currency to pricing_recommendation table (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'pricing_recommendation' 
        AND column_name = 'currency'
    ) THEN
        ALTER TABLE pricing_recommendation 
        ADD COLUMN currency VARCHAR(3) NOT NULL DEFAULT 'ZAR';
        
        -- Add constraint for valid currency codes
        ALTER TABLE pricing_recommendation
        ADD CONSTRAINT pricing_recommendation_currency_format 
        CHECK (currency ~ '^[A-Z]{3}$');
        
        -- Create index for currency queries
        CREATE INDEX idx_pricing_recommendation_currency 
        ON pricing_recommendation(currency);
    END IF;
END $$;

-- Add currency to pricing_rule table (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'pricing_rule' 
        AND column_name = 'currency'
    ) THEN
        ALTER TABLE pricing_rule 
        ADD COLUMN currency VARCHAR(3) NOT NULL DEFAULT 'ZAR';
        
        -- Add constraint for valid currency codes
        ALTER TABLE pricing_rule
        ADD CONSTRAINT pricing_rule_currency_format 
        CHECK (currency ~ '^[A-Z]{3}$');
        
        -- Create index for currency queries
        CREATE INDEX idx_pricing_rule_currency 
        ON pricing_rule(currency);
    END IF;
END $$;

-- Verify core.price_history has currency (it should from migration 0207)
-- But add it if missing for safety
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'core' 
        AND table_name = 'price_history' 
        AND column_name = 'currency'
    ) THEN
        ALTER TABLE core.price_history 
        ADD COLUMN currency VARCHAR(3) NOT NULL DEFAULT 'ZAR';
        
        -- Add constraint for valid currency codes
        ALTER TABLE core.price_history
        ADD CONSTRAINT price_history_currency_format 
        CHECK (currency ~ '^[A-Z]{3}$');
        
        -- Create index for currency queries
        CREATE INDEX idx_core_price_history_currency 
        ON core.price_history(currency);
    END IF;
END $$;

-- Add currency to price_elasticity table if it exists (if not exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'price_elasticity'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'price_elasticity' 
            AND column_name = 'currency'
        ) THEN
            ALTER TABLE price_elasticity 
            ADD COLUMN currency VARCHAR(3) NOT NULL DEFAULT 'ZAR';
            
            -- Add constraint for valid currency codes
            ALTER TABLE price_elasticity
            ADD CONSTRAINT price_elasticity_currency_format 
            CHECK (currency ~ '^[A-Z]{3}$');
            
            -- Create index for currency queries
            CREATE INDEX idx_price_elasticity_currency 
            ON price_elasticity(currency);
        END IF;
    END IF;
END $$;

COMMIT;

-- Log migration
INSERT INTO schema_migrations (migration_name)
VALUES ('0253_add_currency_to_pricing_tables')
ON CONFLICT (migration_name) DO NOTHING;

