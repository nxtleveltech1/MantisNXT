#!/usr/bin/env bun
/**
 * Fix BCE Brands uploads by deleting invalid rows and re-uploading with fixed PDF handling
 */

import { query } from '../src/lib/database/unified-connection';

const UPLOAD_IDS = [
  // Legacy attempts
  '66ca979d-f31f-4e12-9e2d-6af0d2742667',
  '0a791594-80d4-42fa-aa33-f1831782a9b0',
  // Latest attempts
  '9ad6e236-0b4f-45de-a097-654a56c26ad2',
  'ecb46ac9-58a0-41d0-a406-626fa1abea95'
];

async function main() {
  console.log('🧹 Cleaning up invalid BCE Brands upload rows...\n');
  
  for (const uploadId of UPLOAD_IDS) {
    console.log(`\n🗑️  Deleting invalid rows from upload ${uploadId}...`);
    const result = await query(`
      DELETE FROM spp.pricelist_row WHERE upload_id = $1
    `, [uploadId]);
    console.log(`✅ Deleted rows from upload ${uploadId}`);
    
    // Reset upload status
    await query(`
      UPDATE spp.pricelist_upload 
      SET status = 'received', row_count = 0, errors_json = NULL, updated_at = NOW()
      WHERE upload_id = $1
    `, [uploadId]);
    console.log(`✅ Reset upload status for ${uploadId}`);
  }
  
  console.log('\n✅ Cleanup complete!');
  console.log('\n📝 Next steps:');
  console.log('   1. Re-upload the PDFs using the import script');
  console.log('   2. The fixed code will now properly detect PDFs and use AI extraction');
  console.log('   3. Run: bun run scripts/import-bce-brands-pricelists.ts');
  
  process.exit(0);
}

main().catch(console.error);

