#!/usr/bin/env node
/**
 * Add metadata column to stock_location table
 * Simple Node.js script that doesn't require dependencies to be installed
 */

const https = require('https');
const { URL } = require('url');

const databaseUrl = process.env.DATABASE_URL || process.env.NEON_SPP_DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

// Parse the database URL
const dbUrl = new URL(databaseUrl);
const config = {
  host: dbUrl.hostname,
  port: dbUrl.port || 5432,
  database: dbUrl.pathname.slice(1),
  user: dbUrl.username,
  password: dbUrl.password,
  ssl: {
    rejectUnauthorized: false
  }
};

console.log('🔄 Connecting to database...');
console.log(`   Host: ${config.host}`);
console.log(`   Database: ${config.database}`);

// For now, let's just output the SQL that needs to be run
console.log('\n📝 SQL to execute:');
console.log(`
-- Check if column exists
SELECT EXISTS (
  SELECT 1
  FROM information_schema.columns
  WHERE table_schema = 'core'
    AND table_name = 'stock_location'
    AND column_name = 'metadata'
) as metadata_exists;

-- Add column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'core'
          AND table_name = 'stock_location'
          AND column_name = 'metadata'
    ) THEN
        ALTER TABLE core.stock_location
        ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;

        RAISE NOTICE 'Added metadata column to core.stock_location';
    ELSE
        RAISE NOTICE 'metadata column already exists in core.stock_location';
    END IF;
END $$;
`);

console.log('\n💡 To apply this migration manually, you can run:');
console.log(`   echo "ALTER TABLE core.stock_location ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;" | psql "$DATABASE_URL"`);
console.log('\n Or use the SQL file at: database/migrations/0034_add_metadata_to_stock_location.sql');
