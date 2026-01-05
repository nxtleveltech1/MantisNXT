#!/usr/bin/env bun
/**
 * Set Stock for Rental Items
 *
 * Sets a default stock quantity for all rental items so they appear in the frontend.
 * Rental items should be visible even when rented out, so we set stock to 1 by default.
 *
 * Usage:
 *   bun scripts/set-rental-stock.ts [stock_qty]
 *
 * Default stock_qty: 1
 */

import { query } from '../src/lib/database';

async function setRentalStock(stockQty: number = 1) {
  const rentalSupplierId = 'da444dbc-e33f-4486-a091-8d2cb9cf15ed';

  console.log(`📦 Setting stock quantity to ${stockQty} for all rental items...`);

  // Get all rental supplier products
  const rentalProducts = await query(
    `SELECT sp.supplier_product_id, sp.supplier_sku, sp.name_from_supplier
     FROM core.supplier_product sp
     WHERE sp.supplier_id = $1::uuid`,
    [rentalSupplierId]
  );

  console.log(`Found ${rentalProducts.rows.length} rental items`);

  let updated = 0;
  let created = 0;

  for (const product of rentalProducts.rows) {
    // Check if stock_on_hand exists
    const existingStock = await query(
      `SELECT soh_id, qty FROM core.stock_on_hand 
       WHERE supplier_product_id = $1 LIMIT 1`,
      [product.supplier_product_id]
    );

    if (existingStock.rows.length > 0) {
      // Update existing stock
      await query(
        `UPDATE core.stock_on_hand 
         SET qty = $1, as_of_ts = NOW() 
         WHERE supplier_product_id = $2`,
        [stockQty, product.supplier_product_id]
      );
      updated++;
    } else {
      // Create new stock record - get a location
      const location = await query(
        `SELECT location_id FROM core.stock_location 
         WHERE type = 'internal' OR supplier_id = $1::uuid 
         ORDER BY created_at ASC LIMIT 1`,
        [rentalSupplierId]
      );

      const locationId = location.rows[0]?.location_id || null;

      await query(
        `INSERT INTO core.stock_on_hand (location_id, supplier_product_id, qty, unit_cost, as_of_ts)
         VALUES ($1, $2, $3, NULL, NOW())`,
        [locationId, product.supplier_product_id, stockQty]
      );
      created++;
    }

    // Log stock movement
    await query(
      `INSERT INTO core.stock_movement (supplier_product_id, movement_type, qty, reference_doc, notes)
       VALUES ($1, 'adjustment', $2, 'setRentalStock', 'Set default stock for rental item')`,
      [product.supplier_product_id, stockQty]
    );
  }

  console.log(`\n✅ Summary:`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Created: ${created}`);
  console.log(`   Total: ${rentalProducts.rows.length}`);

  // Verify
  const verify = await query(
    `SELECT COUNT(*) as count FROM core.stock_on_hand soh
     JOIN core.supplier_product sp ON sp.supplier_product_id = soh.supplier_product_id
     WHERE sp.supplier_id = $1::uuid AND soh.qty = $2`,
    [rentalSupplierId, stockQty]
  );
  console.log(`\n📊 Verified: ${verify.rows[0].count} rental items now have stock_qty = ${stockQty}`);
}

const stockQty = process.argv[2] ? parseInt(process.argv[2], 10) : 1;
setRentalStock(stockQty).catch(console.error);

