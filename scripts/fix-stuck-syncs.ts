/**
 * Script to fix stuck PlusPortal sync logs
 * Marks any in_progress logs older than 5 minutes as failed
 */

import { query } from '../src/lib/database';

async function fixStuckSyncs() {
  console.log('Checking for stuck sync logs...\n');
  
  // Find any in_progress logs
  const result = await query<{
    log_id: string;
    supplier_id: string;
    status: string;
    sync_started_at: Date;
    sync_completed_at: Date | null;
  }>(`
    SELECT log_id, supplier_id, status, sync_started_at, sync_completed_at
    FROM core.plusportal_sync_log 
    WHERE status = 'in_progress'
    ORDER BY sync_started_at DESC
  `);
  
  console.log(`Found ${result.rows.length} in-progress logs:`);
  for (const row of result.rows) {
    console.log(`  - Log ${row.log_id}: supplier ${row.supplier_id}, started ${row.sync_started_at}`);
  }
  
  if (result.rows.length > 0) {
    // Mark old in_progress logs as failed (older than 5 minutes)
    const updateResult = await query<{ log_id: string }>(`
      UPDATE core.plusportal_sync_log 
      SET status = 'failed', 
          errors = '["Sync timed out or was interrupted"]'::jsonb,
          sync_completed_at = NOW()
      WHERE status = 'in_progress' 
        AND sync_started_at < NOW() - INTERVAL '5 minutes'
      RETURNING log_id
    `);
    
    console.log(`\nMarked ${updateResult.rows.length} logs as failed`);
    
    // Also mark very recent ones (less than 5 min) as failed if user wants to force
    const forceClean = process.argv.includes('--force');
    if (forceClean) {
      const forceResult = await query<{ log_id: string }>(`
        UPDATE core.plusportal_sync_log 
        SET status = 'failed', 
            errors = '["Sync manually cancelled"]'::jsonb,
            sync_completed_at = NOW()
        WHERE status = 'in_progress'
        RETURNING log_id
      `);
      console.log(`Force-marked ${forceResult.rows.length} remaining logs as failed`);
    } else {
      // Check if there are still recent in_progress logs
      const remaining = await query<{ count: string }>(`
        SELECT COUNT(*) as count FROM core.plusportal_sync_log WHERE status = 'in_progress'
      `);
      if (parseInt(remaining.rows[0].count) > 0) {
        console.log(`\n${remaining.rows[0].count} recent logs still in progress. Use --force to clear all.`);
      }
    }
  } else {
    console.log('\nNo stuck logs found.');
  }
  
  console.log('\nDone!');
  process.exit(0);
}

fixStuckSyncs().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});

