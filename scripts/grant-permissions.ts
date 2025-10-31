/**
 * Grant Schema Permissions Script
 *
 * This script grants necessary permissions to the current database user
 * for accessing the core, spp, and serve schemas.
 */

import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

async function grantPermissions() {
  const connectionString = process.env.NEON_SPP_DATABASE_URL;

  if (!connectionString) {
    console.error('❌ Error: NEON_SPP_DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  console.log('🔐 Granting schema permissions...');
  console.log('Connection:', connectionString.replace(/:[^:@]+@/, ':****@')); // Hide password

  const sql = neon(connectionString);

  try {
    // Get current user
    const userResult = await sql`SELECT current_user`;
    const currentUser = userResult[0]?.current_user;
    console.log(`\n👤 Current database user: ${currentUser}`);

    // Grant schema usage permissions using CURRENT_USER
    console.log('\n📋 Granting USAGE on schemas...');
    await sql`GRANT USAGE ON SCHEMA core TO CURRENT_USER`;
    await sql`GRANT USAGE ON SCHEMA spp TO CURRENT_USER`;
    await sql`GRANT USAGE ON SCHEMA serve TO CURRENT_USER`;
    console.log('✅ Schema USAGE granted');

    // Grant table permissions on core schema
    console.log('\n📋 Granting table permissions on core schema...');
    await sql`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA core TO CURRENT_USER`;
    console.log('✅ CORE schema table permissions granted');

    // Grant table permissions on spp schema
    console.log('\n📋 Granting table permissions on spp schema...');
    await sql`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA spp TO CURRENT_USER`;
    console.log('✅ SPP schema table permissions granted');

    // Grant table permissions on serve schema (read-only)
    console.log('\n📋 Granting table permissions on serve schema...');
    await sql`GRANT SELECT ON ALL TABLES IN SCHEMA serve TO CURRENT_USER`;
    console.log('✅ SERVE schema table permissions granted');

    // Grant sequence permissions
    console.log('\n📋 Granting sequence permissions...');
    await sql`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA core TO CURRENT_USER`;
    await sql`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA spp TO CURRENT_USER`;
    console.log('✅ Sequence permissions granted');

    // Set default privileges for future tables
    console.log('\n📋 Setting default privileges for future tables...');
    await sql`ALTER DEFAULT PRIVILEGES IN SCHEMA core GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO CURRENT_USER`;
    await sql`ALTER DEFAULT PRIVILEGES IN SCHEMA spp GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO CURRENT_USER`;
    await sql`ALTER DEFAULT PRIVILEGES IN SCHEMA serve GRANT SELECT ON TABLES TO CURRENT_USER`;
    console.log('✅ Default privileges set');

    console.log('\n🎉 All permissions granted successfully!');
    console.log('🔄 Please restart your development server for changes to take effect.');
  } catch (error) {
    console.error('\n❌ Error granting permissions:', error);
    if (error instanceof Error) {
      console.error('Message:', error.message);
    }
    process.exit(1);
  }
}

grantPermissions();
