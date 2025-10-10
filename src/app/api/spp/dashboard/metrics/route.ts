import { NextResponse } from "next/server";
import { neonDb } from "@/lib/database/neon-connection";

export async function GET() {
  try {
    const [suppliers, supplierProducts, activeSelection, stockAgg] =
      await Promise.all([
        neonDb`SELECT COUNT(*) AS cnt FROM core.supplier`,
        neonDb`SELECT COUNT(*) AS cnt FROM core.supplier_product`,
        neonDb`
        SELECT sel.selection_id, sel.selection_name, COALESCE(items.cnt, 0) AS item_count
        FROM core.inventory_selection sel
        LEFT JOIN LATERAL (
          SELECT COUNT(*) AS cnt
          FROM core.inventory_selected_item isi
          WHERE isi.selection_id = sel.selection_id AND isi.status = 'selected'
        ) items ON true
        WHERE sel.status = 'active'
        LIMIT 1
      `,
        neonDb`SELECT COUNT(*) AS records, COALESCE(SUM(total_value), 0) AS total_value FROM core.stock_on_hand`,
      ]);

    const totalSuppliers = parseInt(suppliers[0]?.cnt || "0", 10);
    const totalProducts = parseInt(supplierProducts[0]?.cnt || "0", 10);
    const selectedProducts = activeSelection.length
      ? parseInt(activeSelection[0].item_count || "0", 10)
      : 0;
    const stockRecords = parseInt(stockAgg[0]?.records || "0", 10);
    const totalValue = parseFloat(stockAgg[0]?.total_value || "0");

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
        current_selection: activeSelection.length
          ? {
              id: activeSelection[0].selection_id,
              name: activeSelection[0].selection_name,
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
    console.error("[API] /api/spp/dashboard/metrics error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch dashboard metrics",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
