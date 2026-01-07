#!/usr/bin/env bun
/**
 * Sync a single PlusPortal supplier
 * Usage: bun scripts/database/sync-single-supplier.ts "SUPPLIER NAME"
 */

import 'dotenv/config';
import { query } from '../../src/lib/database/unified-connection';
import { getPlusPortalSyncService } from '../../src/lib/services/PlusPortalSyncService';
import { getPlusPortalCSVProcessor } from '../../src/lib/services/PlusPortalCSVProcessor';

async function main() {
  const supplierName = process.argv[2];
  
  if (!supplierName) {
    console.log('Usage: bun scripts/database/sync-single-supplier.ts "SUPPLIER NAME"');
    console.log('Example: bun scripts/database/sync-single-supplier.ts "STAGE AUDIO"');
    process.exit(1);
  }

  console.log(`\n🔄 Syncing supplier: ${supplierName}\n`);

  // Get supplier ID
  const supplierResult = await query<{ supplier_id: string; name: string }>(
    `SELECT supplier_id, name FROM core.supplier 
     WHERE UPPER(name) LIKE $1
     AND plusportal_username IS NOT NULL
     ORDER BY name
     LIMIT 1`,
    [`%${supplierName.toUpperCase()}%`]
  );

  if (supplierResult.rows.length === 0) {
    console.log(`❌ Supplier not found or no PlusPortal credentials configured`);
    process.exit(1);
  }

  const supplierId = supplierResult.rows[0].supplier_id;
  const fullName = supplierResult.rows[0].name;
  console.log(`Found: ${fullName}`);
  console.log(`ID: ${supplierId}\n`);

  // Get sync service and config
  const service = getPlusPortalSyncService(supplierId);
  const config = await service.getConfig();

  if (!config || !config.username || !config.password) {
    console.log(`❌ PlusPortal credentials not configured`);
    process.exit(1);
  }

  console.log(`Username: ${config.username}`);
  console.log(`Starting sync...\n`);

  try {
    // Execute sync
    const syncResult = await service.executeSync({
      username: config.username,
      password: config.password,
    });

    console.log(`CSV Downloaded: ${syncResult.csvDownloaded}`);

    if (syncResult.csvDownloaded && syncResult.csvFilePath && syncResult.logId) {
      console.log(`Processing CSV...\n`);
      
      const csvProcessor = getPlusPortalCSVProcessor(supplierId);
      const processingResult = await csvProcessor.processCSV(syncResult.csvFilePath, syncResult.logId);

      console.log(`\n✅ Products Processed: ${processingResult.productsProcessed}`);
      console.log(`✅ Products Created: ${processingResult.productsCreated}`);
      console.log(`✅ Products Updated: ${processingResult.productsUpdated}`);
      console.log(`⏭️  Products Skipped: ${processingResult.productsSkipped}`);

      if (processingResult.errors.length > 0) {
        console.log(`⚠️  Errors: ${processingResult.errors.length}`);
      }

      // Update last sync timestamp
      await query(
        `UPDATE core.supplier SET plusportal_last_sync = NOW() WHERE supplier_id = $1`,
        [supplierId]
      );
    } else {
      console.log(`❌ CSV download failed`);
      if (syncResult.errors.length > 0) {
        for (const error of syncResult.errors) {
          console.log(`   - ${error}`);
        }
      }
    }

    // Cleanup
    service.cleanup();
  } catch (error) {
    console.log(`❌ Sync failed: ${error instanceof Error ? error.message : error}`);
  }

  // Final count
  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM core.supplier_product WHERE supplier_id = $1 AND is_active = true`,
    [supplierId]
  );
  console.log(`\n📊 Final product count: ${countResult.rows[0].count}\n`);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });

