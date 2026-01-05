#!/usr/bin/env bun

/**
 * Migrate products from old categories to new categories
 * Uses approved category mappings from core.category_mapping table
 */

import { query as dbQuery, withTransaction } from '@/lib/database/unified-connection';

interface ProductMigration {
  product_id: string;
  product_type: 'product' | 'supplier_product';
  old_category_id: string | null;
  old_category_name: string | null;
  new_category_id: string | null;
  new_category_name: string | null;
  confidence: string;
}

async function migrateProducts() {
  console.log('🚀 Starting product migration...\n');

  try {
    // Get all approved mappings
    console.log('📊 Fetching approved category mappings...');
    const mappingsResult = await dbQuery<{
      old_category_id: string;
      old_category_name: string;
      new_category_id: string;
      new_category_name: string;
      confidence: string;
    }>(`
      SELECT 
        old_category_id,
        old_category_name,
        new_category_id,
        new_category_name,
        confidence
      FROM core.category_mapping
      WHERE approved = true
      ORDER BY confidence DESC, similarity_score DESC
    `);

    const mappings = mappingsResult.rows;
    console.log(`   Found ${mappings.length} approved mappings`);

    if (mappings.length === 0) {
      console.log('⚠️  No approved mappings found. Please review and approve mappings first.');
      console.log('   Run: bun run scripts/analyze-category-mapping.ts');
      return;
    }

    // Create mapping lookup
    const categoryMapping = new Map<string, { new_id: string; new_name: string; confidence: string }>();
    for (const mapping of mappings) {
      categoryMapping.set(mapping.old_category_id, {
        new_id: mapping.new_category_id,
        new_name: mapping.new_category_name,
        confidence: mapping.confidence,
      });
    }

    // Get all products with old categories
    console.log('\n📦 Fetching products to migrate...');
    const productsResult = await dbQuery<{
      product_id: string;
      category_id: string | null;
      category_name: string | null;
    }>(`
      SELECT 
        product_id,
        category_id,
        (SELECT name FROM core.category WHERE category_id = p.category_id) as category_name
      FROM core.product p
      WHERE category_id IS NOT NULL
    `);

    const supplierProductsResult = await dbQuery<{
      supplier_product_id: string;
      category_id: string | null;
      category_name: string | null;
    }>(`
      SELECT 
        supplier_product_id,
        category_id,
        (SELECT name FROM core.category WHERE category_id = sp.category_id) as category_name
      FROM core.supplier_product sp
      WHERE category_id IS NOT NULL
    `);

    const products = productsResult.rows;
    const supplierProducts = supplierProductsResult.rows;

    console.log(`   Found ${products.length} products in core.product`);
    console.log(`   Found ${supplierProducts.length} products in core.supplier_product`);

    // Perform migration in transaction
    console.log('\n🔄 Migrating products...');
    const migrationLog: ProductMigration[] = [];
    let migratedCount = 0;
    let unmappedCount = 0;

    await withTransaction(async client => {
      // Migrate core.product
      for (const product of products) {
        if (!product.category_id) continue;

        const mapping = categoryMapping.get(product.category_id);
        if (mapping) {
          // Update product category
          await client.query(
            `UPDATE core.product SET category_id = $1, updated_at = NOW() WHERE product_id = $2`,
            [mapping.new_id, product.product_id]
          );

          // Log migration
          await client.query(
            `
            INSERT INTO core.category_migration_log (
              product_id, product_type, old_category_id, old_category_name,
              new_category_id, new_category_name, mapping_confidence, migrated_at
            )
            VALUES ($1, 'product', $2, $3, $4, $5, $6, NOW())
            `,
            [
              product.product_id,
              product.category_id,
              product.category_name,
              mapping.new_id,
              mapping.new_name,
              mapping.confidence,
            ]
          );

          migratedCount++;
          migrationLog.push({
            product_id: product.product_id,
            product_type: 'product',
            old_category_id: product.category_id,
            old_category_name: product.category_name,
            new_category_id: mapping.new_id,
            new_category_name: mapping.new_name,
            confidence: mapping.confidence,
          });
        } else {
          // Unmapped - set to NULL
          await client.query(
            `UPDATE core.product SET category_id = NULL, updated_at = NOW() WHERE product_id = $1`,
            [product.product_id]
          );

          await client.query(
            `
            INSERT INTO core.category_migration_log (
              product_id, product_type, old_category_id, old_category_name,
              new_category_id, new_category_name, mapping_confidence, migrated_at
            )
            VALUES ($1, 'product', $2, $3, NULL, NULL, 'unmapped', NOW())
            `,
            [product.product_id, product.category_id, product.category_name]
          );

          unmappedCount++;
        }
      }

      // Migrate core.supplier_product
      for (const supplierProduct of supplierProducts) {
        if (!supplierProduct.category_id) continue;

        const mapping = categoryMapping.get(supplierProduct.category_id);
        if (mapping) {
          // Update supplier product category
          await client.query(
            `UPDATE core.supplier_product SET category_id = $1 WHERE supplier_product_id = $2`,
            [mapping.new_id, supplierProduct.supplier_product_id]
          );

          // Log migration
          await client.query(
            `
            INSERT INTO core.category_migration_log (
              product_id, product_type, old_category_id, old_category_name,
              new_category_id, new_category_name, mapping_confidence, migrated_at
            )
            VALUES ($1, 'supplier_product', $2, $3, $4, $5, $6, NOW())
            `,
            [
              supplierProduct.supplier_product_id,
              supplierProduct.category_id,
              supplierProduct.category_name,
              mapping.new_id,
              mapping.new_name,
              mapping.confidence,
            ]
          );

          migratedCount++;
        } else {
          // Unmapped - set to NULL
          await client.query(
            `UPDATE core.supplier_product SET category_id = NULL WHERE supplier_product_id = $1`,
            [supplierProduct.supplier_product_id]
          );

          await client.query(
            `
            INSERT INTO core.category_migration_log (
              product_id, product_type, old_category_id, old_category_name,
              new_category_id, new_category_name, mapping_confidence, migrated_at
            )
            VALUES ($1, 'supplier_product', $2, $3, NULL, NULL, 'unmapped', NOW())
            `,
            [supplierProduct.supplier_product_id, supplierProduct.category_id, supplierProduct.category_name]
          );

          unmappedCount++;
        }
      }
    });

    console.log(`\n✅ Migration complete!`);
    console.log(`   Migrated: ${migratedCount} products`);
    console.log(`   Unmapped: ${unmappedCount} products`);
    console.log(`   Total logged: ${migrationLog.length + unmappedCount} entries`);

    // Summary by confidence
    const highConfidence = migrationLog.filter(m => m.confidence === 'high').length;
    const lowConfidence = migrationLog.filter(m => m.confidence === 'low').length;
    console.log(`\n   By confidence:`);
    console.log(`     High: ${highConfidence}`);
    console.log(`     Low: ${lowConfidence}`);
    console.log(`     Unmapped: ${unmappedCount}`);
  } catch (error) {
    console.error('❌ Error migrating products:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.main) {
  migrateProducts();
}

export { migrateProducts };

