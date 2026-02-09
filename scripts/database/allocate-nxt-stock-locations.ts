#!/usr/bin/env bun
/**
 * Ensure locations "NXT/NXT STOCK" and "NXT/NXT STOCK RENTALS" exist and allocate products:
 * - Rental supplier (Rental) products → NXT/NXT STOCK RENTALS
 * - Other products currently at Main Warehouse → NXT/NXT STOCK
 *
 * Usage: bun run scripts/database/allocate-nxt-stock-locations.ts
 *   --dry-run   Log what would be done without writing
 */

import { query, withTransaction } from '../../src/lib/database/unified-connection';

const DRY_RUN = process.argv.includes('--dry-run');

const RENTAL_SUPPLIER_ID = 'da444dbc-e33f-4486-a091-8d2cb9cf15ed';
const LOCATION_NXT_STOCK = 'NXT/NXT STOCK';
const LOCATION_NXT_RENTALS = 'NXT/NXT STOCK RENTALS';

async function getOrCreateLocation(name: string): Promise<string> {
  const existing = await query<{ location_id: string }>(
    `SELECT location_id FROM core.stock_location WHERE name = $1 AND is_active = true LIMIT 1`,
    [name]
  );
  if (existing.rows.length > 0) return existing.rows[0].location_id;

  const inserted = await query<{ location_id: string }>(
    `INSERT INTO core.stock_location (location_id, name, type, supplier_id, is_active, created_at, updated_at)
     VALUES (gen_random_uuid(), $1, 'internal', NULL, true, NOW(), NOW())
     RETURNING location_id`,
    [name]
  );
  return inserted.rows[0].location_id;
}

async function main() {
  console.log('='.repeat(60));
  console.log('NXT STOCK LOCATIONS – create and allocate');
  if (DRY_RUN) console.log('  [DRY RUN - no changes will be made]\n');
  else console.log('');

  const rentalSupplierCheck = await query<{ name: string }>(
    `SELECT name FROM core.supplier WHERE supplier_id = $1`,
    [RENTAL_SUPPLIER_ID]
  );
  if (rentalSupplierCheck.rows.length === 0) {
    console.log('Rental supplier not found. Exiting.');
    process.exit(1);
  }
  console.log(`Rental supplier: ${rentalSupplierCheck.rows[0].name} (${RENTAL_SUPPLIER_ID})\n`);

  if (DRY_RUN) {
    const locNxt = await query<{ location_id: string }>(
      `SELECT location_id FROM core.stock_location WHERE name = $1 LIMIT 1`,
      [LOCATION_NXT_STOCK]
    );
    const locRentals = await query<{ location_id: string }>(
      `SELECT location_id FROM core.stock_location WHERE name = $1 LIMIT 1`,
      [LOCATION_NXT_RENTALS]
    );
    const rentalAtMain = await query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM core.stock_on_hand soh
       JOIN core.supplier_product sp ON sp.supplier_product_id = soh.supplier_product_id
       JOIN core.stock_location sl ON sl.location_id = soh.location_id
       WHERE sp.supplier_id = $1 AND sl.name = 'Main Warehouse'`,
      [RENTAL_SUPPLIER_ID]
    );
    const otherAtMain = await query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM core.stock_on_hand soh
       JOIN core.supplier_product sp ON sp.supplier_product_id = soh.supplier_product_id
       JOIN core.stock_location sl ON sl.location_id = soh.location_id
       WHERE sl.name = 'Main Warehouse' AND sp.supplier_id != $1`,
      [RENTAL_SUPPLIER_ID]
    );
    console.log(`Location "${LOCATION_NXT_STOCK}": ${locNxt.rows.length ? 'exists' : 'would create'}`);
    console.log(`Location "${LOCATION_NXT_RENTALS}": ${locRentals.rows.length ? 'exists' : 'would create'}`);
    console.log(`Rental items at Main Warehouse to move to RENTALS: ${rentalAtMain.rows[0].count}`);
    console.log(`Other items at Main Warehouse to move to NXT STOCK: ${otherAtMain.rows[0].count}`);
    return;
  }

  const locNxtId = await getOrCreateLocation(LOCATION_NXT_STOCK);
  const locRentalsId = await getOrCreateLocation(LOCATION_NXT_RENTALS);
  console.log(`Location "${LOCATION_NXT_STOCK}": ${locNxtId}`);
  console.log(`Location "${LOCATION_NXT_RENTALS}": ${locRentalsId}\n`);

  await withTransaction(async client => {
    const mainWarehouse = await client.query(
      `SELECT location_id FROM core.stock_location WHERE name = 'Main Warehouse' AND is_active = true LIMIT 1`
    );
    const mainId = mainWarehouse.rows[0]?.location_id;
    if (!mainId) {
      console.log('Main Warehouse location not found. Skipping allocation from Main.');
    } else {
      const r1 = await client.query(
        `UPDATE core.stock_on_hand soh
         SET location_id = $1
         FROM core.supplier_product sp
         WHERE soh.supplier_product_id = sp.supplier_product_id
           AND sp.supplier_id = $2
           AND soh.location_id = $3`,
        [locRentalsId, RENTAL_SUPPLIER_ID, mainId]
      );
      console.log(`Moved ${r1.rowCount ?? 0} rental items to NXT/NXT STOCK RENTALS`);

      const r2 = await client.query(
        `UPDATE core.stock_on_hand
         SET location_id = $1
         WHERE location_id = $2
           AND supplier_product_id IN (
             SELECT supplier_product_id FROM core.supplier_product WHERE supplier_id != $3
           )`,
        [locNxtId, mainId, RENTAL_SUPPLIER_ID]
      );
      console.log(`Moved ${r2.rowCount ?? 0} other items to NXT/NXT STOCK`);
    }

    const rentalElsewhere = await client.query(
      `UPDATE core.stock_on_hand soh
       SET location_id = $1
       FROM core.supplier_product sp
       WHERE soh.supplier_product_id = sp.supplier_product_id
         AND sp.supplier_id = $2
         AND soh.location_id != $1`,
      [locRentalsId, RENTAL_SUPPLIER_ID]
    );
    console.log(`Rental items elsewhere moved to RENTALS: ${rentalElsewhere.rowCount ?? 0}`);
  });

  console.log('\nDone.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
