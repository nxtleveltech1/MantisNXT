#!/usr/bin/env bun
/**
 * Revert Celto Pricing - Add 10% Back to Cost Ex VAT
 *
 * Reverses the 10% discount that was applied to Celto products,
 * restoring original prices. The discount will be calculated dynamically
 * by the platform using discount rules instead.
 *
 * Usage:
 *   bun scripts/database/revert-celto-pricing-add-discount-back.ts
 */

import { Client } from 'pg';

// Get connection string from environment
function getConnectionString(): string | null {
  return (
    process.env.DATABASE_URL ||
    process.env.NEON_SPP_DATABASE_URL ||
    process.env.POSTGRES_URL ||
    null
  );
}

const SUPPLIER_NAME = 'BC ELECTRONICS';
const BRAND_NAME = 'CELTO';
const DISCOUNT_PERCENT = 10;

/**
 * Find supplier ID by name
 */
async function findSupplier(client: Client, supplierName: string): Promise<string | null> {
  const result = await client.query(
    `SELECT supplier_id, name, code 
     FROM core.supplier 
     WHERE LOWER(name) LIKE $1 OR LOWER(name) LIKE $2 OR LOWER(name) LIKE $3
     LIMIT 5`,
    [
      `%${supplierName.toLowerCase()}%`,
      `%bce brands%`,
      `%bc electronics%`,
    ]
  );

  if (result.rows.length === 0) {
    console.error(`❌ Supplier "${supplierName}" not found`);
    return null;
  }

  const supplier = result.rows[0];
  console.log(
    `✅ Found supplier: ${supplier.name} (${supplier.code}) - ID: ${supplier.supplier_id}`
  );
  return supplier.supplier_id;
}

/**
 * Revert pricing for Celto products
 */
async function revertPricing(client: Client, supplierId: string): Promise<void> {
  console.log('\n📦 Reverting pricing for Celto products...\n');

  // Find all Celto products - check SKU pattern and discount_applied_at field
  const productsResult = await client.query(
    `SELECT 
       sp.supplier_product_id,
       sp.supplier_sku,
       sp.name_from_supplier,
       sp.attrs_json
     FROM core.supplier_product sp
     WHERE sp.supplier_id = $1
       AND sp.is_active = true
       AND (
         -- SKU contains CELTO
         UPPER(sp.supplier_sku) LIKE '%CELTO%'
         -- OR has discount_applied_at field (indicating discount was applied)
         OR sp.attrs_json->>'discount_applied_at' IS NOT NULL
         -- OR brand is Celto
         OR UPPER(sp.attrs_json->>'brand') = 'CELTO'
       )
     ORDER BY sp.supplier_sku`,
    [supplierId]
  );

  const products = productsResult.rows;
  console.log(`Found ${products.length} Celto products to process\n`);

  let updated = 0;
  let skipped = 0;

  for (const product of products) {
    const attrs = product.attrs_json || {};
    const currentCostExVat = attrs.cost_excluding;
    const originalCostExVat = attrs.original_cost_excluding;

    if (!currentCostExVat || typeof currentCostExVat !== 'number') {
      console.log(`⚠️  ${product.supplier_sku}: No cost_ex_vat found, skipping`);
      skipped++;
      continue;
    }

    // Calculate original price (add 10% back)
    // If we have original_cost_excluding, use it; otherwise calculate it
    let restoredCostExVat: number;
    if (originalCostExVat && typeof originalCostExVat === 'number' && originalCostExVat > 0) {
      restoredCostExVat = originalCostExVat;
    } else {
      // Reverse the discount: current_price / (1 - discount/100)
      restoredCostExVat = currentCostExVat / (1 - DISCOUNT_PERCENT / 100);
    }

    const restoredCostIncVat = restoredCostExVat * 1.15; // Add 15% VAT

    // Update attrs_json - remove discount fields, restore original cost
    const updatedAttrs = {
      ...attrs,
      cost_excluding: restoredCostExVat,
      cost_including: restoredCostIncVat,
      // Remove discount-related fields
      discount_percent: undefined,
      original_cost_excluding: undefined,
      discount_applied_at: undefined,
    };

    // Remove undefined fields
    Object.keys(updatedAttrs).forEach(key => {
      if (updatedAttrs[key] === undefined) {
        delete updatedAttrs[key];
      }
    });

    // Update supplier_product
    await client.query(
      `UPDATE core.supplier_product
       SET attrs_json = $1::jsonb,
           updated_at = NOW()
       WHERE supplier_product_id = $2`,
      [JSON.stringify(updatedAttrs), product.supplier_product_id]
    );

    // Update price_history
    await client.query(
      `UPDATE core.price_history
       SET is_current = false, valid_to = NOW()
       WHERE supplier_product_id = $1 AND is_current = true`,
      [product.supplier_product_id]
    );

    await client.query(
      `INSERT INTO core.price_history (
         supplier_product_id,
         price,
         currency,
         valid_from,
         is_current,
         change_reason
       )
       VALUES ($1, $2, 'ZAR', NOW(), true, $3)`,
      [
        product.supplier_product_id,
        restoredCostExVat,
        'Reverted discount - discount now calculated via discount rules',
      ]
    );

    console.log(
      `✅ ${product.supplier_sku}: R ${currentCostExVat.toFixed(2)} → R ${restoredCostExVat.toFixed(2)} (restored)`
    );
    updated++;
  }

  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Updated: ${updated}`);
  console.log(`   ⚠️  Skipped: ${skipped}`);
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Reverting Celto Pricing - Adding 10% Back\n');

  const connectionString = getConnectionString();
  if (!connectionString) {
    console.error('❌ Database connection string not found');
    console.error('   Please set DATABASE_URL or NEON_SPP_DATABASE_URL');
    process.exit(1);
  }

  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Find supplier
    const supplierId = await findSupplier(client, SUPPLIER_NAME);
    if (!supplierId) {
      throw new Error(`Supplier "${SUPPLIER_NAME}" not found`);
    }

    // Revert pricing
    await revertPricing(client, supplierId);

    console.log('\n✅ Pricing reverted successfully');
    console.log('📋 Discount will now be calculated dynamically by the platform using discount rules');
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run if executed directly
if (import.meta.main) {
  main().catch(console.error);
}
