/**
 * Run auth migration directly using DB connection
 * Usage: bun scripts/run-auth-migration.ts
 */
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';

// Load env
config({ path: '.env.local' });
config({ path: '.env' });

const connectionString = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL or NEON_DATABASE_URL not found');
  process.exit(1);
}

async function runMigration() {
  const pool = new Pool({ connectionString });
  
  try {
    console.log('🔄 Running auth migrations...');
    
    // Read migration files
    const migrations = [
      '0220_auth_password_reset_tokens.sql',
      '0221_add_auth_provider_column.sql'
    ];
    
    for (const migrationFile of migrations) {
      const migrationPath = path.join(__dirname, '../migrations/', migrationFile);
      if (fs.existsSync(migrationPath)) {
        console.log(`📋 Running ${migrationFile}...`);
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        await pool.query(migrationSQL);
        console.log(`✅ ${migrationFile} completed`);
      }
    }
    
    console.log('✅ Auth migration completed successfully');
    
    // Verify tables exist
    const result = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'auth' 
      AND table_name IN ('password_reset_tokens', 'email_verification_tokens')
    `);
    
    console.log('📋 Created tables:', result.rows.map(r => r.table_name));
    
    // Verify columns
    const columns = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_schema = 'auth' 
      AND table_name = 'users_extended'
      AND column_name IN ('password_hash', 'failed_login_attempts', 'locked_until', 'email_verified')
    `);
    
    console.log('📋 Updated columns:', columns.rows.map(r => r.column_name));
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();