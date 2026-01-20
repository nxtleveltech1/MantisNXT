#!/usr/bin/env bun
/**
 * Add Stage Audio Works Products to Active Selections
 *
 * Adds all Stage Audio Works products to active inventory selections
 * so they are visible in the UI.
 *
 * Usage:
 *   bun scripts/database/add-stage-audio-works-to-selections.ts
 *
 * Requirements:
 *   - DATABASE_URL or NEON_SPP_DATABASE_URL environment variable must be set
 */

import { Client } from 'pg';
import { randomUUID } from 'crypto';

const STAGE_AUDIO_WORKS_SUPPLIER_ID = 'f56fb431-a128-4152-b164-7996baa0c8d5';
const ACTIVE_SELECTIONS = [
  {
    selection_id: 'd07f46ab-2ba8-4534-a277-9b96356ccb97',
    selection_name: 'Default Selection',
  },
  {
    selection_id: '193e6e68-991a-42a1-bbbb-fed1004a7a84',
    selection_name: 'E2E Test Selection - 20251011_123540',
  },
];

/**
 * Get all Stage Audio Works product IDs
 */
async function getStageAudioWorksProducts(client: Client): Promise<string[]> {
  const result = await client.query<{ supplier_product_id: string }>(
    `SELECT supplier_product_id
     FROM core.supplier_product
     WHERE supplier_id = $1
     AND is_active = true`,
    [STAGE_AUDIO_WORKS_SUPPLIER_ID]
  );

  return result.rows.map(row => row.supplier_product_id);
}

/**
 * Get products already in a selection
 */
async function getProductsInSelection(
  client: Client,
  selectionId: string
): Promise<Set<string>> {
  const result = await client.query<{ supplier_product_id: string }>(
    `SELECT supplier_product_id
     FROM core.inventory_selected_item
     WHERE selection_id = $1`,
    [selectionId]
  );

  return new Set(result.rows.map(row => row.supplier_product_id));
}

/**
 * Add products to a selection in batches
 */
