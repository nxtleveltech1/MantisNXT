#!/usr/bin/env bun
/**
 * Fix malformed attrs_json data from bad CSV parsing
 * 
 * Issues found:
 * 1. Keys with trailing quotes: 'Price Before Discount Ex Vat"' -> 'price_before_discount_ex_vat'
 * 2. Values with R prefix and trailing quotes: 'R 34.00"' -> 34.00
 * 3. Stock values with similar issues
 */

import { query } from '../../src/lib/database/unified-connection';

async function fixMalformedAttrsJson() {
  console.log('='.repeat(70));
  console.log('FIX MALFORMED ATTRS_JSON DATA');
  console.log('='.repeat(70));

  // Find all products with malformed attrs_json
  const findQuery = `
    SELECT 
      supplier_product_id,
      supplier_sku,
      attrs_json
    FROM core.supplier_product
    WHERE attrs_json ? 'Price Before Discount Ex Vat"'
       OR attrs_json ? 'Total SOH'
       OR attrs_json ? 'Product No.'
       OR attrs_json ? 'Product Description'
       OR attrs_json ? 'Manufacturer Product No.'
  `;

  const result = await query<{
    supplier_product_id: string;
    supplier_sku: string;
    attrs_json: Record<string, unknown>;
  }>(findQuery);

  console.log(`\nFound ${result.rows.length} products with malformed attrs_json\n`);

  if (result.rows.length === 0) {
    console.log('No malformed data to fix.');
    return;
  }

  let fixed = 0;
  let errors = 0;

  for (const row of result.rows) {
    try {
      const oldAttrs = row.attrs_json || {};
      const newAttrs: Record<string, unknown> = {};

      // Map old malformed keys to new normalized keys
      for (const [key, value] of Object.entries(oldAttrs)) {
        let newKey = key;
        let newValue = value;

        // Fix key names
        if (key === 'Price Before Discount Ex Vat"' || key === 'Price Before Discount Ex Vat') {
          newKey = 'price_before_discount_ex_vat';
        } else if (key === 'Total SOH') {
          newKey = 'stock_quantity';
        } else if (key === 'Product No.') {
          newKey = 'supplier_sku';
        } else if (key === 'Product Description') {
          newKey = 'product_description';
        } else if (key === 'Manufacturer Product No.') {
          newKey = 'manufacturer_part_number';
        } else {
          // Normalize other keys to snake_case
          newKey = key.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
        }

        // Fix values - remove R prefix and trailing quotes from price values
        if (typeof value === 'string' && (newKey.includes('price') || newKey.includes('cost'))) {
          // Remove R prefix, quotes, commas, and extract number
          const cleaned = (value as string).replace(/^R\s*/i, '').replace(/["',]/g, '').trim();
          const numValue = parseFloat(cleaned);
          if (!isNaN(numValue)) {
            newValue = numValue;
          }
        }

        // Fix stock values
        if (typeof value === 'string' && (newKey.includes('stock') || newKey.includes('soh'))) {
          const cleaned = (value as string).replace(/["',]/g, '').trim();
          const numValue = parseInt(cleaned, 10);
          if (!isNaN(numValue)) {
            newValue = numValue;
          }
        }

        newAttrs[newKey] = newValue;
      }

      // Also ensure we have stock_on_hand duplicated from stock_quantity
      if (newAttrs.stock_quantity !== undefined && newAttrs.stock_on_hand === undefined) {
        newAttrs.stock_on_hand = newAttrs.stock_quantity;
      }
      
      // Ensure cost_excluding is set from price
      if (newAttrs.price_before_discount_ex_vat !== undefined && newAttrs.cost_excluding === undefined) {
        newAttrs.cost_excluding = newAttrs.price_before_discount_ex_vat;
      }

      // Update the record
      await query(
        `UPDATE core.supplier_product 
         SET attrs_json = $1, updated_at = NOW()
         WHERE supplier_product_id = $2`,
        [JSON.stringify(newAttrs), row.supplier_product_id]
      );

      // Also update price_history if we have a valid price
      const price = newAttrs.price_before_discount_ex_vat || newAttrs.cost_excluding;
      if (typeof price === 'number' && !isNaN(price) && price > 0) {
        // Check if there's a current price
        const currentPrice = await query<{ price: number }>(
          `SELECT price FROM core.price_history 
           WHERE supplier_product_id = $1 AND is_current = true
           LIMIT 1`,
          [row.supplier_product_id]
        );

        if (currentPrice.rows.length === 0) {
          // Create new price history entry
          await query(
            `INSERT INTO core.price_history (supplier_product_id, price, currency, valid_from, is_current, change_reason)
             VALUES ($1, $2, 'ZAR', NOW(), true, 'Data fix from malformed CSV import')`,
            [row.supplier_product_id, price]
          );
        } else if (isNaN(currentPrice.rows[0].price)) {
          // Update NaN price
          await query(
            `UPDATE core.price_history 
             SET price = $1, valid_from = NOW()
             WHERE supplier_product_id = $2 AND is_current = true`,
            [price, row.supplier_product_id]
          );
        }
      }

      // Update stock_on_hand if we have valid stock
      const stock = newAttrs.stock_quantity;
      if (typeof stock === 'number' && !isNaN(stock)) {
        // Get supplier_id
        const supplierResult = await query<{ supplier_id: string }>(
          `SELECT supplier_id FROM core.supplier_product WHERE supplier_product_id = $1`,
          [row.supplier_product_id]
        );
        
        if (supplierResult.rows.length > 0) {
          const supplierId = supplierResult.rows[0].supplier_id;
          
          // Get or create location
          let locationResult = await query<{ location_id: string }>(
            `SELECT location_id FROM core.stock_location WHERE supplier_id = $1 AND type = 'supplier' LIMIT 1`,
            [supplierId]
          );
          
          let locationId: string;
          if (locationResult.rows.length > 0) {
            locationId = locationResult.rows[0].location_id;
          } else {
            const newLoc = await query<{ location_id: string }>(
              `INSERT INTO core.stock_location (name, type, supplier_id, is_active) 
               VALUES ('Supplier Stock', 'supplier', $1, true) 
               RETURNING location_id`,
              [supplierId]
            );
            locationId = newLoc.rows[0].location_id;
          }
          
          // Upsert stock_on_hand
          await query(
            `INSERT INTO core.stock_on_hand (location_id, supplier_product_id, qty, unit_cost, source, as_of_ts)
             VALUES ($1, $2, $3, $4, 'import', NOW())
             ON CONFLICT (location_id, supplier_product_id) 
             DO UPDATE SET qty = EXCLUDED.qty, unit_cost = COALESCE(EXCLUDED.unit_cost, core.stock_on_hand.unit_cost), as_of_ts = NOW()`,
            [locationId, row.supplier_product_id, stock, typeof price === 'number' ? price : null]
          );
        }
      }

      fixed++;
      if (fixed % 100 === 0) {
        console.log(`Progress: ${fixed}/${result.rows.length} fixed`);
      }
    } catch (error) {
      errors++;
      console.error(`Error fixing ${row.supplier_sku}:`, error);
    }
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log('FIX COMPLETE');
  console.log(`${'='.repeat(70)}`);
  console.log(`Fixed: ${fixed}`);
  console.log(`Errors: ${errors}`);
}

fixMalformedAttrsJson()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('Fatal error:', e);
    process.exit(1);
  });

