#!/usr/bin/env bun
/**
 * Run PlusPortal Syncs Directly (No API)
 * Uses the new Shopping tab scraping flow
 */

import 'dotenv/config';
import { getPlusPortalSyncService } from '../../src/lib/services/PlusPortalSyncService';
import { getPlusPortalDataProcessor } from '../../src/lib/services/PlusPortalDataProcessor';

const SUPPLIERS = [
  { id: '5d79d50f-70ba-4150-a762-8b62bb177c64', name: 'Sennheiser' },
  { id: '146836e6-706a-4cda-b415-8da00b138c96', name: 'Active Music Distribution' },
  { id: '63a205bd-2890-458b-b19e-6ef836f011e7', name: 'AV Distribution' },
  { id: 'f56fb431-a128-4152-b164-7996baa0c8d5', name: 'Stage Audio Works' },
];

async function runSync(supplierId: string, supplierName: string) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`🔄 ${supplierName}`);
  console.log(`${'='.repeat(70)}`);
  console.log(`Supplier ID: ${supplierId}\n`);

  const service = getPlusPortalSyncService(supplierId);
  const config = await service.getConfig();

  if (!config || !config.username || !config.password) {
    console.log(`❌ Credentials not configured\n`);
    return { success: false, supplierName, error: 'No credentials' };
  }

  console.log(`Username: ${config.username}`);
  console.log(`Password: ${config.password ? '***' : 'NOT SET'}`);
  console.log(`Enabled: ${config.enabled}`);
  console.log(`\nStarting sync...\n`);

  try {
    // Execute sync (scrapes Shopping tab)
    const syncResult = await service.executeSync({
      username: config.username,
      password: config.password,
    });

    if (!syncResult.success || !syncResult.dataScraped || !syncResult.scrapedProducts) {
      console.log(`❌ Scraping failed`);
      if (syncResult.errors.length > 0) {
        syncResult.errors.forEach(err => console.log(`   - ${err}`));
      }
      return { success: false, supplierName, error: 'Scraping failed' };
    }

    console.log(`✅ Scraped ${syncResult.scrapedProducts.length} products from ${syncResult.totalPages} pages`);

    // Process scraped data
    if (syncResult.scrapedProducts.length > 0 && syncResult.logId) {
      console.log(`\nProcessing products...`);
      const processor = getPlusPortalDataProcessor(supplierId);
      const processResult = await processor.processScrapedData(syncResult.scrapedProducts, syncResult.logId);

      console.log(`\n✅ Processing Complete:`);
      console.log(`   Products Processed: ${processResult.productsProcessed}`);
      console.log(`   Products Created: ${processResult.productsCreated}`);
      console.log(`   Products Updated: ${processResult.productsUpdated}`);
      console.log(`   Products Skipped: ${processResult.productsSkipped}`);
      console.log(`   Discount Rules Created: ${processResult.discountRulesCreated}`);
      console.log(`   Discount Rules Updated: ${processResult.discountRulesUpdated}`);

      if (processResult.errors.length > 0) {
        console.log(`\n⚠️  Errors: ${processResult.errors.length}`);
        processResult.errors.slice(0, 10).forEach((err, idx) => {
          console.log(`   ${idx + 1}. ${err}`);
        });
      }

      // Update last sync timestamp
      await service.updateConfig({ enabled: config.enabled });
      
      return { 
        success: true, 
        supplierName, 
        productsProcessed: processResult.productsProcessed,
        productsCreated: processResult.productsCreated,
        discountRulesCreated: processResult.discountRulesCreated,
      };
    }

    return { success: false, supplierName, error: 'No products to process' };
  } catch (error) {
    console.log(`❌ Sync failed: ${error instanceof Error ? error.message : error}`);
    return { success: false, supplierName, error: error instanceof Error ? error.message : 'Unknown error' };
  } finally {
    service.cleanup();
  }
}

async function main() {
  console.log('\n🚀 Running PlusPortal Syncs (Shopping Tab Scraping)\n');

  const results = [];
  
  for (const supplier of SUPPLIERS) {
    const result = await runSync(supplier.id, supplier.name);
    results.push(result);
    
    if (supplier !== SUPPLIERS[SUPPLIERS.length - 1]) {
      console.log(`\n⏳ Waiting 15 seconds before next sync...\n`);
      await new Promise(resolve => setTimeout(resolve, 15000));
    }
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log('SUMMARY');
  console.log(`${'='.repeat(70)}\n`);
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`✅ Successful: ${successful.length}`);
  successful.forEach(r => {
    console.log(`   ${r.supplierName}: ${r.productsProcessed || 0} products, ${r.productsCreated || 0} created, ${r.discountRulesCreated || 0} discount rules`);
  });

  console.log(`\n❌ Failed: ${failed.length}`);
  failed.forEach(r => {
    console.log(`   ${r.supplierName}: ${r.error}`);
  });

  console.log();
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
