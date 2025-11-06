-- =====================================================
-- GRANT SCHEMA PERMISSIONS FOR NEON DATABASE
-- =====================================================
-- This script grants necessary permissions to access
-- the core, spp, and serve schemas.
--
-- IMPORTANT: Replace 'your_app_user' with your actual
-- database user name from NEON_SPP_DATABASE_URL
-- =====================================================

-- Get the current database user (or set manually)
-- For Neon, the user is typically in the connection string
-- You can check with: SELECT current_user;

-- Option 1: Grant to current user (recommended for Neon)
-- Replace this if you know your specific user name
DO $$
DECLARE
    current_db_user TEXT := current_user;
BEGIN
    -- Grant schema usage permissions
    EXECUTE format('GRANT USAGE ON SCHEMA core TO %I', current_db_user);
    EXECUTE format('GRANT USAGE ON SCHEMA spp TO %I', current_db_user);
    EXECUTE format('GRANT USAGE ON SCHEMA serve TO %I', current_db_user);
    
    -- Grant table permissions
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA core TO %I', current_db_user);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA spp TO %I', current_db_user);
    EXECUTE format('GRANT SELECT ON ALL TABLES IN SCHEMA serve TO %I', current_db_user);
    
    -- Grant sequence permissions (for UUID generation)
    EXECUTE format('GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA core TO %I', current_db_user);
    EXECUTE format('GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA spp TO %I', current_db_user);
    
    -- Grant view permissions
    EXECUTE format('GRANT SELECT ON ALL TABLES IN SCHEMA serve TO %I', current_db_user);
    
    -- Set default permissions for future tables
    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA core GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO %I', current_db_user);
    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA spp GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO %I', current_db_user);
    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA serve GRANT SELECT ON TABLES TO %I', current_db_user);
    
    RAISE NOTICE 'Granted permissions to user: %', current_db_user;
END $$;

-- Option 2: Manual grant (uncomment and replace 'your_app_user' if Option 1 doesn't work)
-- GRANT USAGE ON SCHEMA core TO your_app_user;
-- GRANT USAGE ON SCHEMA spp TO your_app_user;
-- GRANT USAGE ON SCHEMA serve TO your_app_user;
-- 
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA core TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA spp TO your_app_user;
-- GRANT SELECT ON ALL TABLES IN SCHEMA serve TO your_app_user;
-- 
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA core TO your_app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA spp TO your_app_user;

\echo '✅ Schema permissions granted successfully!'
\echo 'Current user:', current_user


