/**
 * Run PlusPortal Syncs via API
 * Simple script to trigger syncs for all 4 suppliers
 */

const API_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

const SUPPLIERS = [
  { id: '5d79d50f-70ba-4150-a762-8b62bb177c64', name: 'Sennheiser' },
  { id: '146836e6-706a-4cda-b415-8da00b138c96', name: 'Active Music Distribution' },
  { id: '63a205bd-2890-458b-b19e-6ef836f011e7', name: 'AV Distribution' },
  { id: 'f56fb431-a128-4152-b164-7996baa0c8d5', name: 'Stage Audio Works' },
];

async function runSync(supplierId: string, supplierName: string) {
  console.log(`\n🔄 Starting sync for: ${supplierName}`);
  console.log(`   Supplier ID: ${supplierId}`);
  
  try {
    const response = await fetch(`${API_URL}/api/suppliers/${supplierId}/plusportal-sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await response.json();
    
    if (data.success) {
      console.log(`✅ ${supplierName}: Success`);
      console.log(`   Data Scraped: ${data.data.dataScraped}`);
      console.log(`   Products: ${data.data.productsProcessed || 0} processed, ${data.data.productsCreated || 0} created, ${data.data.productsUpdated || 0} updated`);
      console.log(`   Discount Rules: ${data.data.discountRulesCreated || 0} created, ${data.data.discountRulesUpdated || 0} updated`);
      return { success: true, supplierName, data: data.data };
    } else {
      console.log(`❌ ${supplierName}: Failed - ${data.error || 'Unknown error'}`);
      if (data.details) console.log(`   Details: ${data.details}`);
      return { success: false, supplierName, error: data.error };
    }
  } catch (error: any) {
    console.log(`❌ ${supplierName}: Error - ${error.message}`);
    return { success: false, supplierName, error: error.message };
  }
}

async function main() {
  console.log('🚀 Running PlusPortal Syncs for All Suppliers\n');
  console.log(`API URL: ${API_URL}\n`);

  const results = [];
  
  for (const supplier of SUPPLIERS) {
    const result = await runSync(supplier.id, supplier.name);
    results.push(result);
    
    if (supplier !== SUPPLIERS[SUPPLIERS.length - 1]) {
      console.log('\n⏳ Waiting 10 seconds...\n');
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Successful: ${results.filter(r => r.success).length}`);
  console.log(`❌ Failed: ${results.filter(r => !r.success).length}`);
}

main().catch(console.error);

