-- Quick fix for Neon schema permissions
-- Run this with: psql YOUR_NEON_CONNECTION_STRING -f scripts/fix-neon-permissions.sql

-- Show current user
SELECT 'Current database user: ' || current_user as info;

-- Grant schema access
GRANT USAGE ON SCHEMA core TO CURRENT_USER;
GRANT USAGE ON SCHEMA spp TO CURRENT_USER;
GRANT USAGE ON SCHEMA serve TO CURRENT_USER;

-- Grant table permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA core TO CURRENT_USER;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA spp TO CURRENT_USER;
GRANT SELECT ON ALL TABLES IN SCHEMA serve TO CURRENT_USER;

-- Grant sequence permissions
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA core TO CURRENT_USER;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA spp TO CURRENT_USER;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA core GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO CURRENT_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA spp GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO CURRENT_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA serve GRANT SELECT ON TABLES TO CURRENT_USER;

SELECT '✅ Permissions granted successfully!' as status;
SELECT 'User ' || current_user || ' now has access to core, spp, and serve schemas' as result;

