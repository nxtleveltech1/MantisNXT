-- Set up postgres_fdw in the SPP database to access CORE/SERVE tables
--
-- Purpose: allow SPP-side code (neonDb connection) to join against
-- core.* and serve.* objects that live in the IS-SOH database.
--
-- Usage (psql variables):
--   psql "$NEON_SPP_DATABASE_URL" \
--     -v ISSOH_HOST=ep-xxxx-xxxx.neon.tech \
--     -v ISSOH_DB=neondb \
--     -v ISSOH_USER=neondb_owner \
--     -v ISSOH_PASS=your_password \
--     -v ISSOH_PORT=5432 \
--     -f database/scripts/setup_fdw_spp_to_issoh.sql
--
-- Notes:
-- - Ensure the IS-SOH database already has schemas `core` and `serve`
-- - This script imports remote `core` and `serve` schemas into local DB

CREATE EXTENSION IF NOT EXISTS postgres_fdw;

-- Create a foreign server pointing to the IS-SOH database
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_foreign_server WHERE srvname = 'issoh_server'
  ) THEN
    CREATE SERVER issoh_server
      FOREIGN DATA WRAPPER postgres_fdw
      OPTIONS (
        host :'ISSOH_HOST',
        dbname :'ISSOH_DB',
        port :'ISSOH_PORT'
      );
  END IF;
END $$;

-- Map current user to remote credentials
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_user_mappings WHERE srvname = 'issoh_server' AND umuser = current_user::regrole
  ) THEN
    CREATE USER MAPPING FOR CURRENT_USER
      SERVER issoh_server
      OPTIONS (
        user :'ISSOH_USER',
        password :'ISSOH_PASS'
      );
  END IF;
END $$;

-- Ensure local schemas exist
CREATE SCHEMA IF NOT EXISTS core;
CREATE SCHEMA IF NOT EXISTS serve;

-- Import remote schemas
IMPORT FOREIGN SCHEMA core FROM SERVER issoh_server INTO core;
IMPORT FOREIGN SCHEMA serve FROM SERVER issoh_server INTO serve;

-- Optional verification
-- SELECT schemaname, tablename FROM pg_tables WHERE schemaname IN ('core','serve') ORDER BY 1,2;

