import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { query as dbQuery } from '@/lib/database/unified-connection';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const supplierId = searchParams.get('supplier_id');

    // Build conditions for supplier filter
    const params: unknown[] = [];
    let idx = 1;
    
    let totalSupplierProductsCondition = '1=1';
    if (supplierId && supplierId !== 'all') {
      totalSupplierProductsCondition = `sp.supplier_id = $${idx}`;
      params.push(supplierId);
      idx++;
    }

    // Query for metrics
    const metricsSql = `
      WITH latest_brands AS (
        SELECT DISTINCT ON (sp.supplier_product_id)
          sp.supplier_product_id,
          COALESCE(br.brand, sp.attrs_json->>'brand') AS brand
        FROM core.supplier_product sp
        LEFT JOIN LATERAL (
          SELECT r.brand
          FROM spp.pricelist_row r
          JOIN spp.pricelist_upload u ON u.upload_id = r.upload_id AND u.supplier_id = sp.supplier_id
          WHERE r.supplier_sku = sp.supplier_sku AND r.brand IS NOT NULL AND r.brand <> ''
          ORDER BY u.received_at DESC, r.row_num DESC
          LIMIT 1
        ) br ON TRUE
      )
      SELECT
        -- Total products for selected supplier (or all if no supplier selected)
        (
          SELECT COUNT(*)::int
          FROM core.supplier_product sp
          WHERE ${totalSupplierProductsCondition}
        ) AS total_supplier_products,
        -- Total products across all suppliers
        (
          SELECT COUNT(*)::int
          FROM core.supplier_product sp
        ) AS total_products_all_suppliers,
        -- Total active suppliers
        (
          SELECT COUNT(DISTINCT supplier_id)::int
          FROM core.supplier
          WHERE active = true
        ) AS suppliers,
        -- Unique brands count
        (
          SELECT COUNT(DISTINCT brand)::int
          FROM latest_brands
          WHERE brand IS NOT NULL AND brand <> ''
        ) AS brands
    `;

    const result = await dbQuery<{
      total_supplier_products: number;
      total_products_all_suppliers: number;
      suppliers: number;
      brands: number;
    }>(metricsSql, params);

    const metrics = result.rows[0] || {
      total_supplier_products: 0,
      total_products_all_suppliers: 0,
      suppliers: 0,
      brands: 0,
    };

    return NextResponse.json({
      success: true,
      data: {
        totalSupplierProducts: metrics.total_supplier_products,
        totalProductsAllSuppliers: metrics.total_products_all_suppliers,
        suppliers: metrics.suppliers,
        brands: metrics.brands,
      },
    });
  } catch (error) {
    console.error('[API] /api/catalog/metrics error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch metrics',
      },
      { status: 500 }
    );
  }
}

