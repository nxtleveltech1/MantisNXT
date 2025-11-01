#!/usr/bin/env tsx
/**
 * Grant Neon Database Schema Permissions
 *
 * This script grants necessary permissions to the current database user
 * for the core, spp, and serve schemas.
 *
 * Usage:
 *   npx tsx scripts/grant-neon-permissions.ts
 *
 * Requirements:
 *   - NEON_SPP_DATABASE_URL environment variable must be set
 */

import { neon } from '@neondatabase/serverless';

async function grantPermissions() {
  // Try to get connection string from environment or use hardcoded from .mcp.json
  let connectionString = process.env.NEON_SPP_DATABASE_URL;

  if (!connectionString) {
    // Fallback to connection string from .mcp.json
    connectionString =
      'postgresql://neondb_owner:npg_84ELeCFbOcGA@ep-steep-waterfall-a96wibpm-pooler.gwc.azure.neon.tech/mantis_issoh?sslmode=require';
    console.log('⚠️  NEON_SPP_DATABASE_URL not set, using connection from .mcp.json');
  }

  if (!connectionString) {
    console.error('❌ Error: No database connection string available');
    console.error('');
    console.error('Please set NEON_SPP_DATABASE_URL in your .env.local or .env file:');
    console.error('NEON_SPP_DATABASE_URL=postgresql://user:pass@host/db');
    process.exit(1);
  }

  console.log('🔧 Granting database schema permissions...');
  console.log('');

  const sql = neon(connectionString);

  try {
    // Check current user
    const userResult = await sql`SELECT current_user`;
    const currentUser = userResult[0]?.current_user;
    console.log(`📋 Current database user: ${currentUser}`);
    console.log('');

    // Grant schema usage to PUBLIC role (works for all users)
    console.log('🔑 Granting schema access to PUBLIC...');
    await sql`GRANT USAGE ON SCHEMA core TO PUBLIC`;
    await sql`GRANT USAGE ON SCHEMA spp TO PUBLIC`;
    await sql`GRANT USAGE ON SCHEMA serve TO PUBLIC`;
    console.log('  ✓ Schema access granted to PUBLIC');

    // Grant table permissions to PUBLIC
    console.log('🔑 Granting table permissions to PUBLIC...');
    await sql`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA core TO PUBLIC`;
    await sql`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA spp TO PUBLIC`;
    await sql`GRANT SELECT ON ALL TABLES IN SCHEMA serve TO PUBLIC`;
    console.log('  ✓ Table permissions granted to PUBLIC');

    // Grant sequence permissions to PUBLIC
    console.log('🔑 Granting sequence permissions to PUBLIC...');
    await sql`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA core TO PUBLIC`;
    await sql`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA spp TO PUBLIC`;
    console.log('  ✓ Sequence permissions granted to PUBLIC');

    // Set default privileges for PUBLIC (future objects)
    console.log('🔑 Setting default privileges for PUBLIC on future objects...');
    await sql`ALTER DEFAULT PRIVILEGES IN SCHEMA core GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO PUBLIC`;
    await sql`ALTER DEFAULT PRIVILEGES IN SCHEMA spp GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO PUBLIC`;
    await sql`ALTER DEFAULT PRIVILEGES IN SCHEMA serve GRANT SELECT ON TABLES TO PUBLIC`;
    console.log('  ✓ Default privileges set for PUBLIC');

    // Also grant to current user explicitly as backup
    console.log('🔑 Also granting to current user as backup...');
    // Use unsafe for dynamic identifiers
    await sql.unsafe(`GRANT USAGE ON SCHEMA core TO "${currentUser}"`);
    await sql.unsafe(`GRANT USAGE ON SCHEMA spp TO "${currentUser}"`);
    await sql.unsafe(`GRANT USAGE ON SCHEMA serve TO "${currentUser}"`);
    await sql.unsafe(
      `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA core TO "${currentUser}"`
    );
    await sql.unsafe(
      `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA spp TO "${currentUser}"`
    );
    await sql.unsafe(`GRANT SELECT ON ALL TABLES IN SCHEMA serve TO "${currentUser}"`);
    await sql.unsafe(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA core TO "${currentUser}"`);
    await sql.unsafe(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA spp TO "${currentUser}"`);
    console.log('  ✓ Permissions granted to current user');

    console.log('');
    console.log('✅ Success! Permissions granted to user:', currentUser);
    console.log('');
    console.log('Next steps:');
    console.log('1. Restart your development server (Ctrl+C then npm run dev)');
    console.log("2. Visit http://localhost:3000/nxt-spp to verify it's working");
    console.log('');
  } catch (error) {
    console.error('');
    console.error('❌ Error granting permissions:', error);
    console.error('');
    console.error('Try running the SQL manually:');
    console.error('  psql "$NEON_SPP_DATABASE_URL" -f scripts/fix-neon-permissions.sql');
    console.error('');
    console.error('Or use the Neon Console web UI:');
    console.error('  https://console.neon.tech');
    process.exit(1);
  }
}

// Run the script
grantPermissions().catch(console.error);
