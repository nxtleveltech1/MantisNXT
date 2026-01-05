/**
 * Apply migration 0019 - Insert system users and make dashboard created_by nullable
 * Run with: node scripts/apply-migration-0019.js
 */

// Load environment BEFORE any imports
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') });

const { Client } = require('pg');

async function applyMigration() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || process.env.ENTERPRISE_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected');

    console.log('\n🔄 Step 1: Inserting system users...');
    const userResult = await client.query(`
      INSERT INTO users (id, email, created_at)
      VALUES
        ('11111111-1111-1111-1111-111111111111', 'dev@mantisnxt.com', NOW()),
        ('22222222-2222-2222-2222-222222222222', 'user@example.com', NOW())
      ON CONFLICT (id) DO NOTHING
      RETURNING id, email;
    `);

    if (userResult.rows.length > 0) {
      console.log('✅ System users inserted:');
      userResult.rows.forEach(user => {
        console.log(`   - ${user.email} (${user.id})`);
      });
    } else {
      console.log('ℹ️  System users already exist');
    }

    console.log('\n🔄 Step 2: Making analytics_dashboard.created_by nullable...');
    await client.query(`
      ALTER TABLE analytics_dashboard
      ALTER COLUMN created_by DROP NOT NULL;
    `);
    console.log('✅ Column made nullable');

    console.log('\n🔄 Step 3: Adding column comment...');
    await client.query(`
      COMMENT ON COLUMN analytics_dashboard.created_by IS
        'User who created the dashboard. Can be NULL for system-generated dashboards.';
    `);
    console.log('✅ Comment added');

    console.log('\n✅ Migration 0019 applied successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.message.includes('already exists')) {
      console.log('ℹ️  Users may already exist, continuing...');
    } else if (error.message.includes('does not exist')) {
      console.log('ℹ️  Column constraint may already be modified');
    } else {
      process.exit(1);
    }
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

applyMigration();
