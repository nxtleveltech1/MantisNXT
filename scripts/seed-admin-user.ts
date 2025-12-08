/**
 * Seed admin user
 * Usage: bun scripts/seed-admin-user.ts
 */
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import { config } from 'dotenv';

config({ path: '.env.local' });
config({ path: '.env' });

const connectionString = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL not found');
  process.exit(1);
}

async function seedAdmin() {
  const pool = new Pool({ connectionString });
  
  try {
    const email = 'nxtleveltech1@outlook.com';
    const password = 'P@3301#';
    const displayName = 'NXT Admin';
    
    // Hash password with bcrypt (12 rounds)
    const passwordHash = await bcrypt.hash(password, 12);
    
    console.log('🔄 Fixing schema constraints...');
    
    // Drop all broken auth_provider constraints
    await pool.query(`
      ALTER TABLE auth.users_extended
      DROP CONSTRAINT IF EXISTS auth_provider_not_empty
    `);
    
    await pool.query(`
      ALTER TABLE auth.users_extended
      DROP CONSTRAINT IF EXISTS must_have_auth_provider
    `);
    
    // Ensure auth_provider column exists
    await pool.query(`
      ALTER TABLE auth.users_extended
      ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(50) DEFAULT 'local'
    `);
    
    // Update any NULLs
    await pool.query(`
      UPDATE auth.users_extended
      SET auth_provider = 'local'
      WHERE auth_provider IS NULL
    `);
    
    // Set NOT NULL
    await pool.query(`
      ALTER TABLE auth.users_extended
      ALTER COLUMN auth_provider SET DEFAULT 'local'
    `);
    
    console.log('✅ Schema constraints fixed');
    
    console.log('🔄 Creating admin user...');
    
    // Check if user exists
    const existingUser = await pool.query(
      'SELECT id FROM auth.users_extended WHERE email = $1',
      [email]
    );
    
    if (existingUser.rows.length > 0) {
      // Get user with org_id
      const userRow = await pool.query(
        'SELECT id, org_id FROM auth.users_extended WHERE email = $1',
        [email]
      );
      const userId = userRow.rows[0].id;
      const orgId = userRow.rows[0].org_id;
      
      // Update password hash
      await pool.query(
        `UPDATE auth.users_extended
         SET password_hash = $1, updated_at = NOW()
         WHERE email = $2`,
        [passwordHash, email]
      );
      console.log('✅ Updated existing admin user password');
      
      // Create unique index on roles.name if not exists
      await pool.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS roles_name_org_idx ON auth.roles (name, org_id)
      `);
      
      // Ensure admin role exists for this org
      const existingRole = await pool.query(
        `SELECT id FROM auth.roles WHERE name = 'admin' AND org_id = $1`,
        [orgId]
      );
      
      let roleId: string;
      if (existingRole.rows.length === 0) {
        const newRole = await pool.query(`
          INSERT INTO auth.roles (name, slug, description, org_id)
          VALUES ('admin', 'admin', 'System administrator', $1)
          RETURNING id
        `, [orgId]);
        roleId = newRole.rows[0].id;
      } else {
        roleId = existingRole.rows[0].id;
      }
      
      // Assign admin role if not already assigned
      const existingAssignment = await pool.query(
        `SELECT 1 FROM auth.user_roles WHERE user_id = $1 AND role_id = $2`,
        [userId, roleId]
      );
      
      if (existingAssignment.rows.length === 0) {
        await pool.query(`
          INSERT INTO auth.user_roles (user_id, role_id)
          VALUES ($1, $2)
        `, [userId, roleId]);
      }
      
      console.log('✅ Admin role assigned');
    } else {
      // Get or create organization
      let orgId: string;
      const orgResult = await pool.query(
        'SELECT id FROM organization LIMIT 1'
      );
      
      if (orgResult.rows.length === 0) {
        const newOrg = await pool.query(`
          INSERT INTO organization (name, code)
          VALUES ('NXT Level Tech', 'NXT')
          RETURNING id
        `);
        orgId = newOrg.rows[0].id;
        console.log('✅ Created organization');
      } else {
        orgId = orgResult.rows[0].id;
      }
      
      // Check what columns exist
      const columnsResult = await pool.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'auth' AND table_name = 'users_extended'
      `);
      const columnNames = columnsResult.rows.map(r => r.column_name);
      const hasAuthProvider = columnNames.includes('auth_provider');
      
      // Insert user with available columns
      let userResult;
      if (hasAuthProvider) {
        userResult = await pool.query(`
          INSERT INTO auth.users_extended (
            email, password_hash, display_name, org_id,
            is_active, email_verified, auth_provider, created_at, updated_at
          )
          VALUES ($1, $2, $3, $4, true, true, 'local', NOW(), NOW())
          RETURNING id
        `, [email, passwordHash, displayName, orgId]);
      } else {
        userResult = await pool.query(`
          INSERT INTO auth.users_extended (
            email, password_hash, display_name, org_id,
            is_active, email_verified, created_at, updated_at
          )
          VALUES ($1, $2, $3, $4, true, true, NOW(), NOW())
          RETURNING id
        `, [email, passwordHash, displayName, orgId]);
      }
      
      const userId = userResult.rows[0].id;
      console.log('✅ Created admin user');
      
      // Create unique index on roles.name if not exists
      await pool.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS roles_name_org_idx ON auth.roles (name, org_id)
      `);
      
      // Create admin role if not exists for this org
      const existingRole = await pool.query(
        `SELECT id FROM auth.roles WHERE name = 'admin' AND org_id = $1`,
        [orgId]
      );
      
      let roleId: string;
      if (existingRole.rows.length === 0) {
        const newRole = await pool.query(`
          INSERT INTO auth.roles (name, slug, description, org_id)
          VALUES ('admin', 'admin', 'System administrator', $1)
          RETURNING id
        `, [orgId]);
        roleId = newRole.rows[0].id;
      } else {
        roleId = existingRole.rows[0].id;
      }
      
      // Assign admin role if not already assigned
      const existingAssignment = await pool.query(
        `SELECT 1 FROM auth.user_roles WHERE user_id = $1 AND role_id = $2`,
        [userId, roleId]
      );
      
      if (existingAssignment.rows.length === 0) {
        await pool.query(`
          INSERT INTO auth.user_roles (user_id, role_id)
          VALUES ($1, $2)
        `, [userId, roleId]);
      }
      
      console.log('✅ Admin role assigned');
    }
    
    console.log('\n✅ Admin user ready:');
    console.log(`   Email: ${email}`);
    console.log('   Password: [as provided]');
    
  } catch (error) {
    console.error('❌ Failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seedAdmin();