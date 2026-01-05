import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

async function applyMigrations() {
  const DATABASE_URL = process.env.DATABASE_URL || process.env.ENTERPRISE_DATABASE_URL;

  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL not found in environment variables');
  }

  const client = new Client({
    connectionString: DATABASE_URL,
  });

  const migrations = [
    'database/migrations/0025_extraction_pipeline_core_fixed.sql',
    'database/migrations/0026_import_and_rollback_fixed.sql',
    'database/migrations/0027_metrics_and_monitoring_fixed.sql',
  ];

  console.log('Starting extraction pipeline migrations...');
  console.log('Connecting to database...');

  try {
    await client.connect();
    console.log('✓ Connected to database');

    for (const migrationFile of migrations) {
      const filePath = path.join(process.cwd(), migrationFile);

      try {
        console.log(`\nApplying migration: ${migrationFile}`);
        const sql = fs.readFileSync(filePath, 'utf8');

        // Execute the entire migration as a single transaction
        await client.query('BEGIN');

        try {
          // Remove comments and split by statements carefully
          const cleanedSql = sql
            .split('\n')
            .filter(line => !line.trim().startsWith('--'))
            .join('\n');

          await client.query(cleanedSql);
          await client.query('COMMIT');
          console.log(`✓ Successfully applied: ${migrationFile}`);
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        }
      } catch (error: any) {
        console.error(`✗ Failed to apply ${migrationFile}:`, error.message);

        // Check if it's a duplicate object error
        if (error.message.includes('already exists')) {
          console.log('  → Skipping (already exists)');
          continue;
        }
        throw error;
      }
    }

    // Verify tables were created
    console.log('\nVerifying tables...');
    const tableCheck = await client.query(`
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
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await client.end();
  }
}

applyMigrations()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
