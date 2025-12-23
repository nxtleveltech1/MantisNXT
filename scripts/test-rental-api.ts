#!/usr/bin/env bun
import { query } from '../src/lib/database';

async function testAPI() {
  const rentalSupplierId = 'da444dbc-e33f-4486-a091-8d2cb9cf15ed';

  // Simulate what the API query does
  const result = await query(
    `SELECT i.*, s.name as supplier_name
     FROM public.inventory_items i
     LEFT JOIN public.suppliers s ON i.supplier_id::text = s.id
     WHERE i.supplier_id::text = $1
     LIMIT 5`,
    [rentalSupplierId]
  );
  console.log('✅ API query result:', result.rows.length);
  if (result.rows.length > 0) {
    console.log('First item keys:', Object.keys(result.rows[0]));
    console.log('First item:', {
      sku: result.rows[0].sku,
      name: result.rows[0].name,
      supplier_id: result.rows[0].supplier_id,
      supplier_name: result.rows[0].supplier_name,
      stock_qty: result.rows[0].stock_qty,
    });
  }

  // Check if there's a filter on stock_qty
  const withStockFilter = await query(
    `SELECT COUNT(*) as count FROM public.inventory_items i
     WHERE i.supplier_id::text = $1 AND i.stock_qty > 0`,
    [rentalSupplierId]
  );
  console.log('\n📊 Items with stock > 0:', withStockFilter.rows[0].count);

  const allItems = await query(
    `SELECT COUNT(*) as count FROM public.inventory_items i
     WHERE i.supplier_id::text = $1`,
    [rentalSupplierId]
  );
  console.log('📊 All rental items:', allItems.rows[0].count);

  // Test the actual API endpoint query structure
  const apiQuery = await query(
    `SELECT
        i.*,
        s.name as supplier_name,
        s.email as supplier_email,
        s.phone as supplier_phone,
        (i.stock_qty - COALESCE(i.reserved_qty, 0)) as available_qty,
        CASE
          WHEN i.stock_qty = 0 THEN 'out'
          WHEN i.stock_qty <= COALESCE(i.reorder_point, 0) THEN 'low'
          ELSE 'normal'
        END as stock_status
      FROM public.inventory_items i
      LEFT JOIN public.suppliers s ON i.supplier_id::text = s.id
      WHERE i.supplier_id::text = $1
      LIMIT 3`,
    [rentalSupplierId]
  );
  console.log('\n✅ Full API query result:', apiQuery.rows.length);
  if (apiQuery.rows.length > 0) {
    console.log('Sample with all fields:', apiQuery.rows[0]);
  }
}

testAPI().catch(console.error);

