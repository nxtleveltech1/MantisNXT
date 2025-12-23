#!/usr/bin/env bun
import { query } from '../src/lib/database';

async function checkRentalItems() {
  const rentalSupplierId = 'da444dbc-e33f-4486-a091-8d2cb9cf15ed';

  // Check if rental items exist in inventory_items view
  const rentalItems = await query(
    `SELECT i.sku, i.name, i.supplier_id, s.name as supplier_name, i.stock_qty 
     FROM public.inventory_items i
     LEFT JOIN public.suppliers s ON i.supplier_id::text = s.id
     WHERE i.supplier_id::text = $1
     LIMIT 10`,
    [rentalSupplierId]
  );
  console.log('✅ Rental items in inventory_items view:', rentalItems.rows.length);
  if (rentalItems.rows.length > 0) {
    console.log('Sample:', rentalItems.rows[0]);
  }

  // Check if Rental supplier exists in suppliers view
  const rentalSupplier = await query(
    `SELECT * FROM public.suppliers WHERE LOWER(name) LIKE '%rental%'`
  );
  console.log('\n✅ Rental supplier in suppliers view:', rentalSupplier.rows.length);
  if (rentalSupplier.rows.length > 0) {
    console.log('Supplier:', rentalSupplier.rows[0]);
  }

  // Check core tables directly
  const coreRental = await query(
    `SELECT sp.supplier_sku, sp.name_from_supplier, s.name as supplier_name
     FROM core.supplier_product sp
     JOIN core.supplier s ON s.supplier_id = sp.supplier_id
     WHERE s.supplier_id = $1::uuid
     LIMIT 5`,
    [rentalSupplierId]
  );
  console.log('\n✅ Rental items in core tables:', coreRental.rows.length);
  if (coreRental.rows.length > 0) {
    console.log('Sample:', coreRental.rows[0]);
  }

  // Check total count
  const totalCount = await query(
    `SELECT COUNT(*) as count FROM core.supplier_product sp
     WHERE sp.supplier_id = $1::uuid`,
    [rentalSupplierId]
  );
  console.log('\n📊 Total rental items in core.supplier_product:', totalCount.rows[0].count);
}

checkRentalItems().catch(console.error);

