#!/usr/bin/env bun
/**
 * Import BCE Brands December 2025 Pricelist (Excel)
 *
 * Processes Excel pricelist file for BC Electronics and imports
 * into Supplier Inventory Portfolio via the SPP API.
 *
 * Usage:
 *   bun scripts/imports/import-bce-december-2025.ts
 *
 * Requirements:
 *   - DATABASE_URL or NEON_SPP_DATABASE_URL environment variable must be set
 *   - Excel file at the specified path
 */

import { readFileSync } from 'fs';
import { Client } from 'pg';

// Get connection string from environment
function getConnectionString(): string | null {
  return (
    process.env.DATABASE_URL ||
    process.env.NEON_SPP_DATABASE_URL ||
    process.env.POSTGRES_URL ||
    null
  );
}

const EXCEL_FILE_PATH = 'C:\\Users\\garet\\Downloads\\BCE_Brands_Pricelist_December2025.xlsx';
const SUPPLIER_NAME = 'BC ELECTRONICS';
const SUPPLIER_ID_OVERRIDE = process.env.BCE_SUPPLIER_ID || '550e3600-1d08-4870-9711-bb95b753c30d';
const API_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

/**
 * Find supplier ID by name
 */
async function findSupplier(client: Client, supplierName: string): Promise<string | null> {
  const result = await client.query(
    `SELECT supplier_id, name, code 
     FROM core.supplier 
     WHERE LOWER(name) LIKE $1 OR LOWER(name) LIKE $2 OR LOWER(name) LIKE $3 OR LOWER(name) LIKE $4
     LIMIT 5`,
    [
      `%${supplierName.toLowerCase()}%`,
      `%bce brands%`,
      `%bc electronics%`,
      `%bce%`
    ]
  );

  if (result.rows.length === 0) {
    console.error(`❌ Supplier "${supplierName}" not found`);
    return null;
  }

  if (result.rows.length === 1) {
    const supplier = result.rows[0];
    console.log(
      `✅ Found supplier: ${supplier.name} (${supplier.code}) - ID: ${supplier.supplier_id}`
    );
    return supplier.supplier_id;
  }

  // Multiple matches - show options
  console.log('\n⚠️  Multiple suppliers found:');
  result.rows.forEach((row, idx) => {
    console.log(`   ${idx + 1}. ${row.name} (${row.code}) - ID: ${row.supplier_id}`);
  });

  // Return first match
  const supplier = result.rows[0];
  console.log(
    `✅ Using supplier: ${supplier.name} (${supplier.code}) - ID: ${supplier.supplier_id}`
  );
  return supplier.supplier_id;
}

/**
 * Upload Excel pricelist file via API
 */
async function uploadPricelist(
  filePath: string,
  supplierId: string,
  filename: string
): Promise<{ success: boolean; upload_id?: string; error?: string }> {
  try {
    console.log(`\n📤 Uploading ${filename}...`);

    const fileBuffer = readFileSync(filePath);

    // Use Bun's FormData
    const formData = new FormData();

    // Create a File-like object for Bun
    const file = new File([fileBuffer], filename, { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    formData.append('file', file);
    formData.append('supplierId', supplierId);
    formData.append('action', 'upload_and_validate');
    formData.append('currency', 'ZAR');
    formData.append('auto_validate', 'true');
    formData.append('auto_merge', 'false');
    formData.append('allow_ai_fallback', 'true');

    // Try the live upload route first (for Excel files)
    const response = await fetch(`${API_BASE_URL}/api/suppliers/pricelists/upload/live`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      // Fallback to SPP agent route
      console.log('⚠️  Live route failed, trying SPP agent route...');
      const formData2 = new FormData();
      formData2.append('file', file);
      formData2.append('supplier_id', supplierId);
      formData2.append('action', 'upload_and_validate');
      formData2.append('currency', 'ZAR');
      formData2.append('auto_validate', 'true');
      formData2.append('auto_merge', 'false');
      formData2.append('allow_ai_fallback', 'true');

      const response2 = await fetch(`${API_BASE_URL}/api/spp/agent`, {
        method: 'POST',
        body: formData2,
      });

      if (!response2.ok) {
        const errorText = await response2.text();
        console.error(`❌ Upload failed: ${response2.status} ${response2.statusText}`);
        console.error(`   Error: ${errorText}`);
        return { success: false, error: errorText };
      }

      const result2 = await response2.json();
      if (result2.success && result2.data?.upload_id) {
        console.log(`✅ Upload successful! Upload ID: ${result2.data.upload_id}`);
        return { success: true, upload_id: result2.data.upload_id };
      } else {
        console.error(`❌ Upload failed: ${result2.error || 'Unknown error'}`);
        return { success: false, error: result2.error || 'Unknown error' };
      }
    }

    const result = await response.json();

    if (result.success && result.data?.upload_id) {
      console.log(`✅ Upload successful! Upload ID: ${result.data.upload_id}`);
      return { success: true, upload_id: result.data.upload_id };
    } else if (result.success && result.sessionId) {
      console.log(`✅ Upload successful! Session ID: ${result.sessionId}`);
      return { success: true, upload_id: result.sessionId };
    } else {
      console.error(`❌ Upload failed: ${result.error || result.message || 'Unknown error'}`);
      return { success: false, error: result.error || result.message || 'Unknown error' };
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
  console.log('🚀 Starting BC Electronics December 2025 Pricelist Import\n');
  console.log('='.repeat(60));

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
    
    if (!supplierId) {
      console.error('❌ Could not find supplier ID');
      process.exit(1);
    }

    console.log(`\n📋 Using Supplier ID: ${supplierId}\n`);

    // Process December pricelist
    console.log('='.repeat(60));
    console.log('📅 Processing DECEMBER 2025 pricelist');
    console.log('='.repeat(60));

    const result = await uploadPricelist(
      EXCEL_FILE_PATH,
      supplierId,
      'BCE_Brands_Pricelist_December2025.xlsx'
    );

    if (!result.success) {
      console.error(`\n❌ December pricelist upload failed: ${result.error}`);
      process.exit(1);
    } else {
      console.log(`\n✅ December pricelist processed successfully!`);
      if (result.upload_id) {
        console.log(`   Upload ID: ${result.upload_id}`);
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY');
    console.log('='.repeat(60));
    console.log(`December 2025: ${result.success ? '✅ Success' : '❌ Failed'}`);
    if (result.upload_id) {
      console.log(`   Upload ID: ${result.upload_id}`);
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
