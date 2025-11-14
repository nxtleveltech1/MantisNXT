#!/usr/bin/env node
/**
 * Execute extraction pipeline migrations against Neon database
 * Usage: node scripts/run-extraction-migrations.js
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// Neon connection string
const CONNECTION_STRING = 'postgresql://neondb_owner:npg_84ELeCFbOcGA@ep-steep-waterfall-a96wibpm-pooler.gwc.azure.neon.tech/neondb?channel_binding=require&sslmode=require';

const MIGRATIONS = [
  '0025_extraction_pipeline_core.sql',
  '0026_import_and_rollback.sql',
  '0027_metrics_and_monitoring.sql',
  '0028_cleanup_automation.sql'
];

const MIGRATIONS_DIR = path.join(__dirname, '..', 'database', 'migrations');

async function executeMigration(client, migrationFile) {
  const filePath = path.join(MIGRATIONS_DIR, migrationFile);
  console.log(`\n📄 Executing: ${migrationFile}`);

  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    return false;
  }

  const sql = fs.readFileSync(filePath, 'utf8');

  try {
    const startTime = Date.now();
    await client.query(sql);
    const duration = Date.now() - startTime;
    console.log(`✅ Success (${duration}ms)`);
    return true;
  } catch (error) {
    console.error(`❌ Failed: ${error.message}`);
    console.error(`   Details: ${error.detail || 'N/A'}`);
    throw error;
  }
}

async function getTableCount(client, schema, tableName) {
  try {
    const result = await client.query(
      `SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = $1 AND table_name = $2`,
      [schema, tableName]
    );
    return parseInt(result.rows[0].count);
  } catch (error) {
    return 0;
  }
}

async function getIndexCount(client, tableName) {
  try {
    const result = await client.query(
      `SELECT COUNT(*) as count FROM pg_indexes WHERE tablename = $1`,
      [tableName]
    );
    return parseInt(result.rows[0].count);
  } catch (error) {
    return 0;
  }
}

async function main() {
  const client = new Client({ connectionString: CONNECTION_STRING });

  console.log('🚀 Starting extraction pipeline migrations...\n');
  console.log(`📦 Database: neondb`);
  console.log(`🏢 Schema: spp`);
  console.log(`📋 Migrations: ${MIGRATIONS.length}\n`);

  try {
    await client.connect();
    console.log('✅ Connected to Neon database\n');

    // Execute migrations in order
    for (const migration of MIGRATIONS) {
      await executeMigration(client, migration);
    }

    console.log('\n📊 Migration Summary:\n');

    // Count tables and indexes
    const tables = [
      'pricelist_uploads',
      'extraction_jobs',
      'extraction_results',
      'import_jobs',
      'merge_history',
      'extraction_job_dlq',
      'extraction_metrics',
      'api_rate_limit',
      'extraction_metrics_archive'
    ];

    let totalTables = 0;
    let totalIndexes = 0;

    for (const table of tables) {
      const tableExists = await getTableCount(client, 'spp', table);
      if (tableExists > 0) {
        const indexCount = await getIndexCount(client, table);
        console.log(`   ✓ spp.${table} (${indexCount} indexes)`);
        totalTables++;
        totalIndexes += indexCount;
      }
    }

    console.log(`\n📈 Total: ${totalTables} tables, ${totalIndexes} indexes`);

    // Count functions
    const functionsResult = await client.query(`
      SELECT COUNT(*) as count
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'spp'
    `);
    const functionCount = parseInt(functionsResult.rows[0].count);
    console.log(`⚙️  Functions: ${functionCount}`);

    // Count views
    const viewsResult = await client.query(`
      SELECT COUNT(*) as count
      FROM information_schema.views
      WHERE table_schema = 'spp'
    `);
    const viewCount = parseInt(viewsResult.rows[0].count);
    console.log(`👁️  Views: ${viewCount}`);

    console.log('\n✅ All migrations completed successfully!\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
