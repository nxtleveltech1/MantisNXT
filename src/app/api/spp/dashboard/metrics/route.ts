import { NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET() {
  try {
    const [suppliers, supplierProducts, activeSelection, stockAgg] = await Promise.all([
      query<{ cnt: string }>('SELECT COUNT(*) AS cnt FROM core.supplier'),
      query<{ cnt: string }>('SELECT COUNT(*) AS cnt FROM core.supplier_product'),
      query<{ selection_id: string; selection_name: string; item_count: string }>(`
          SELECT sel.selection_id, sel.selection_name, COALESCE(items.cnt, 0) AS item_count
          FROM core.inventory_selection sel
          LEFT JOIN LATERAL (
            SELECT COUNT(*) AS cnt
            FROM core.inventory_selected_item isi
            WHERE isi.selection_id = sel.selection_id AND isi.status = 'selected'
          ) items ON true
          WHERE sel.status = 'active'
          LIMIT 1
        `),
      query<{ records: string; total_value: string }>(
        'SELECT COUNT(*) AS records, COALESCE(SUM(total_value), 0) AS total_value FROM core.stock_on_hand'
      ),
    ]);

    const totalSuppliers = parseInt(suppliers.rows[0]?.cnt || '0', 10);
    const totalProducts = parseInt(supplierProducts.rows[0]?.cnt || '0', 10);
    const selectedProducts = activeSelection.rows.length
      ? parseInt(activeSelection.rows[0].item_count || '0', 10)
      : 0;
    const stockRecords = parseInt(stockAgg.rows[0]?.records || '0', 10);
    const totalValue = parseFloat(stockAgg.rows[0]?.total_value || '0');

    return NextResponse.json({
      success: true,
      data: {
        // Main metrics
        total_suppliers: totalSuppliers,
        total_products: totalProducts,
        selected_products: selectedProducts,
        new_products_count: 0, // Would need to track this with a timestamp query
        total_stock_value: totalValue,
        selected_inventory_value: totalValue, // Using total stock value as selected value for now
        recent_price_changes_count: 0, // Would need price history tracking

        // Legacy fields for compatibility
        suppliers: totalSuppliers,
        supplier_products: totalProducts,

        // Current selection details
        current_selection: activeSelection.rows.length
          ? {
              id: activeSelection.rows[0].selection_id,
              name: activeSelection.rows[0].selection_name,
              items: selectedProducts,
            }
          : null,

        // Stock aggregates
        stock: {
          records: stockRecords,
          total_value: totalValue,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[API] /api/spp/dashboard/metrics error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch dashboard metrics',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
