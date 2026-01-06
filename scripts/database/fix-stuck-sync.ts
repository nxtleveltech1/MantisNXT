#!/usr/bin/env bun
/**
 * Find and reset stuck sync jobs for a supplier
 */

import { query } from '../../src/lib/database/unified-connection';

const supplierName = process.argv[2] || 'Active Music';

async function fixStuckSync() {
  console.log('='.repeat(70));
  console.log(`FIXING STUCK SYNCS FOR: ${supplierName}`);
  console.log('='.repeat(70));

  // Find supplier
  const supplierResult = await query<{ supplier_id: string; name: string }>(
    `SELECT supplier_id, name FROM core.supplier WHERE name ILIKE $1`,
    [`%${supplierName}%`]
  );

  if (supplierResult.rows.length === 0) {
    console.log('Supplier not found!');
    process.exit(1);
  }

  const supplier = supplierResult.rows[0];
  console.log(`\nFound supplier: ${supplier.name} (${supplier.supplier_id})`);

  // Check for stuck PlusPortal syncs
  const plusPortalSyncs = await query<{
    log_id: string;
    status: string;
    sync_started_at: Date;
    sync_completed_at: Date | null;
  }>(
    `SELECT log_id, status, sync_started_at, sync_completed_at
     FROM core.plusportal_sync_log
     WHERE supplier_id = $1 AND status = 'in_progress'
     ORDER BY sync_started_at DESC`,
    [supplier.supplier_id]
  );

  console.log(`\nStuck PlusPortal syncs: ${plusPortalSyncs.rows.length}`);
  
  for (const sync of plusPortalSyncs.rows) {
    console.log(`  - ${sync.log_id}: started ${sync.sync_started_at}`);
    
    // Mark as failed
    await query(
      `UPDATE core.plusportal_sync_log 
       SET status = 'failed', 
           sync_completed_at = NOW(),
           errors = '["Manually reset - sync was stuck"]'::jsonb
       WHERE log_id = $1`,
      [sync.log_id]
    );
    console.log(`    ✓ Reset to failed`);
  }

  // Check for stuck JSON feed syncs
  try {
    const jsonSyncs = await query<{
      log_id: string;
      status: string;
      sync_started_at: Date;
    }>(
      `SELECT log_id, status, sync_started_at
       FROM core.supplier_json_feed_log
       WHERE supplier_id = $1 AND status = 'in_progress'
       ORDER BY sync_started_at DESC`,
      [supplier.supplier_id]
    );

    console.log(`\nStuck JSON feed syncs: ${jsonSyncs.rows.length}`);
    
    for (const sync of jsonSyncs.rows) {
      console.log(`  - ${sync.log_id}: started ${sync.sync_started_at}`);
      
      // Mark as failed
      await query(
        `UPDATE core.supplier_json_feed_log 
         SET status = 'failed', 
             sync_completed_at = NOW(),
             details = jsonb_build_object('error', 'Manually reset - sync was stuck')
         WHERE log_id = $1`,
        [sync.log_id]
      );
      console.log(`    ✓ Reset to failed`);
    }
  } catch (e) {
    console.log('\nNo JSON feed sync log table or different schema - skipping');
  }

  // Also check supplier-level sync flags
  console.log('\nChecking supplier-level sync flags...');
  
  const updateResult = await query(
    `UPDATE core.supplier 
     SET plusportal_sync_in_progress = false,
         json_feed_sync_in_progress = false
     WHERE supplier_id = $1
     RETURNING plusportal_sync_in_progress, json_feed_sync_in_progress`,
    [supplier.supplier_id]
  );
  
  console.log('  ✓ Reset supplier sync flags');

  console.log('\n' + '='.repeat(70));
  console.log('STUCK SYNCS RESET - YOU CAN NOW RETRY THE SYNC');
  console.log('='.repeat(70));
}

fixStuckSync()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  });

