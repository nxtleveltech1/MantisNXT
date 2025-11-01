# URGENT: Fix Database Permissions

## The Problem
Your database user doesn't have permission to access the `core` schema in your Neon database.

Error code: `42501` - permission denied for schema core

## Quick Fix (Choose ONE method)

### Method 1: Using psql (Recommended)

```bash
# Replace YOUR_CONNECTION_STRING with your actual NEON_SPP_DATABASE_URL
psql "YOUR_CONNECTION_STRING" -f scripts/fix-neon-permissions.sql
```

### Method 2: Using Neon Console (Web UI)

1. Go to https://console.neon.tech
2. Select your project
3. Click on "SQL Editor"
4. Copy and paste the following SQL and run it:

```sql
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
```

### Method 3: Connect via GUI client (DBeaver, pgAdmin, etc.)

1. Connect to your Neon database using your `NEON_SPP_DATABASE_URL`
2. Open a SQL query window
3. Run the SQL from `scripts/fix-neon-permissions.sql`

## After Running the SQL

**Restart your development server:**

```bash
# Press Ctrl+C to stop the current server
# Then start it again:
npm run dev
```

## How to Find Your Connection String

Your connection string is in the environment variable `NEON_SPP_DATABASE_URL`.

Check these files (in order):
1. `.env.local` (most likely)
2. `.env`
3. System environment variables

The connection string looks like:
```
postgresql://user:password@ep-xxxx-xxxx.region.aws.neon.tech/dbname?sslmode=require
```

## Verify It's Fixed

After restarting the server, visit http://localhost:3000/nxt-spp

You should see data loading instead of blue placeholder bars.

---

**Files Created:**
- `scripts/fix-neon-permissions.sql` - SQL script to grant permissions
- `database/scripts/grant_schema_permissions.sql` - Alternative comprehensive script

**Code Fixed:**
- `lib/database/neon-connection.ts` - Fixed query execution logic
- `src/app/layout.tsx` - Fixed CSS preload warning
- `src/app/globals.css` - Moved font declarations

