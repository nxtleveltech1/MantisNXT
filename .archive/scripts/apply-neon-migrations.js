/**
 * Apply Neon Database Migrations
 * Runs all migration files in order
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_84ELeCFbOcGA@ep-steep-waterfall-a96wibpm-pooler.gwc.azure.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false },
  max: 5
});

const MIGRATION_DIR = path.join(__dirname, '..', 'database', 'migrations', 'neon');

async function runMigration(filePath, fileName) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📄 Running migration: ${fileName}`);
  console.log('='.repeat(80));

  const sql = fs.readFileSync(filePath, 'utf8');

  console.log(`SQL file size: ${(sql.length / 1024).toFixed(2)} KB`);
  console.log(`Starting execution...`);

  const startTime = Date.now();

  try {
    // Execute the entire migration file as a single transaction
    const result = await pool.query(sql);

    const duration = Date.now() - startTime;

    console.log(`\n✅ Migration completed successfully`);
    console.log(`   Duration: ${duration}ms`);

    if (result.rows && result.rows.length > 0) {
      console.log(`   Result rows: ${result.rows.length}`);
      console.log('\n   Sample output:');
      console.log(JSON.stringify(result.rows.slice(0, 3), null, 2));
    }

    return { success: true, duration, file: fileName };
  } catch (error) {
    const duration = Date.now() - startTime;

    console.log(`\n❌ Migration failed`);
    console.log(`   Duration: ${duration}ms`);
    console.log(`   Error: ${error.message}`);
    console.log(`   Code: ${error.code}`);

    if (error.position) {
      const errorLine = sql.substring(0, error.position).split('\n').length;
      console.log(`   Error at line: ~${errorLine}`);
    }

    return { success: false, duration, file: fileName, error: error.message };
  }
}

async function main() {
  console.log('🚀 Neon Database Migration Runner');
  console.log('Project: proud-mud-50346856 (NXT-SPP)\n');

  // Get all .sql files from migration directory
  const files = fs.readdirSync(MIGRATION_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();  // Run in alphabetical order (001_, 002_, etc.)

  if (files.length === 0) {
    console.log('⚠️  No migration files found in:', MIGRATION_DIR);
    await pool.end();
    return;
  }

  console.log(`Found ${files.length} migration file(s):\n`);
  files.forEach((f, i) => {
    console.log(`  ${i + 1}. ${f}`);
  });

  const results = [];

  for (const file of files) {
    const filePath = path.join(MIGRATION_DIR, file);
    const result = await runMigration(filePath, file);
    results.push(result);

    // Stop on first failure (to prevent cascading errors)
    if (!result.success) {
      console.log('\n⚠️  Stopping migration run due to error');
      break;
    }
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 Migration Summary');
  console.log('='.repeat(80));

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

  console.log(`\nTotal migrations: ${results.length}`);
  console.log(`Successful: ${successful}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total duration: ${totalDuration}ms`);

  if (successful === results.length) {
    console.log('\n✅ All migrations completed successfully!');
  } else {
    console.log('\n❌ Some migrations failed. Review errors above.');
  }

  // Verify views created
  if (successful > 0) {
    console.log('\n' + '='.repeat(80));
    console.log('🔍 Verifying Database State');
    console.log('='.repeat(80));

    try {
      const viewCheck = await pool.query(`
        SELECT table_name
        FROM information_schema.views
        WHERE table_schema = 'public'
        ORDER BY table_name
      `);

      console.log(`\n✅ Views in public schema (${viewCheck.rows.length}):`);
      viewCheck.rows.forEach(r => {
        console.log(`   - ${r.table_name}`);
      });

      // Test view queries
      const testQueries = [
        { name: 'Suppliers', sql: 'SELECT COUNT(*) as count FROM public.suppliers' },
        { name: 'Inventory Items', sql: 'SELECT COUNT(*) as count FROM public.inventory_items' },
        { name: 'Products', sql: 'SELECT COUNT(*) as count FROM public.products' }
      ];

      console.log('\n📊 View Data Counts:');
      for (const { name, sql } of testQueries) {
        try {
          const result = await pool.query(sql);
          console.log(`   ${name}: ${result.rows[0].count} rows`);
        } catch (error) {
          console.log(`   ${name}: ❌ ${error.message}`);
        }
      }
    } catch (error) {
      console.log(`\n⚠️  Verification error: ${error.message}`);
    }
  }

  await pool.end();
  console.log('\n✅ Migration runner complete\n');
}

main().catch(console.error);
