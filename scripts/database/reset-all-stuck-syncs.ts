#!/usr/bin/env bun
import { query } from '../../src/lib/database/unified-connection';

async function main() {
  console.log('Checking all Active Music suppliers...\n');
  
  const suppliers = await query<{ supplier_id: string; name: string; plusportal_enabled: boolean }>(
    `SELECT supplier_id, name, COALESCE(plusportal_enabled, false) as plusportal_enabled 
     FROM core.supplier 
     WHERE name ILIKE '%active music%'`
  );
  
  console.log('Active Music suppliers found:');
  for (const s of suppliers.rows) {
    console.log(`  - ${s.name} (${s.supplier_id}) - PlusPortal: ${s.plusportal_enabled ? 'enabled' : 'disabled'}`);
  }
  
  // Reset ALL stuck PlusPortal syncs across ALL suppliers
  console.log('\nResetting ALL stuck PlusPortal syncs...');
  const resetResult = await query(
    `UPDATE core.plusportal_sync_log 
     SET status = 'failed', 
         sync_completed_at = NOW(),
         errors = '["Manually reset - sync was stuck"]'::jsonb
     WHERE status = 'in_progress'
     RETURNING log_id, supplier_id`
  );
  
  console.log(`Reset ${resetResult.rowCount} stuck syncs`);
  for (const row of resetResult.rows) {
    console.log(`  - ${row.log_id}`);
  }
  
  // Also reset Sennheiser stuck sync
  console.log('\nResetting Sennheiser stuck sync...');
  const sennheiserResult = await query(
    `UPDATE core.plusportal_sync_log 
     SET status = 'failed', 
         sync_completed_at = NOW(),
         errors = '["Manually reset - sync was stuck"]'::jsonb
     WHERE status = 'in_progress' 
       AND supplier_id = '5d79d50f-70ba-4150-a762-8b62bb177c64'
     RETURNING log_id`
  );
  console.log(`Reset ${sennheiserResult.rowCount} Sennheiser stuck syncs`);
  
  console.log('\n✅ All stuck syncs cleared - you can now retry syncs');
  process.exit(0);
}

main().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});

