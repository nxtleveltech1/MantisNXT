import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function verifyTables() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();

    const result = await client.query(`
      SELECT
        table_name,
        (SELECT COUNT(*) FROM information_schema.columns
         WHERE table_schema = 'spp' AND table_name = t.table_name) as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'spp'
      AND table_name IN ('pricelist_uploads', 'extraction_jobs', 'extracted_products', 'import_batches', 'extraction_metrics', 'extraction_results')
      ORDER BY table_name;
    `);

    console.log('✅ Database tables verified:');
    result.rows.forEach(row => {
      console.log(`  • spp.${row.table_name} (${row.column_count} columns)`);
    });

  } finally {
    await client.end();
  }
}

verifyTables().catch(console.error);