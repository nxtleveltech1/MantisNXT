#!/usr/bin/env bun
/**
 * Verify Supplier Records
 * Checks if the three suppliers exist in the database
 */

import { query } from '@/lib/database';

const SUPPLIERS = [
  'Musical Distributors',
  'Marshall Music Distributors',
  'AudioSure',
];

async function main() {
  console.log('🔍 Verifying Supplier Records\n');

  for (const supplierName of SUPPLIERS) {
    const normalized = supplierName.toLowerCase().trim().replace(/\s+/g, ' ');
    
    // Check core.supplier
    const coreResult = await query<{ supplier_id: string; name: string }>(
      `SELECT supplier_id, name 
       FROM core.supplier 
       WHERE LOWER(TRIM(name)) = $1 
          OR LOWER(TRIM(name)) ILIKE $2
       LIMIT 5`,
      [normalized, `%${normalized}%`]
    );

    console.log(`\n📋 ${supplierName}:`);
    if (coreResult.rows.length > 0) {
      console.log(`   ✅ Found ${coreResult.rows.length} match(es) in core.supplier:`);
      coreResult.rows.forEach(row => {
        console.log(`      - ${row.name} (ID: ${row.supplier_id})`);
      });
    } else {
      console.log(`   ❌ Not found in core.supplier`);
    }
  }

  console.log('\n✅ Verification complete');
}

if (import.meta.main) {
  main().catch(console.error);
}
