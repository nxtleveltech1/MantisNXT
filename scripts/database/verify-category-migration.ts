#!/usr/bin/env bun

/**
 * Verify category migration success
 * Checks product counts, uncategorized products, and category hierarchy integrity
 */

import { query as dbQuery } from '@/lib/database/unified-connection';

async function verifyCategoryMigration() {
  console.log('🔍 Verifying category migration...\n');

  try {
    // Get category statistics
    console.log('📊 Category Statistics:');
    const categoryStats = await dbQuery<{ level: number; count: string }>(`
      SELECT level, COUNT(*) as count
      FROM core.category
      WHERE is_active = true
      GROUP BY level
      ORDER BY level
    `);

    console.log('   Categories by level:');
    for (const stat of categoryStats.rows) {
      console.log(`     Level ${stat.level}: ${stat.count} categories`);
    }

    // Get product counts per category
    console.log('\n📦 Product Distribution:');
    const productDistribution = await dbQuery<{
      category_name: string;
      product_count: string;
      supplier_product_count: string;
    }>(`
      SELECT 
        c.name as category_name,
        COUNT(DISTINCT p.product_id) as product_count,
        COUNT(DISTINCT sp.supplier_product_id) as supplier_product_count
      FROM core.category c
      LEFT JOIN core.product p ON p.category_id = c.category_id
      LEFT JOIN core.supplier_product sp ON sp.category_id = c.category_id
      WHERE c.is_active = true
      GROUP BY c.category_id, c.name
      HAVING COUNT(DISTINCT p.product_id) > 0 OR COUNT(DISTINCT sp.supplier_product_id) > 0
      ORDER BY (COUNT(DISTINCT p.product_id) + COUNT(DISTINCT sp.supplier_product_id)) DESC
      LIMIT 20
    `);

    console.log('   Top 20 categories by product count:');
    for (const dist of productDistribution.rows) {
      const total = parseInt(dist.product_count || '0', 10) + parseInt(dist.supplier_product_count || '0', 10);
      console.log(`     ${dist.category_name}: ${total} products (${dist.product_count} core.product, ${dist.supplier_product_count} supplier_product)`);
    }

    // Check for uncategorized products
    console.log('\n🔍 Uncategorized Products:');
    const uncategorizedProducts = await dbQuery<{ count: string }>(`
      SELECT COUNT(*) as count
      FROM core.product
      WHERE category_id IS NULL
    `);

    const uncategorizedSupplierProducts = await dbQuery<{ count: string }>(`
      SELECT COUNT(*) as count
      FROM core.supplier_product
      WHERE category_id IS NULL
    `);

    const uncatProducts = parseInt(uncategorizedProducts.rows[0].count || '0', 10);
    const uncatSupplierProducts = parseInt(uncategorizedSupplierProducts.rows[0].count || '0', 10);

    console.log(`   core.product: ${uncatProducts} uncategorized`);
    console.log(`   core.supplier_product: ${uncatSupplierProducts} uncategorized`);

    if (uncatProducts > 0 || uncatSupplierProducts > 0) {
      console.log('   ⚠️  Some products are uncategorized (this may be expected)');
    }

    // Check for orphaned products (pointing to non-existent categories)
    console.log('\n🔍 Orphaned Products:');
    const orphanedProducts = await dbQuery<{ count: string }>(`
      SELECT COUNT(*) as count
      FROM core.product p
      WHERE p.category_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM core.category c WHERE c.category_id = p.category_id
      )
    `);

    const orphanedSupplierProducts = await dbQuery<{ count: string }>(`
      SELECT COUNT(*) as count
      FROM core.supplier_product sp
      WHERE sp.category_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM core.category c WHERE c.category_id = sp.category_id
      )
    `);

    const orphanProducts = parseInt(orphanedProducts.rows[0].count || '0', 10);
    const orphanSupplierProducts = parseInt(orphanedSupplierProducts.rows[0].count || '0', 10);

    console.log(`   core.product: ${orphanProducts} orphaned`);
    console.log(`   core.supplier_product: ${orphanSupplierProducts} orphaned`);

    if (orphanProducts > 0 || orphanSupplierProducts > 0) {
      console.error('   ❌ ERROR: Found orphaned products!');
      console.error('   These products reference categories that no longer exist.');
    } else {
      console.log('   ✅ No orphaned products found');
    }

    // Verify category hierarchy integrity
    console.log('\n🔍 Category Hierarchy Integrity:');
    const invalidParents = await dbQuery<{
      category_id: string;
      name: string;
      parent_id: string;
    }>(`
      SELECT c.category_id, c.name, c.parent_id
      FROM core.category c
      WHERE c.parent_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM core.category p WHERE p.category_id = c.parent_id
      )
    `);

    if (invalidParents.rows.length > 0) {
      console.error(`   ❌ ERROR: Found ${invalidParents.rows.length} categories with invalid parent references:`);
      for (const invalid of invalidParents.rows) {
        console.error(`     - ${invalid.name} (${invalid.category_id}) -> parent ${invalid.parent_id} not found`);
      }
    } else {
      console.log('   ✅ All category parent references are valid');
    }

    // Check level consistency
    const levelInconsistencies = await dbQuery<{
      category_id: string;
      name: string;
      level: number;
      parent_level: number | null;
    }>(`
      SELECT 
        c.category_id,
        c.name,
        c.level,
        p.level as parent_level
      FROM core.category c
      LEFT JOIN core.category p ON p.category_id = c.parent_id
      WHERE c.parent_id IS NOT NULL
      AND (p.level IS NULL OR c.level != p.level + 1)
    `);

    if (levelInconsistencies.rows.length > 0) {
      console.warn(`   ⚠️  Found ${levelInconsistencies.rows.length} categories with level inconsistencies:`);
      for (const inc of levelInconsistencies.rows.slice(0, 5)) {
        console.warn(`     - ${inc.name}: level ${inc.level}, parent level ${inc.parent_level}`);
      }
    } else {
      console.log('   ✅ All category levels are consistent');
    }

    // Migration log summary
    console.log('\n📋 Migration Log Summary:');
    const migrationSummary = await dbQuery<{
      confidence: string;
      count: string;
    }>(`
      SELECT mapping_confidence as confidence, COUNT(*) as count
      FROM core.category_migration_log
      GROUP BY mapping_confidence
      ORDER BY mapping_confidence
    `);

    for (const summary of migrationSummary.rows) {
      console.log(`   ${summary.confidence}: ${summary.count} migrations`);
    }

    const totalMigrations = await dbQuery<{ count: string }>(`
      SELECT COUNT(*) as count FROM core.category_migration_log
    `);
    console.log(`   Total logged migrations: ${totalMigrations.rows[0].count}`);

    // Final summary
    console.log('\n✅ Verification complete!');
    if (orphanProducts === 0 && orphanSupplierProducts === 0 && invalidParents.rows.length === 0) {
      console.log('✅ All checks passed - migration appears successful');
    } else {
      console.log('⚠️  Some issues found - please review above');
    }
  } catch (error) {
    console.error('❌ Error during verification:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.main) {
  verifyCategoryMigration();
}

export { verifyCategoryMigration };

