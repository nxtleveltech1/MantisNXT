#!/usr/bin/env bun
/**
 * Enable PlusPortal for all suppliers
 */

import { query } from '../../src/lib/database/unified-connection';

async function enablePlusPortalForAll() {
  console.log('='.repeat(70));
  console.log('ENABLE PLUSPORTAL FOR ALL SUPPLIERS');
  console.log('='.repeat(70));

  // Get all suppliers
  const suppliers = await query<{ 
    supplier_id: string; 
    name: string; 
    plusportal_enabled: boolean;
    plusportal_username: string | null;
  }>(
    `SELECT supplier_id, name, 
            COALESCE(plusportal_enabled, false) as plusportal_enabled,
            plusportal_username
     FROM core.supplier 
     ORDER BY name`
  );

  console.log(`\nFound ${suppliers.rows.length} suppliers\n`);

  for (const s of suppliers.rows) {
    const status = s.plusportal_enabled ? '✅' : '❌';
    console.log(`${status} ${s.name}`);
    console.log(`   ID: ${s.supplier_id}`);
    console.log(`   Username: ${s.plusportal_username || 'NOT SET'}`);
  }

  // Enable PlusPortal for all suppliers
  console.log('\n' + '='.repeat(70));
  console.log('ENABLING PLUSPORTAL FOR ALL...');
  console.log('='.repeat(70));

  const updateResult = await query(
    `UPDATE core.supplier 
     SET plusportal_enabled = true
     WHERE plusportal_enabled IS NULL OR plusportal_enabled = false
     RETURNING supplier_id, name`
  );

  console.log(`\nEnabled PlusPortal for ${updateResult.rowCount} suppliers:`);
  for (const row of updateResult.rows) {
    console.log(`  ✓ ${row.name}`);
  }

  // Verify
  const verifyResult = await query<{ 
    name: string; 
    plusportal_enabled: boolean;
  }>(
    `SELECT name, COALESCE(plusportal_enabled, false) as plusportal_enabled
     FROM core.supplier 
     ORDER BY name`
  );

  console.log('\n' + '='.repeat(70));
  console.log('FINAL STATUS');
  console.log('='.repeat(70));

  for (const s of verifyResult.rows) {
    const status = s.plusportal_enabled ? '✅' : '❌';
    console.log(`${status} ${s.name}`);
  }

  console.log('\n✅ All suppliers now have PlusPortal enabled');
}

enablePlusPortalForAll()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  });

