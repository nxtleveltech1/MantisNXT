-- Set up postgres_fdw in the IS-SOH database to access SPP tables
--
-- Purpose: keep the app connected to a single database (IS-SOH) while
-- transparently querying/writing SPP tables via foreign tables.
--
-- Usage option 1 (replace placeholders manually):
--   1) Connect to your IS-SOH database with psql
--   2) Run this script after replacing <SPP_HOST>, <SPP_DB>, <SPP_USER>, <SPP_PASS>, <SPP_PORT>
--
-- Usage option 2 (psql variables):
--   psql "$ENTERPRISE_DATABASE_URL" \
--     -v SPP_HOST=ep-xxxx-xxxx.neon.tech \
--     -v SPP_DB=neondb \
--     -v SPP_USER=neondb_owner \
--     -v SPP_PASS=your_password \
--     -v SPP_PORT=5432 \
--     -f database/scripts/setup_fdw_issoh_to_spp.sql
--
-- Notes:
-- - Ensure the SPP database already has a schema named `spp` with its tables
-- - This script imports the remote `spp` schema into local `spp` schema

CREATE EXTENSION IF NOT EXISTS postgres_fdw;

-- Create a foreign server pointing to the SPP database
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_foreign_server WHERE srvname = 'spp_server'
  ) THEN
    CREATE SERVER spp_server
      FOREIGN DATA WRAPPER postgres_fdw
      OPTIONS (
        host :'SPP_HOST',      -- or ' <SPP_HOST> '
        dbname :'SPP_DB',      -- or ' <SPP_DB> '
        port :'SPP_PORT'       -- or ' 5432 '
      );
  END IF;
END $$;

-- Map current user to remote credentials
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_user_mappings WHERE srvname = 'spp_server' AND umuser = current_user::regrole
  ) THEN
    CREATE USER MAPPING FOR CURRENT_USER
      SERVER spp_server
      OPTIONS (
        user :'SPP_USER',      -- or ' <SPP_USER> '
        password :'SPP_PASS'   -- or ' <SPP_PASS> '
      );
  END IF;
END $$;

-- Ensure local schema exists
CREATE SCHEMA IF NOT EXISTS spp;

-- Import all objects from remote spp schema as foreign tables into local spp schema
-- If you need a subset, use LIMIT TO or EXCEPT options.
IMPORT FOREIGN SCHEMA spp
  FROM SERVER spp_server
  INTO spp;

-- Optional: Verify by listing a few foreign tables
-- SELECT schemaname, tablename, tableowner FROM pg_tables WHERE schemaname = 'spp';
