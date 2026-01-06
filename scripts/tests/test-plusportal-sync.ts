/**
 * Test PlusPortal Sync for All Suppliers
 * Runs end-to-end sync for Sennheiser, Active Music Distribution, AV Distribution, and Stage Audio Works
 */

import { query } from '../../src/lib/database/unified-connection';
import { getPlusPortalCSVProcessor } from '../../src/lib/services/PlusPortalCSVProcessor';
import { getPlusPortalSyncService } from '../../src/lib/services/PlusPortalSyncService';

const CREDENTIALS = {
  username: 'charles@nxtleveltech.co.za',
  password: '123456',
};

const SUPPLIERS = [
  { id: '5d79d50f-70ba-4150-a762-8b62bb177c64', name: 'Sennheiser Electronics (SA) (Pty) Ltd' },
  { id: '146836e6-706a-4cda-b415-8da00b138c96', name: 'Active Music Distribution' },
  { id: '63a205bd-2890-458b-b19e-6ef836f011e7', name: 'AV Distribution' },
  { id: 'f56fb431-a128-4152-b164-7996baa0c8d5', name: 'Stage Audio Works' },
];

async function testSyncForSupplier(supplierId: string, supplierName: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing PlusPortal Sync for: ${supplierName}`);
  console.log(`Supplier ID: ${supplierId}`);
  console.log(`${'='.repeat(60)}\n`);

  try {
    const service = getPlusPortalSyncService(supplierId);

    // Step 1: Verify configuration
    console.log('Step 1: Verifying configuration...');
    const config = await service.getConfig();
    if (!config || !config.username || !config.password) {
      console.error('❌ Configuration missing. Setting up credentials...');
      await service.updateConfig({
        username: CREDENTIALS.username,
        password: CREDENTIALS.password,
        enabled: true,
        intervalMinutes: 1440,
      });
      console.log('✅ Credentials configured');
    } else {
      console.log('✅ Configuration found');
      console.log(`   Username: ${config.username}`);
      console.log(`   Enabled: ${config.enabled}`);
    }

    // Step 2: Execute sync
    console.log('\nStep 2: Executing PlusPortal sync...');
    const syncResult = await service.executeSync(CREDENTIALS);

    if (!syncResult.success) {
      console.error('❌ Sync failed:', syncResult.errors.join(', '));
      return { success: false, supplierId, supplierName, errors: syncResult.errors };
    }

    console.log('✅ Sync completed successfully');
    console.log(`   CSV Downloaded: ${syncResult.csvDownloaded}`);
    console.log(`   Log ID: ${syncResult.logId}`);

    // Step 3: Process CSV if downloaded
    if (syncResult.csvDownloaded && syncResult.csvFilePath && syncResult.logId) {
      console.log('\nStep 3: Processing CSV file...');
      try {
        const csvProcessor = getPlusPortalCSVProcessor(supplierId);
        const processingResult = await csvProcessor.processCSV(
          syncResult.csvFilePath,
          syncResult.logId
        );

        console.log('✅ CSV processing completed');
        console.log(`   Products Processed: ${processingResult.productsProcessed}`);
        console.log(`   Products Created: ${processingResult.productsCreated}`);
        console.log(`   Products Updated: ${processingResult.productsUpdated}`);
        console.log(`   Products Skipped: ${processingResult.productsSkipped}`);

        if (processingResult.errors.length > 0) {
          console.log(`   Errors: ${processingResult.errors.length}`);
          processingResult.errors.slice(0, 5).forEach((error, idx) => {
            console.log(`     ${idx + 1}. ${error}`);
          });
        }

        // Update supplier's last sync timestamp
        await query(
          `UPDATE core.supplier 
           SET plusportal_last_sync = NOW() 
           WHERE supplier_id = $1`,
          [supplierId]
        );

        // Update sync log status
        await query(
          `UPDATE core.plusportal_sync_log 
           SET status = 'completed',
               products_processed = $1,
               products_created = $2,
               products_updated = $3,
               products_skipped = $4,
               errors = $5::jsonb,
               sync_completed_at = NOW()
           WHERE log_id = $6`,
          [
            processingResult.productsProcessed,
            processingResult.productsCreated,
            processingResult.productsUpdated,
            processingResult.productsSkipped,
            JSON.stringify(processingResult.errors),
            syncResult.logId,
          ]
        );

        return {
          success: true,
          supplierId,
          supplierName,
          csvDownloaded: true,
          productsProcessed: processingResult.productsProcessed,
          productsCreated: processingResult.productsCreated,
          productsUpdated: processingResult.productsUpdated,
          productsSkipped: processingResult.productsSkipped,
          errors: processingResult.errors,
        };
      } catch (error) {
        console.error('❌ CSV processing failed:', error);
        if (syncResult.logId) {
          await query(
            `UPDATE core.plusportal_sync_log 
             SET status = 'failed',
                 errors = $1::jsonb,
                 sync_completed_at = NOW()
             WHERE log_id = $2`,
            [
              JSON.stringify([`CSV processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`]),
              syncResult.logId,
            ]
          );
        }
        return {
          success: false,
          supplierId,
          supplierName,
          errors: [error instanceof Error ? error.message : 'Unknown error'],
        };
      }
    } else {
      console.log('⚠️  CSV not downloaded - sync may have failed or no CSV available');
      return {
        success: false,
        supplierId,
        supplierName,
        errors: ['CSV not downloaded'],
      };
    }
  } catch (error) {
    console.error('❌ Test failed:', error);
    return {
      success: false,
      supplierId,
      supplierName,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  } finally {
    // Cleanup
    const service = getPlusPortalSyncService(supplierId);
    service.cleanup();
  }
}

async function runAllTests() {
  console.log('\n🚀 Starting PlusPortal Sync Tests for All Suppliers\n');
  console.log(`Testing ${SUPPLIERS.length} suppliers...\n`);

  const results = [];

  for (const supplier of SUPPLIERS) {
    const result = await testSyncForSupplier(supplier.id, supplier.name);
    results.push(result);
    
    // Wait a bit between syncs to avoid rate limiting
    if (supplier !== SUPPLIERS[SUPPLIERS.length - 1]) {
      console.log('\n⏳ Waiting 5 seconds before next sync...\n');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('TEST SUMMARY');
  console.log(`${'='.repeat(60)}\n`);

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`Total Suppliers: ${results.length}`);
  console.log(`✅ Successful: ${successful.length}`);
  console.log(`❌ Failed: ${failed.length}\n`);

  if (successful.length > 0) {
    console.log('Successful Syncs:');
    successful.forEach(r => {
      console.log(`  ✅ ${r.supplierName}`);
      if (r.productsProcessed !== undefined) {
        console.log(`     Products: ${r.productsProcessed} processed, ${r.productsCreated} created, ${r.productsUpdated} updated, ${r.productsSkipped} skipped`);
      }
    });
    console.log('');
  }

  if (failed.length > 0) {
    console.log('Failed Syncs:');
    failed.forEach(r => {
      console.log(`  ❌ ${r.supplierName}`);
      if (r.errors && r.errors.length > 0) {
        r.errors.slice(0, 3).forEach(error => {
          console.log(`     - ${error}`);
        });
      }
    });
  }

  console.log(`\n${'='.repeat(60)}\n`);

  process.exit(failed.length > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

