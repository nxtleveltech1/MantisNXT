/**
 * Trigger PlusPortal Syncs for All Suppliers
 * Calls the API endpoints to trigger syncs
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

const SUPPLIERS = [
  { id: '5d79d50f-70ba-4150-a762-8b62bb177c64', name: 'Sennheiser Electronics (SA) (Pty) Ltd' },
  { id: '146836e6-706a-4cda-b415-8da00b138c96', name: 'Active Music Distribution' },
  { id: '63a205bd-2890-458b-b19e-6ef836f011e7', name: 'AV Distribution' },
  { id: 'f56fb431-a128-4152-b164-7996baa0c8d5', name: 'Stage Audio Works' },
];

async function triggerSync(supplierId: string, supplierName: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Triggering PlusPortal Sync for: ${supplierName}`);
  console.log(`Supplier ID: ${supplierId}`);
  console.log(`${'='.repeat(60)}\n`);

  try {
    const url = `${API_BASE_URL}/api/suppliers/${supplierId}/plusportal-sync`;
    console.log(`Calling: POST ${url}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      // Extended timeout for long-running syncs
      signal: AbortSignal.timeout(300000), // 5 minutes
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Sync completed successfully');
      console.log(`   CSV Downloaded: ${data.data.csvDownloaded}`);
      console.log(`   Products Processed: ${data.data.productsProcessed || 0}`);
      console.log(`   Products Created: ${data.data.productsCreated || 0}`);
      console.log(`   Products Updated: ${data.data.productsUpdated || 0}`);
      console.log(`   Products Skipped: ${data.data.productsSkipped || 0}`);
      
      if (data.data.errors && data.data.errors.length > 0) {
        console.log(`   Errors: ${data.data.errors.length}`);
        data.data.errors.slice(0, 5).forEach((error: string, idx: number) => {
          console.log(`     ${idx + 1}. ${error}`);
        });
      }
      
      return { success: true, supplierId, supplierName, data: data.data };
    } else {
      throw new Error(data.error || 'Sync failed');
    }
  } catch (error: any) {
    if (error.name === 'TimeoutError' || error.name === 'AbortError') {
      console.error('⏱️  Sync timed out (may still be processing in background)');
      return { success: false, supplierId, supplierName, error: 'Timeout - check sync logs' };
    }
    console.error('❌ Sync failed:', error.message || error);
    return { success: false, supplierId, supplierName, error: error.message || 'Unknown error' };
  }
}

async function runAllSyncs() {
  console.log('\n🚀 Triggering PlusPortal Syncs for All Suppliers\n');
  console.log(`API Base URL: ${API_BASE_URL}`);
  console.log(`Testing ${SUPPLIERS.length} suppliers...\n`);

  const results = [];

  for (const supplier of SUPPLIERS) {
    const result = await triggerSync(supplier.id, supplier.name);
    results.push(result);
    
    // Wait between syncs
    if (supplier !== SUPPLIERS[SUPPLIERS.length - 1]) {
      console.log('\n⏳ Waiting 10 seconds before next sync...\n');
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }

  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('SYNC SUMMARY');
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
      if (r.data) {
        console.log(`     CSV: ${r.data.csvDownloaded ? 'Downloaded' : 'Not downloaded'}`);
        console.log(`     Products: ${r.data.productsProcessed || 0} processed, ${r.data.productsCreated || 0} created`);
      }
    });
    console.log('');
  }

  if (failed.length > 0) {
    console.log('Failed Syncs:');
    failed.forEach(r => {
      console.log(`  ❌ ${r.supplierName}`);
      if (r.error) {
        console.log(`     Error: ${r.error}`);
      }
    });
  }

  console.log(`\n${'='.repeat(60)}\n`);
}

// Run syncs
runAllSyncs().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