async function addProductsToSelection(
  client: Client,
  selectionId: string,
  productIds: string[],
  selectedBy: string = 'batch-stock-upload-plusportal'
): Promise<{ added: number; errors: string[] }> {
  const errors: string[] = [];
  let added = 0;

  const batchSize = 500; // Process in batches of 500

  for (let i = 0; i < productIds.length; i += batchSize) {
    const batch = productIds.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(productIds.length / batchSize);

    console.log(`   Processing batch ${batchNum}/${totalBatches} (${batch.length} products)...`);

    await client.query('BEGIN');

    try {
      for (const productId of batch) {
        try {
          await client.query(
            `INSERT INTO core.inventory_selected_item (
              selection_item_id,
              selection_id,
              supplier_product_id,
              status,
              selected_at,
              selected_by,
              updated_at
            )
            VALUES ($1, $2, $3, 'selected', NOW(), $4, NOW())`,
            [randomUUID(), selectionId, productId, selectedBy]
          );
          added++;
        } catch (error) {
          // Check if it's a duplicate error (foreign table might have unique constraint)
          if (
            error instanceof Error &&
            (error.message.includes('duplicate') ||
              error.message.includes('unique') ||
              error.message.includes('already exists'))
          ) {
            // Skip duplicates silently
            continue;
          }
          errors.push(
            `Product ${productId}: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }

      await client.query('COMMIT');
      console.log(`   ✅ Batch ${batchNum} completed: ${added} added so far`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`   ❌ Batch ${batchNum} failed:`, error instanceof Error ? error.message : String(error));
      errors.push(`Batch ${batchNum}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return { added, errors };
}

/**
 * Main execution
 */
async function main() {
  const databaseUrl = process.env.DATABASE_URL || process.env.NEON_SPP_DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL or NEON_SPP_DATABASE_URL environment variable not set');
    process.exit(1);
  }

  const client = new Client({ connectionString: databaseUrl });

  try {
    // Connect to database
    console.log('📡 Connecting to database...');
    await client.connect();
    console.log('✅ Connected\n');

    // Step 1: Get all Stage Audio Works products
    console.log('🔍 Step 1: Getting all Stage Audio Works products...');
    const productIds = await getStageAudioWorksProducts(client);
    console.log(`✅ Found ${productIds.length} active products\n`);

    if (productIds.length === 0) {
      console.log('⚠️  No products found for Stage Audio Works');
      process.exit(0);
    }

    // Step 2: Process each active selection
    console.log(`📦 Step 2: Adding products to ${ACTIVE_SELECTIONS.length} active selection(s)...\n`);

    const results: Array<{
      selectionName: string;
      selectionId: string;
      added: number;
      errors: string[];
    }> = [];

    for (const selection of ACTIVE_SELECTIONS) {
      console.log(`\n📋 Processing: ${selection.selection_name} (${selection.selection_id})`);

      // Check existing products
      const existingProducts = await getProductsInSelection(client, selection.selection_id);
      const productsToAdd = productIds.filter(id => !existingProducts.has(id));

      console.log(`   Existing products: ${existingProducts.size}`);
      console.log(`   Products to add: ${productsToAdd.length}`);

      if (productsToAdd.length === 0) {
        console.log(`   ⏭️  All products already in selection, skipping...`);
        results.push({
          selectionName: selection.selection_name,
          selectionId: selection.selection_id,
          added: 0,
          errors: [],
        });
        continue;
      }

      // Add products
      const result = await addProductsToSelection(
        client,
        selection.selection_id,
        productsToAdd
      );

      results.push({
        selectionName: selection.selection_name,
        selectionId: selection.selection_id,
        added: result.added,
        errors: result.errors,
      });

      console.log(`   ✅ Added ${result.added} products`);
      if (result.errors.length > 0) {
        console.log(`   ⚠️  ${result.errors.length} errors`);
      }
    }

    // Step 3: Verify results
    console.log('\n' + '='.repeat(60));
    console.log('📊 VERIFICATION SUMMARY');
    console.log('='.repeat(60));

    for (const selection of ACTIVE_SELECTIONS) {
      const result = await client.query<{ count: string }>(
        `SELECT COUNT(DISTINCT isi.supplier_product_id) as count
         FROM core.inventory_selected_item isi
         JOIN core.inventory_selection sel ON sel.selection_id = isi.selection_id
         JOIN core.supplier_product sp ON sp.supplier_product_id = isi.supplier_product_id
         WHERE sp.supplier_id = $1
         AND sel.selection_id = $2
         AND sel.status = 'active'
         AND isi.status = 'selected'`,
        [STAGE_AUDIO_WORKS_SUPPLIER_ID, selection.selection_id]
      );

      const count = parseInt(result.rows[0]?.count || '0', 10);
      console.log(`\n  📋 ${selection.selection_name}:`);
      console.log(`     Products in selection: ${count}`);
    }

    // Overall summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 OVERALL SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total products processed: ${productIds.length}`);
    console.log(`Selections updated: ${results.length}`);

    let totalAdded = 0;
    let totalErrors = 0;

    for (const result of results) {
      totalAdded += result.added;
      totalErrors += result.errors.length;
      console.log(`\n  ${result.selectionName}:`);
      console.log(`    ✅ Added: ${result.added}`);
      if (result.errors.length > 0) {
        console.log(`    ❌ Errors: ${result.errors.length}`);
        result.errors.slice(0, 5).forEach(error => {
          console.log(`       - ${error}`);
        });
        if (result.errors.length > 5) {
          console.log(`       ... and ${result.errors.length - 5} more errors`);
        }
      }
    }

    console.log(`\n✨ Total added: ${totalAdded}`);
    console.log(`⚠️  Total errors: ${totalErrors}`);

    if (totalErrors === 0) {
      console.log('\n✅ All products successfully added to active selections!');
    } else {
      console.log(`\n⚠️  Completed with ${totalErrors} errors`);
    }
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

if (import.meta.main) {
  main();
}
