#!/usr/bin/env bun

/**
 * Rollback category migration
 * Restores products to old categories using migration log
 */

import { query as dbQuery, withTransaction } from '@/lib/database/unified-connection';

async function rollbackCategoryMigration() {
  console.log('⏪ Starting category migration rollback...\n');

  try {
    // Get migration log entries
    console.log('📊 Fetching migration log...');
    const migrationLogResult = await dbQuery<{
      log_id: string;
      product_id: string;
      product_type: string;
      old_category_id: string | null;
      old_category_name: string | null;
      new_category_id: string | null;
      new_category_name: string | null;
    }>(`
      SELECT 
        log_id,
        product_id,
        product_type,
        old_category_id,
        old_category_name,
        new_category_id,
        new_category_name
      FROM core.category_migration_log
      ORDER BY migrated_at DESC
    `);

    const migrationLog = migrationLogResult.rows;
    console.log(`   Found ${migrationLog.length} migration log entries`);

    if (migrationLog.length === 0) {
      console.log('⚠️  No migration log entries found. Nothing to rollback.');
      return;
    }

    // Confirm rollback
    console.log(`\n⚠️  About to rollback ${migrationLog.length} product migrations`);
    console.log('   This will restore products to their old categories.');
    console.log('\n   Press Ctrl+C to cancel, or wait 5 seconds to continue...');

    // Wait 5 seconds
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Perform rollback
    console.log('\n🔄 Rolling back migrations...');
    let rolledBackCount = 0;
    let skippedCount = 0;

    await withTransaction(async client => {
      for (const entry of migrationLog) {
        try {
          if (!entry.old_category_id) {
            // Was unmapped - skip (can't restore to NULL if it was NULL before)
            skippedCount++;
            continue;
          }

          // Verify old category still exists (or restore it if needed)
          const oldCategoryExists = await client.query<{ exists: boolean }>(`
            SELECT EXISTS(SELECT 1 FROM core.category WHERE category_id = $1) as exists
          `, [entry.old_category_id]);

          if (!oldCategoryExists.rows[0].exists) {
            console.warn(`   ⚠️  Old category ${entry.old_category_name} (${entry.old_category_id}) no longer exists, skipping`);
            skippedCount++;
            continue;
          }

          // Restore product to old category
          if (entry.product_type === 'product') {
            await client.query(
              `UPDATE core.product SET category_id = $1, updated_at = NOW() WHERE product_id = $2`,
              [entry.old_category_id, entry.product_id]
            );
          } else if (entry.product_type === 'supplier_product') {
            await client.query(
              `UPDATE core.supplier_product SET category_id = $1 WHERE supplier_product_id = $2`,
              [entry.old_category_id, entry.product_id]
            );
          } else {
            console.warn(`   ⚠️  Unknown product type: ${entry.product_type}, skipping`);
            skippedCount++;
            continue;
          }

          rolledBackCount++;
          if (rolledBackCount % 100 === 0) {
            console.log(`   Rolled back ${rolledBackCount}/${migrationLog.length}...`);
          }
        } catch (error: any) {
          console.error(`   ❌ Error rolling back ${entry.product_id}: ${error.message}`);
          skippedCount++;
        }
      }
    });

    console.log(`\n✅ Rollback complete!`);
    console.log(`   Rolled back: ${rolledBackCount} products`);
    console.log(`   Skipped: ${skippedCount} products`);

    // Optionally clear migration log
    console.log('\n🗑️  Clearing migration log...');
    await dbQuery(`DELETE FROM core.category_migration_log`);
    console.log('   Migration log cleared');

    console.log('\n✅ Rollback complete! Products have been restored to their old categories.');
    console.log('   Note: Old categories may need to be restored manually if they were deleted.');
  } catch (error) {
    console.error('❌ Error during rollback:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.main) {
  rollbackCategoryMigration();
}

export { rollbackCategoryMigration };

