/**
 * Restore products from FULLFINAL CSV to core.supplier_product and core.stock_on_hand
 * This script imports all products from the CSV that were previously in Supplier Inventory Portfolio
 */

import { parse } from 'csv-parse/sync';
import { readFileSync } from 'fs';
import { randomUUID } from 'crypto';
import { sppQuery } from '@/lib/database/spp-connection-manager';
import { query, withTransaction } from '@/lib/database/unified-connection';

interface CSVRow {
  'Supplier Name': string;
  'Supplier Code': string;
  'Produt Category': string;
  'BRAND': string;
  'SKU / MODEL': string;
  'PRODUCT DESCRIPTION': string;
  'SUPPLIER SOH': string;
  'COST  EX VAT': string;
}

async function restoreProducts() {
  console.log('📦 Reading CSV file...');
  const csvContent = readFileSync('database/FULLFINAL_processed_v5 (3).csv', 'utf-8');
  
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    delimiter: ';',
    trim: true,
  }) as CSVRow[];

  console.log(`📊 Found ${records.length} rows in CSV`);

  // Get supplier mappings
  const suppliers = await query<{ supplier_id: string; code: string; name: string }>(
    'SELECT supplier_id, code, name FROM core.supplier'
  );
  const supplierMap = new Map<string, string>();
  for (const s of suppliers.rows) {
    supplierMap.set(s.code.toUpperCase(), s.supplier_id);
    supplierMap.set(s.name.toUpperCase(), s.supplier_id);
  }

  // Get default location
  const location = await query<{ location_id: string }>(
    'SELECT location_id FROM core.stock_location LIMIT 1'
  );
  const defaultLocationId = location.rows[0]?.location_id;
  if (!defaultLocationId) {
    throw new Error('No stock location found');
  }

  // Get default org
  const org = await query<{ id: string }>('SELECT id FROM public.organization LIMIT 1');
  const defaultOrgId = org.rows[0]?.id || 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

  let processed = 0;
  let created = 0;
  let updated = 0;
  let skipped = 0;

  // Process in batches
  const batchSize = 100;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    
    await withTransaction(async (client) => {
      for (const row of batch) {
        try {
          const supplierCode = (row['Supplier Code'] || '').trim();
          const supplierName = (row['Supplier Name'] || '').trim();
          
          if (!supplierCode && !supplierName) {
            skipped++;
            continue;
          }

          // Find supplier
          let supplierId = supplierMap.get(supplierCode.toUpperCase()) || 
                          supplierMap.get(supplierName.toUpperCase());
          
          // Create supplier if doesn't exist
          if (!supplierId) {
            const newSupplierCode = supplierCode || supplierName.substring(0, 10).toUpperCase().replace(/\s+/g, '');
            const newSupplier = await client.query<{ supplier_id: string }>(
              `INSERT INTO core.supplier (supplier_id, name, code, active, default_currency, org_id, payment_terms, contact_info, created_at, updated_at)
               VALUES ($1, $2, $3, true, 'ZAR', $4, 'Net 30', '{}'::jsonb, NOW(), NOW())
               ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
               RETURNING supplier_id`,
              [randomUUID(), supplierName, newSupplierCode, defaultOrgId]
            );
            supplierId = newSupplier.rows[0].supplier_id;
            supplierMap.set(newSupplierCode.toUpperCase(), supplierId);
            supplierMap.set(supplierName.toUpperCase(), supplierId);
          }

          const sku = (row['SKU / MODEL'] || '').trim();
          if (!sku) {
            skipped++;
            continue;
          }

          const name = (row['PRODUCT DESCRIPTION'] || sku).trim();
          const stockQty = parseInt(row['SUPPLIER SOH'] || '0', 10) || 0;
          const costPrice = parseFloat((row['COST  EX VAT'] || '0').replace(/[^\d.]/g, '')) || null;
          const category = (row['Produt Category'] || '').trim() || null;
          const brand = (row['BRAND'] || '').trim() || null;

          // Upsert supplier_product
          const productResult = await client.query<{ supplier_product_id: string }>(
            `INSERT INTO core.supplier_product (
              supplier_product_id, supplier_id, supplier_sku, name_from_supplier,
              uom, is_active, first_seen_at, created_at, updated_at, attrs_json
            ) VALUES ($1, $2, $3, $4, 'unit', true, NOW(), NOW(), NOW(), $5::jsonb)
            ON CONFLICT (supplier_id, supplier_sku) DO UPDATE SET
              name_from_supplier = EXCLUDED.name_from_supplier,
              attrs_json = EXCLUDED.attrs_json,
              is_active = true,
              updated_at = NOW()
            RETURNING supplier_product_id`,
            [
              randomUUID(),
              supplierId,
              sku,
              name,
              JSON.stringify({ brand, category_raw: category }),
            ]
          );

          const supplierProductId = productResult.rows[0].supplier_product_id;
          const wasNew = productResult.rows[0].supplier_product_id === productResult.rows[0].supplier_product_id;

          // Upsert stock_on_hand
          if (stockQty > 0 || costPrice) {
            await client.query(
              `INSERT INTO core.stock_on_hand (
                soh_id, supplier_product_id, location_id, qty, unit_cost, as_of_ts, created_at
              ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
              ON CONFLICT (supplier_product_id, location_id) DO UPDATE SET
                qty = EXCLUDED.qty,
                unit_cost = COALESCE(EXCLUDED.unit_cost, core.stock_on_hand.unit_cost),
                as_of_ts = NOW()`,
              [randomUUID(), supplierProductId, defaultLocationId, stockQty, costPrice]
            );
          }

          // Upsert price_history if cost exists
          if (costPrice) {
            await client.query(
              `UPDATE core.price_history SET is_current = false WHERE supplier_product_id = $1 AND is_current = true`,
              [supplierProductId]
            );
            await client.query(
              `INSERT INTO core.price_history (
                supplier_product_id, price, currency, valid_from, is_current, created_at
              ) VALUES ($1, $2, 'ZAR', NOW(), true, NOW())
              ON CONFLICT DO NOTHING`,
              [supplierProductId, costPrice]
            );
          }

          if (wasNew) created++;
          else updated++;
          processed++;

          if (processed % 100 === 0) {
            console.log(`  Processed ${processed}/${records.length} products...`);
          }
        } catch (error) {
          console.error(`Error processing row:`, error);
          skipped++;
        }
      }
    });
  }

  console.log(`\n✅ Restore complete!`);
  console.log(`   Processed: ${processed}`);
  console.log(`   Created: ${created}`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Skipped: ${skipped}`);
}

if (require.main === module) {
  restoreProducts()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Failed to restore products:', error);
      process.exit(1);
    });
}

export { restoreProducts };

