#!/usr/bin/env node
/**
 * Apply AI Database Integration Migration
 *
 * Applies the 003_ai_database_integration.sql migration to the database.
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: '62.169.20.53',
  port: 6600,
  user: 'nxtdb_admin',
  password: 'P@33w0rd-1',
  database: 'nxtprod-db_001'
});

async function applyMigration() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║   AI Database Integration Migration                   ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  const migrationPath = path.join(__dirname, '../database/migrations/003_ai_database_integration.sql');

  try {
    // Read migration file
    console.log('📖 Reading migration file...');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    console.log('✓ Migration file loaded\n');

    // Connect to database
    console.log('🔌 Connecting to database...');
    const client = await pool.connect();
    console.log('✓ Connected to PostgreSQL\n');

    console.log('🚀 Applying migration...\n');

    try {
      // Execute migration
      await client.query(sql);

      console.log('✓ Migration applied successfully!\n');

      // Verify tables created
      console.log('🔍 Verifying tables...');
      const tablesResult = await client.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name LIKE 'ai_%'
        ORDER BY table_name
      `);

      console.log('\n📊 AI Tables Created:');
      tablesResult.rows.forEach(row => {
        console.log(`   ✓ ${row.table_name}`);
      });

      // Verify views created
      console.log('\n🔍 Verifying views...');
      const viewsResult = await client.query(`
        SELECT table_name
        FROM information_schema.views
        WHERE table_schema = 'public'
          AND table_name LIKE 'v_ai_%'
        ORDER BY table_name
      `);

      console.log('\n📈 AI Views Created:');
      viewsResult.rows.forEach(row => {
        console.log(`   ✓ ${row.table_name}`);
      });

      // Test health function
      console.log('\n🏥 Testing health function...');
      const healthResult = await client.query('SELECT * FROM get_ai_health_score()');

      if (healthResult.rows.length > 0) {
        const health = healthResult.rows[0];
        console.log('\n✓ Health function working:');
        console.log(`   Overall Score: ${health.overall_score || 'N/A'}`);
        console.log(`   Query Success Rate: ${health.query_success_rate || 'N/A'}`);
        console.log(`   Avg Execution Time: ${health.avg_execution_time || 'N/A'}ms`);
        console.log(`   Active Anomalies: ${health.active_anomalies || 0}`);
        console.log(`   Critical Anomalies: ${health.unresolved_critical_anomalies || 0}`);
      }

      console.log('\n' + '='.repeat(60));
      console.log('✅ AI Database Integration Setup Complete!');
      console.log('='.repeat(60));
      console.log('\nNext Steps:');
      console.log('1. Start development server: npm run dev');
      console.log('2. Run tests: node scripts/test-ai-database.js');
      console.log('3. Try first query: curl -X POST http://localhost:3000/api/ai/data/query ...');
      console.log('\nDocumentation: /AI_DATABASE_INTEGRATION_COMPLETE.md');
      console.log('Quick Start: /AI_DATABASE_QUICK_START.md\n');

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\nError details:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migration
if (require.main === module) {
  applyMigration();
}

module.exports = { applyMigration };
