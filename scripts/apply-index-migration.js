#!/usr/bin/env node

/**
 * Apply database index migration for inventory alerts optimization
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

async function applyMigration() {
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });

  try {
    console.log('🔗 Connecting to database...');
    await pool.query('SELECT 1');
    console.log('✅ Connected successfully');

    const migrationPath = path.join(__dirname, '../sql/migrations/004_add_inventory_alerts_indexes.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('\n📝 Applying index migration...');
    console.log('This may take several minutes on large tables...\n');

    // Execute migration
    await pool.query(migrationSQL);

    console.log('\n✅ Migration completed successfully!');
    console.log('\n📊 Checking new indexes...');

    const indexCheck = await pool.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'inventory_items'
      ORDER BY indexname
    `);

    console.log('\nCurrent indexes on inventory_items:');
    indexCheck.rows.forEach(row => {
      console.log(`  - ${row.indexname}`);
    });

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

applyMigration();