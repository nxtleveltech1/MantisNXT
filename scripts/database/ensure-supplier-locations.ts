#!/usr/bin/env bun
/**
 * Ensure every supplier that has inventory (stock_on_hand) has a supplier location,
 * and optionally move their SOH to that location.
 *
 * Idempotent: only creates locations when missing; only moves SOH when not already at a supplier location.
 *
 * Usage: bun run scripts/database/ensure-supplier-locations.ts
 *   --dry-run   Log what would be done without writing
 */

import { query, withTransaction } from '../../src/lib/database/unified-connection';

const DRY_RUN = process.argv.includes('--dry-run');

interface SupplierWithInventory {
  supplier_id: string;
  supplier_name: string;
  soh_count: number;
}

async function findSuppliersWithInventoryButNoLocation(): Promise<SupplierWithInventory[]> {
  const result = await query<SupplierWithInventory>(
    `
    SELECT
      sp.supplier_id,
      COALESCE(s.name, 'Supplier') AS supplier_name,
      COUNT(DISTINCT soh.soh_id)::int AS soh_count
    FROM core.stock_on_hand soh
    JOIN core.supplier_product sp ON sp.supplier_product_id = soh.supplier_product_id
    LEFT JOIN core.supplier s ON s.supplier_id = sp.supplier_id
    WHERE NOT EXISTS (
      SELECT 1 FROM core.stock_location sl
      WHERE sl.supplier_id = sp.supplier_id AND sl.type = 'supplier' AND sl.is_active = true
    )
    GROUP BY sp.supplier_id, s.name
    ORDER BY soh_count DESC
    `
  );
  return result.rows;
}

async function ensureSupplierLocations(): Promise<void> {
  console.log('='.repeat(60));
  console.log('ENSURE SUPPLIER LOCATIONS (suppliers with inventory)');
  if (DRY_RUN) console.log('  [DRY RUN - no changes will be made]');
  console.log('='.repeat(60));

  const suppliers = await findSuppliersWithInventoryButNoLocation();
  console.log(`\nSuppliers with inventory but no supplier location: ${suppliers.length}\n`);

  if (suppliers.length === 0) {
    console.log('Nothing to do.');
    return;
  }

  let locationsCreated = 0;
  let sohUpdated = 0;

  for (const row of suppliers) {
    const { supplier_id, supplier_name, soh_count } = row;
    const baseName = `${supplier_name} - Main Warehouse`;

    if (DRY_RUN) {
      console.log(`Would create location for supplier ${supplier_id} (${supplier_name}), SOH rows: ${soh_count}`);
      locationsCreated++;
      sohUpdated += soh_count;
      continue;
    }

    await withTransaction(async client => {
      let locationId: string;
      let candidateName = baseName;
      let attempts = 0;

      const existing = await client.query(
        `SELECT location_id FROM core.stock_location
         WHERE supplier_id = $1 AND type = 'supplier' AND is_active = true LIMIT 1`,
        [supplier_id]
      );
      if (existing.rows.length > 0) {
        locationId = existing.rows[0].location_id;
      } else {
        while (attempts < 5) {
          const nameCheck = await client.query(
            `SELECT 1 FROM core.stock_location WHERE name = $1 LIMIT 1`,
            [candidateName]
          );
          if (nameCheck.rows.length === 0) break;
          attempts++;
          candidateName = `${baseName} (${attempts})`;
        }
        const insert = await client.query(
          `INSERT INTO core.stock_location (name, type, supplier_id, is_active, created_at, updated_at)
           VALUES ($1, 'supplier', $2, true, NOW(), NOW())
           RETURNING location_id`,
          [candidateName, supplier_id]
        );
        locationId = insert.rows[0].location_id;
        locationsCreated++;
      }

      const update = await client.query(
        `UPDATE core.stock_on_hand soh
         SET location_id = $1
         FROM core.supplier_product sp
         WHERE soh.supplier_product_id = sp.supplier_product_id
           AND sp.supplier_id = $2
           AND (soh.location_id IS NULL OR soh.location_id NOT IN (
             SELECT location_id FROM core.stock_location
             WHERE supplier_id = $2 AND type = 'supplier'
           ))`,
        [locationId, supplier_id]
      );
      sohUpdated += update.rowCount ?? 0;
    });

    console.log(`  ${supplier_name}: location ensured, SOH rows assigned`);
  }

  console.log(`\nDone. Locations created/ensured: ${locationsCreated}, SOH rows assigned: ${sohUpdated}`);
}

ensureSupplierLocations().catch(err => {
  console.error(err);
  process.exit(1);
});
