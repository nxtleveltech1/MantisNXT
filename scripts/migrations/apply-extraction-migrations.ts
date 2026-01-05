import { pool } from '@/lib/database';
import fs from 'fs';
import path from 'path';

async function applyMigrations() {
  const migrations = [
    'database/migrations/0025_extraction_pipeline_core.sql',
    'database/migrations/0026_import_and_rollback.sql',
    'database/migrations/0027_metrics_and_monitoring.sql',
  ];

  console.log('Starting extraction pipeline migrations...');

  for (const migrationFile of migrations) {
    const filePath = path.join(process.cwd(), migrationFile);

    try {
      console.log(`\nApplying migration: ${migrationFile}`);
      const sql = fs.readFileSync(filePath, 'utf8');

      // Split by semicolons but be careful with functions/procedures
      const statements = sql
        .split(/;\s*$/m)
        .filter(stmt => stmt.trim().length > 0)
        .map(stmt => stmt.trim() + ';');

      for (const statement of statements) {
        if (statement.trim() && !statement.trim().startsWith('--')) {
          await pool.query(statement);
        }
      }

      console.log(`✓ Successfully applied: ${migrationFile}`);
    } catch (error) {
      console.error(`✗ Failed to apply ${migrationFile}:`, error);
      throw error;
    }
  }

  // Verify tables were created
  console.log('\nVerifying tables...');
  const tableCheck = await pool.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'spp'
    AND table_name IN ('pricelist_uploads', 'extraction_jobs', 'extracted_products', 'import_batches')
    ORDER BY table_name;
  `);

  console.log('Created tables:');
  tableCheck.rows.forEach(row => {
    console.log(`  ✓ spp.${row.table_name}`);
  });

  console.log('\n✅ All migrations applied successfully!');
  process.exit(0);
}

applyMigrations().catch(error => {
  console.error('Migration failed:', error);
  process.exit(1);
});
