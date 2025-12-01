#!/usr/bin/env bun
/**
 * Check BCE Brands upload status
 */

import { query } from '../src/lib/database/unified-connection';

const UPLOAD_IDS = [
  '66ca979d-f31f-4e12-9e2d-6af0d2742667', // June
  '0a791594-80d4-42fa-aa33-f1831782a9b0', // September
];

async function main() {
  console.log('🔍 Checking BCE Brands upload status...\n');

  // Check upload records
  const uploadResult = await query(
    `
    SELECT 
      upload_id,
      filename,
      status,
      row_count,
      errors_json,
      received_at,
      processed_at
    FROM spp.pricelist_upload 
    WHERE upload_id = ANY($1)
    ORDER BY received_at
  `,
    [UPLOAD_IDS]
  );

  console.log('📋 Upload Records:');
  console.log('='.repeat(80));
  for (const upload of uploadResult.rows) {
    console.log(`\nUpload ID: ${upload.upload_id}`);
    console.log(`  Filename: ${upload.filename}`);
    console.log(`  Status: ${upload.status}`);
    console.log(`  Row Count: ${upload.row_count || 0}`);
    console.log(`  Received: ${upload.received_at}`);
    console.log(`  Processed: ${upload.processed_at || 'Not processed'}`);
    if (upload.errors_json) {
      console.log(`  Errors: ${JSON.stringify(upload.errors_json, null, 2)}`);
    }
  }

  // Check rows inserted
  const rowsResult = await query(
    `
    SELECT 
      upload_id,
      COUNT(*) as row_count
    FROM spp.pricelist_row 
    WHERE upload_id = ANY($1)
    GROUP BY upload_id
  `,
    [UPLOAD_IDS]
  );

  console.log('\n\n📊 Rows Inserted:');
  console.log('='.repeat(80));
  for (const row of rowsResult.rows) {
    console.log(`  Upload ${row.upload_id}: ${row.row_count} rows`);
  }

  if (rowsResult.rows.length === 0) {
    console.log('  ⚠️  No rows found in spp.pricelist_row table!');
  }

  // Check if merged to core
  const mergedResult = await query(
    `
    SELECT 
      COUNT(*) as product_count
    FROM core.supplier_product sp
    JOIN spp.pricelist_row pr ON pr.supplier_sku = sp.supplier_sku
    WHERE pr.upload_id = ANY($1)
      AND sp.supplier_id = (SELECT supplier_id FROM spp.pricelist_upload WHERE upload_id = $2 LIMIT 1)
  `,
    [UPLOAD_IDS, UPLOAD_IDS[0]]
  );

  console.log('\n\n🔄 Merged Products:');
  console.log('='.repeat(80));
  console.log(`  Products in core.supplier_product: ${mergedResult.rows[0]?.product_count || 0}`);

  process.exit(0);
}

main().catch(console.error);
