#!/usr/bin/env bun

/**
 * Cleanup old categories after migration
 * Verifies no products reference old categories, then deletes them
 */

import { query as dbQuery, withTransaction } from '@/lib/database/unified-connection';

async function cleanupOldCategories() {
  console.log('🧹 Starting category cleanup...\n');

  try {
    // Identify new categories (same logic as analysis script)
    const newCategoryNames = [
      'Guitars, Basses & Amps',
      'Drums & Percussion',
      'Keyboards, Pianos & Synths',
      'Orchestral, Band & Folk',
      'Studio, Recording & Production',
      'Microphones & Wireless',
      'Live Sound & PA',
      'DJ & Electronic Music',
      'Lighting, Stage & Effects',
      'Software & Plugins',
      'Installed AV, Conferencing & Video',
      'Consumer Audio, Hi-Fi & Portable',
      'Cables, Connectors & Power',
      'Accessories, Cases, Racks & Stands',
      'Spares, Components & Consumables',
    ];

    console.log('📊 Identifying old categories...');
    const allCategoriesResult = await dbQuery<{
      category_id: string;
      name: string;
      path: string;
      level: number;
    }>(`
      SELECT category_id, name, path, level
      FROM core.category
      WHERE is_active = true
      ORDER BY level, path
    `);

    const allCategories = allCategoriesResult.rows;

    // Build set of new category IDs (including all descendants)
    const newCategoryIds = new Set<string>();
    for (const cat of allCategories) {
      if (newCategoryNames.includes(cat.name) || cat.level === 1) {
        const descendants = allCategories.filter(
          c => c.path.startsWith(cat.path + '/') || c.path === cat.path
        );
        descendants.forEach(d => newCategoryIds.add(d.category_id));
      }
    }

    const oldCategories = allCategories.filter(c => !newCategoryIds.has(c.category_id));
    console.log(`   Found ${oldCategories.length} old categories to delete`);

    if (oldCategories.length === 0) {
      console.log('✅ No old categories found. Cleanup not needed.');
      return;
    }

    // Verify no products reference old categories
    console.log('\n🔍 Verifying no products reference old categories...');
    const oldCategoryIds = oldCategories.map(c => c.category_id);

    const productsWithOldCategories = await dbQuery<{ count: string }>(`
      SELECT COUNT(*) as count
      FROM core.product
      WHERE category_id = ANY($1::uuid[])
    `, [oldCategoryIds]);

    const supplierProductsWithOldCategories = await dbQuery<{ count: string }>(`
      SELECT COUNT(*) as count
      FROM core.supplier_product
      WHERE category_id = ANY($1::uuid[])
    `, [oldCategoryIds]);

    const productCount = parseInt(productsWithOldCategories.rows[0].count || '0', 10);
    const supplierProductCount = parseInt(supplierProductsWithOldCategories.rows[0].count || '0', 10);

    console.log(`   Products in core.product: ${productCount}`);
    console.log(`   Products in core.supplier_product: ${supplierProductCount}`);

    if (productCount > 0 || supplierProductCount > 0) {
      console.error('\n❌ ERROR: Products still reference old categories!');
      console.error('   Please ensure all products have been migrated before cleanup.');
      console.error('   Run: bun run scripts/migrate-products-to-new-categories.ts');
      process.exit(1);
    }

    // Check for child categories (categories that have old categories as parents)
    console.log('\n🔍 Checking for child categories...');
    const childCategories = await dbQuery<{ category_id: string; name: string }>(`
      SELECT category_id, name
      FROM core.category
      WHERE parent_id = ANY($1::uuid[])
    `, [oldCategoryIds]);

    if (childCategories.rows.length > 0) {
      console.log(`   Found ${childCategories.rows.length} child categories`);
      console.log('   These will be deleted as well (cascading delete)');
    }

    // Confirm deletion
    console.log(`\n⚠️  About to delete ${oldCategories.length} old categories`);
    console.log('   This action cannot be undone without a database backup!');
    console.log('\n   Press Ctrl+C to cancel, or wait 5 seconds to continue...');

    // Wait 5 seconds
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Delete old categories
    console.log('\n🗑️  Deleting old categories...');
    let deletedCount = 0;

    await withTransaction(async client => {
      // Delete in reverse order (children first, then parents)
      // Sort by level descending to delete children before parents
      const sortedOldCategories = [...oldCategories].sort((a, b) => b.level - a.level);

      for (const category of sortedOldCategories) {
        try {
          await client.query(`DELETE FROM core.category WHERE category_id = $1`, [category.category_id]);
          deletedCount++;
          if (deletedCount % 10 === 0) {
            console.log(`   Deleted ${deletedCount}/${oldCategories.length}...`);
          }
        } catch (error: any) {
          // If foreign key constraint fails, log and continue
          if (error.code === '23503') {
            console.warn(`   ⚠️  Could not delete ${category.name} (${category.category_id}): foreign key constraint`);
          } else {
            throw error;
          }
        }
      }
    });

    console.log(`\n✅ Cleanup complete!`);
    console.log(`   Deleted ${deletedCount} categories`);

    // Verify deletion
    const remainingOldCategories = await dbQuery<{ count: string }>(`
      SELECT COUNT(*) as count
      FROM core.category
      WHERE category_id = ANY($1::uuid[])
    `, [oldCategoryIds]);

    const remaining = parseInt(remainingOldCategories.rows[0].count || '0', 10);
    if (remaining > 0) {
      console.log(`\n⚠️  Warning: ${remaining} old categories still exist (may have foreign key constraints)`);
    } else {
      console.log('✅ All old categories successfully deleted');
    }
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.main) {
  cleanupOldCategories();
}

export { cleanupOldCategories };

