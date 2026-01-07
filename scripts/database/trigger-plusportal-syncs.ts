#!/usr/bin/env bun
/**
 * Trigger PlusPortal syncs for all affected suppliers
 * This restores the products that were incorrectly deleted.
 */

import 'dotenv/config';
import { query } from '../../src/lib/database/unified-connection';
import { getPlusPortalSyncService } from '../../src/lib/services/PlusPortalSyncService';
import { getPlusPortalCSVProcessor } from '../../src/lib/services/PlusPortalCSVProcessor';

const SUPPLIERS_TO_SYNC = [
  'AV DISTRIBUTION',
  'STAGE AUDIO WORKS', 
  'ACTIVE MUSIC DISTRIBUTION',
];

async function main() {
  console.log('='.repeat(70));
  console.log('🔄 Triggering PlusPortal Syncs to Restore Deleted Products');
  console.log('='.repeat(70));
  console.log();

  for (const supplierName of SUPPLIERS_TO_SYNC) {
    console.log('─'.repeat(70));
    console.log(`📦 ${supplierName}`);
    console.log('─'.repeat(70));

    // Get supplier ID - use exact match on the full name pattern
    const supplierResult = await query<{ supplier_id: string; name: string }>(
      `SELECT supplier_id, name FROM core.supplier 
       WHERE UPPER(name) LIKE $1
       AND plusportal_username IS NOT NULL
       ORDER BY name
       LIMIT 1`,
      [`%${supplierName.toUpperCase()}%`]
    );

    if (supplierResult.rows.length === 0) {
      console.log(`   ❌ Supplier not found\n`);
      continue;
    }

    const supplierId = supplierResult.rows[0].supplier_id;
    console.log(`   Supplier ID: ${supplierId}`);

    // Get sync service and config
    const service = getPlusPortalSyncService(supplierId);
    const config = await service.getConfig();

    if (!config || !config.username || !config.password) {
      console.log(`   ❌ PlusPortal credentials not configured\n`);
      continue;
    }

    console.log(`   Username: ${config.username}`);
    console.log(`   Starting sync...`);

    try {
      // Execute sync
      const syncResult = await service.executeSync({
        username: config.username,
        password: config.password,
      });

      console.log(`   CSV Downloaded: ${syncResult.csvDownloaded}`);

      if (syncResult.csvDownloaded && syncResult.csvFilePath && syncResult.logId) {
        console.log(`   Processing CSV...`);
        
        const csvProcessor = getPlusPortalCSVProcessor(supplierId);
        const processingResult = await csvProcessor.processCSV(syncResult.csvFilePath, syncResult.logId);

        console.log(`   ✅ Products Processed: ${processingResult.productsProcessed}`);
        console.log(`   ✅ Products Created: ${processingResult.productsCreated}`);
        console.log(`   ✅ Products Updated: ${processingResult.productsUpdated}`);
        console.log(`   ⏭️  Products Skipped: ${processingResult.productsSkipped}`);

        if (processingResult.errors.length > 0) {
          console.log(`   ⚠️  Errors: ${processingResult.errors.length}`);
          for (const error of processingResult.errors.slice(0, 5)) {
            console.log(`      - ${error}`);
          }
        }

        // Update last sync timestamp
        await query(
          `UPDATE core.supplier SET plusportal_last_sync = NOW() WHERE supplier_id = $1`,
          [supplierId]
        );
      } else {
        console.log(`   ❌ CSV download failed`);
        if (syncResult.errors.length > 0) {
          for (const error of syncResult.errors) {
            console.log(`      - ${error}`);
          }
        }
      }

      // Cleanup
      service.cleanup();
    } catch (error) {
      console.log(`   ❌ Sync failed: ${error instanceof Error ? error.message : error}`);
    }

    console.log();
  }

  // Final product counts
  console.log('='.repeat(70));
  console.log('📊 Final Product Counts');
  console.log('='.repeat(70));
  console.log();

  for (const supplierName of SUPPLIERS_TO_SYNC) {
    const countResult = await query<{ name: string; count: string }>(
      `SELECT s.name, COUNT(sp.supplier_product_id) as count
       FROM core.supplier s
       LEFT JOIN core.supplier_product sp ON sp.supplier_id = s.supplier_id AND sp.is_active = true
       WHERE LOWER(s.name) LIKE $1
       GROUP BY s.name`,
      [`%${supplierName.toLowerCase().split(' ')[0]}%`]
    );

    if (countResult.rows.length > 0) {
      console.log(`   ${countResult.rows[0].name}: ${countResult.rows[0].count} products`);
    }
  }

  console.log();
  console.log('✅ Sync complete!\n');
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });

