#!/usr/bin/env tsx

/**
 * Create Default Selection Script
 *
 * This script automatically creates an inventory selection with ALL imported products
 * and activates it, ensuring there's always an active selection for the system.
 *
 * Usage: npx tsx scripts/create_default_selection.ts
 */

import { neonDb } from "../lib/database/neon-connection";
import { inventorySelectionService } from "../src/lib/services/InventorySelectionService";
import type { InventorySelection } from "../src/types/nxt-spp";

// Configuration
const SELECTION_NAME = `Master Import - ${
  new Date().toISOString().split("T")[0]
}`;
const SELECTION_DESCRIPTION =
  "Auto-generated selection from master consolidated dataset";
const SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000000";

interface SelectionStats {
  selectionId: string;
  selectionName: string;
  totalProducts: number;
  activationStatus: string;
  duration: number;
}

/**
 * Main function to create and activate selection
 */
async function createAndActivateSelection(): Promise<SelectionStats> {
  const startTime = Date.now();
  const stats: SelectionStats = {
    selectionId: "",
    selectionName: SELECTION_NAME,
    totalProducts: 0,
    activationStatus: "",
    duration: 0,
  };

  try {
    console.log("🚀 Starting default selection creation...");

    // Step 1: Query all active supplier products
    console.log("📊 Querying active supplier products...");
    const activeProducts = await neonDb`
      SELECT supplier_product_id, supplier_id, supplier_sku, name_from_supplier
      FROM core.supplier_product 
      WHERE is_active = true
      ORDER BY supplier_id, supplier_sku
    `;

    if (activeProducts.length === 0) {
      throw new Error(
        "No active supplier products found. Please run the import script first."
      );
    }

    console.log(`✓ Found ${activeProducts.length} active supplier products`);

    // Step 2: Create new selection
    console.log("📝 Creating inventory selection...");
    const selectionData = {
      selection_name: SELECTION_NAME,
      description: SELECTION_DESCRIPTION,
      created_by: SYSTEM_USER_ID,
      status: "draft" as const,
    };

    const selection = await inventorySelectionService.createSelection(
      selectionData
    );
    stats.selectionId = selection.selection_id;
    console.log(`✓ Created selection: ${selection.selection_id}`);

    // Step 3: Add all products to selection in batches
    console.log("📦 Adding products to selection...");
    const batchSize = 100;
    let processedCount = 0;

    for (let i = 0; i < activeProducts.length; i += batchSize) {
      const batch = activeProducts.slice(i, i + batchSize);
      const supplierProductIds = batch.map((p) => p.supplier_product_id);

      await inventorySelectionService.addProducts(
        selection.selection_id,
        supplierProductIds,
        SYSTEM_USER_ID
      );

      processedCount += batch.length;
      const progress = Math.round(
        (processedCount / activeProducts.length) * 100
      );
      console.log(
        `📊 Progress: ${progress}% (${processedCount}/${activeProducts.length} products)`
      );
    }

    stats.totalProducts = activeProducts.length;
    console.log(`✓ Added ${activeProducts.length} products to selection`);

    // Step 4: Activate selection (deactivate others)
    console.log("🔄 Activating selection...");
    try {
      const activatedSelection =
        await inventorySelectionService.activateSelection(
          selection.selection_id,
          true // deactivate_others = true
        );

      stats.activationStatus = "success";
      console.log(
        `✓ Selection activated successfully: ${activatedSelection.selection_name}`
      );
    } catch (error) {
      console.warn(
        "⚠️  Activation failed, attempting to deactivate others and retry..."
      );

      // Try to deactivate all other selections first
      await neonDb`
        UPDATE core.inventory_selection 
        SET status = 'archived', updated_at = NOW()
        WHERE status = 'active' AND selection_id != ${selection.selection_id}
      `;

      // Retry activation
      const activatedSelection =
        await inventorySelectionService.activateSelection(
          selection.selection_id,
          false // deactivate_others = false (already done manually)
        );

      stats.activationStatus = "success_retry";
      console.log(
        `✓ Selection activated on retry: ${activatedSelection.selection_name}`
      );
    }

    // Step 5: Verify activation
    console.log("🔍 Verifying activation...");
    const activeSelections = await neonDb`
      SELECT selection_id, selection_name, status, created_at
      FROM core.inventory_selection 
      WHERE status = 'active'
    `;

    if (activeSelections.length === 0) {
      throw new Error("No active selection found after activation");
    } else if (activeSelections.length > 1) {
      console.warn(
        `⚠️  Warning: ${activeSelections.length} active selections found (expected 1)`
      );
    } else {
      console.log(`✓ Verified: Exactly 1 active selection found`);
    }

    // Step 6: Verify selection has items
    const selectionItems = await neonDb`
      SELECT COUNT(*) as item_count
      FROM core.inventory_selected_item 
      WHERE selection_id = ${selection.selection_id} AND status = 'selected'
    `;

    const itemCount = parseInt(selectionItems[0].item_count);
    console.log(`✓ Verified: Selection contains ${itemCount} selected items`);

    if (itemCount === 0) {
      throw new Error("Selection has no selected items");
    }

    stats.duration = Date.now() - startTime;

    // Summary report
    console.log("\n🎉 Selection creation completed successfully!");
    console.log("==============================================");
    console.log(`📝 Selection ID: ${stats.selectionId}`);
    console.log(`📋 Selection Name: ${stats.selectionName}`);
    console.log(`📦 Total Products: ${stats.totalProducts}`);
    console.log(`✅ Activation Status: ${stats.activationStatus}`);
    console.log(`⏱️  Duration: ${Math.round(stats.duration / 1000)}s`);

    return stats;
  } catch (error) {
    console.error("❌ Selection creation failed:", error);
    throw error;
  }
}

/**
 * Verify system state after selection creation
 */
async function verifySystemState(): Promise<void> {
  try {
    console.log("\n🔍 Verifying system state...");

    // Check active selection
    const activeSelection = await neonDb`
      SELECT selection_id, selection_name, created_at
      FROM core.inventory_selection 
      WHERE status = 'active'
    `;

    if (activeSelection.length === 0) {
      console.warn("⚠️  No active selection found");
      return;
    }

    console.log(`✓ Active selection: ${activeSelection[0].selection_name}`);

    // Check selected items count
    const selectedItems = await neonDb`
      SELECT COUNT(*) as count
      FROM core.inventory_selected_item 
      WHERE selection_id = ${activeSelection[0].selection_id} AND status = 'selected'
    `;

    console.log(`✓ Selected items: ${selectedItems[0].count}`);

    // Check supplier distribution
    const supplierDistribution = await neonDb`
      SELECT s.name as supplier_name, COUNT(*) as product_count
      FROM core.inventory_selected_item isi
      JOIN core.supplier_product sp ON sp.supplier_product_id = isi.supplier_product_id
      JOIN core.supplier s ON s.supplier_id = sp.supplier_id
      WHERE isi.selection_id = ${activeSelection[0].selection_id} AND isi.status = 'selected'
      GROUP BY s.supplier_id, s.name
      ORDER BY product_count DESC
      LIMIT 10
    `;

    console.log("📊 Top suppliers by product count:");
    supplierDistribution.forEach((row, index) => {
      console.log(
        `  ${index + 1}. ${row.supplier_name}: ${row.product_count} products`
      );
    });
  } catch (error) {
    console.error("❌ System state verification failed:", error);
  }
}

// Command-line execution
if (require.main === module) {
  createAndActivateSelection()
    .then(async (stats) => {
      await verifySystemState();
      console.log("\n✅ Default selection creation completed successfully!");
      console.log(
        `\n🎯 Next step: Run 'npx tsx scripts/seed_stock_on_hand.ts' to seed initial stock data`
      );
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Default selection creation failed:", error);
      process.exit(1);
    });
}

export { createAndActivateSelection };
