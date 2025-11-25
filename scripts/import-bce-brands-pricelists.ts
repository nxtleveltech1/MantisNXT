#!/usr/bin/env bun
/**
 * Import BCE Brands Pricelists
 * 
 * Processes PDF pricelist files for BCE Brands and imports
 * into Supplier Inventory Portfolio via the SPP API.
 * 
 * Usage: 
 *   bun scripts/import-bce-brands-pricelists.ts
 * 
 * Requirements:
 *   - DATABASE_URL or NEON_SPP_DATABASE_URL environment variable must be set
 *   - PDF files at the specified paths
 */

import { readFileSync } from 'fs';
import { Client } from 'pg';

// Get connection string from environment
function getConnectionString(): string | null {
  return process.env.DATABASE_URL || 
         process.env.NEON_SPP_DATABASE_URL || 
         process.env.POSTGRES_URL || 
         null;
}

const JUNE_FILE_PATH = 'K:\\00Project\\MantisNXT - Uploads\\All files\\2025_BCE_Brands_Pricelist_June_Final.01.pdf';
const SEPTEMBER_FILE_PATH = 'K:\\00Project\\MantisNXT - Uploads\\All files\\2025_BCE_Brands_Pricelist_September BC ELECTRONICS.pdf';
const SUPPLIER_NAME = 'BCE Brands';
const SUPPLIER_ID_OVERRIDE = process.env.BCE_SUPPLIER_ID || '550e3600-1d08-4870-9711-bb95b753c30d';
const API_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

/**
 * Find supplier ID by name
 */
async function findSupplier(client: Client, supplierName: string): Promise<string | null> {
  const result = await client.query(
    `SELECT supplier_id, name, code 
     FROM core.supplier 
     WHERE LOWER(name) LIKE $1 OR LOWER(name) LIKE $2 OR LOWER(name) LIKE $3
     LIMIT 5`,
    [
      `%${supplierName.toLowerCase()}%`,
      `%bce brands%`,
      `%bc electronics%`
    ]
  );
  
  if (result.rows.length === 0) {
    console.error(`❌ Supplier "${supplierName}" not found`);
    return null;
  }
  
  if (result.rows.length === 1) {
    const supplier = result.rows[0];
    console.log(`✅ Found supplier: ${supplier.name} (${supplier.code}) - ID: ${supplier.supplier_id}`);
    return supplier.supplier_id;
  }
  
  // Multiple matches - show options
  console.log('\n⚠️  Multiple suppliers found:');
  result.rows.forEach((row, idx) => {
    console.log(`   ${idx + 1}. ${row.name} (${row.code}) - ID: ${row.supplier_id}`);
  });
  
  // Return first match
  const supplier = result.rows[0];
  console.log(`✅ Using supplier: ${supplier.name} (${supplier.code}) - ID: ${supplier.supplier_id}`);
  return supplier.supplier_id;
}

/**
 * Upload pricelist file via API
 */
async function uploadPricelist(
  filePath: string,
  supplierId: string,
  filename: string
): Promise<{ success: boolean; upload_id?: string; error?: string }> {
  try {
    console.log(`\n📤 Uploading ${filename}...`);
    
    const fileBuffer = readFileSync(filePath);
    
    // Use Bun's FormData (or Node's if available)
    const formData = new FormData();
    
    // Create a File-like object for Bun
    const file = new File([fileBuffer], filename, { type: 'application/pdf' });
    formData.append('file', file);
    formData.append('supplier_id', supplierId);
    formData.append('action', 'upload_and_validate');
    formData.append('currency', 'ZAR');
    formData.append('auto_validate', 'true');
    formData.append('auto_merge', 'false');
    formData.append('allow_ai_fallback', 'true');
    
    const response = await fetch(`${API_BASE_URL}/api/spp/agent`, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Upload failed: ${response.status} ${response.statusText}`);
      console.error(`   Error: ${errorText}`);
      return { success: false, error: errorText };
    }
    
    const result = await response.json();
    
    if (result.success && result.data?.upload_id) {
      console.log(`✅ Upload successful! Upload ID: ${result.data.upload_id}`);
      return { success: true, upload_id: result.data.upload_id };
    } else {
      console.error(`❌ Upload failed: ${result.error || 'Unknown error'}`);
      return { success: false, error: result.error || 'Unknown error' };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ Upload error: ${errorMessage}`);
    return { success: false, error: errorMessage };
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Starting BCE Brands Pricelist Import\n');
  console.log('=' .repeat(60));
  
  // Get database connection
  const connectionString = getConnectionString();
  if (!connectionString) {
    console.error('❌ DATABASE_URL or NEON_SPP_DATABASE_URL not set');
    process.exit(1);
  }
  
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('✅ Connected to database\n');
    
    // Find supplier
    const supplierId = (await findSupplier(client, SUPPLIER_NAME)) || SUPPLIER_ID_OVERRIDE;
    
    // Process June pricelist first
    console.log('\n' + '='.repeat(60));
    console.log('📅 Processing JUNE pricelist');
    console.log('='.repeat(60));
    
    const juneResult = await uploadPricelist(
      JUNE_FILE_PATH,
      supplierId,
      '2025_BCE_Brands_Pricelist_June_Final.01.pdf'
    );
    
    if (!juneResult.success) {
      console.error(`\n❌ June pricelist upload failed: ${juneResult.error}`);
      console.log('\n⚠️  Continuing with September pricelist...\n');
    } else {
      console.log(`\n✅ June pricelist processed successfully!`);
      console.log(`   Upload ID: ${juneResult.upload_id}`);
    }
    
    // Wait a bit before processing September
    console.log('\n⏳ Waiting 2 seconds before processing September pricelist...\n');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Process September pricelist
    console.log('='.repeat(60));
    console.log('📅 Processing SEPTEMBER pricelist');
    console.log('='.repeat(60));
    
    const septemberResult = await uploadPricelist(
      SEPTEMBER_FILE_PATH,
      supplierId,
      '2025_BCE_Brands_Pricelist_September BC ELECTRONICS.pdf'
    );
    
    if (!septemberResult.success) {
      console.error(`\n❌ September pricelist upload failed: ${septemberResult.error}`);
    } else {
      console.log(`\n✅ September pricelist processed successfully!`);
      console.log(`   Upload ID: ${septemberResult.upload_id}`);
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY');
    console.log('='.repeat(60));
    console.log(`June: ${juneResult.success ? '✅ Success' : '❌ Failed'}`);
    if (juneResult.upload_id) {
      console.log(`   Upload ID: ${juneResult.upload_id}`);
    }
    console.log(`September: ${septemberResult.success ? '✅ Success' : '❌ Failed'}`);
    if (septemberResult.upload_id) {
      console.log(`   Upload ID: ${septemberResult.upload_id}`);
    }
    console.log('\n✅ Import process completed!\n');
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run if executed directly
if (import.meta.main) {
  main().catch(console.error);
}

