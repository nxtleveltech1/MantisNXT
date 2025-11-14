/**
 * Inventory by Category API Endpoint
 * Returns inventory value and product count breakdown by category
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server';
import { query } from '@/lib/database/unified-connection';
import { CORE_TABLES, SERVE_VIEWS } from '@/lib/db/schema-contract';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateRange = searchParams.get('range') || 'month'; // today, week, month, custom

    // Build date filters based on range
    let nxtDateFilter = '';
    let sohDateFilter = '';
    switch (dateRange) {
      case 'today':
        nxtDateFilter = "AND nxt.as_of_ts >= CURRENT_DATE";
        sohDateFilter = "AND soh.as_of_ts >= CURRENT_DATE";
        break;
      case 'week':
        nxtDateFilter = "AND nxt.as_of_ts >= CURRENT_DATE - INTERVAL '7 days'";
        sohDateFilter = "AND soh.as_of_ts >= CURRENT_DATE - INTERVAL '7 days'";
        break;
      case 'month':
        nxtDateFilter = "AND nxt.as_of_ts >= CURRENT_DATE - INTERVAL '30 days'";
        sohDateFilter = "AND soh.as_of_ts >= CURRENT_DATE - INTERVAL '30 days'";
        break;
      default:
        nxtDateFilter = '';
        sohDateFilter = '';
    }

    const viewCheck = await query(
      "SELECT to_regclass('serve.v_nxt_soh') IS NOT NULL AS exists",
      [],
      { timeout: 1000 }
    );
    const serveViewAvailable = Boolean(viewCheck.rows?.[0]?.exists);

    const buildDateFilters = (range: string) => {
      switch (range) {
        case 'today':
          return {
            nxt: "AND nxt.as_of_ts >= CURRENT_DATE",
            soh: "AND soh.as_of_ts >= CURRENT_DATE",
          };
        case 'week':
          return {
            nxt: "AND nxt.as_of_ts >= CURRENT_DATE - INTERVAL '7 days'",
            soh: "AND soh.as_of_ts >= CURRENT_DATE - INTERVAL '7 days'",
          };
        case 'month':
          return {
            nxt: "AND nxt.as_of_ts >= CURRENT_DATE - INTERVAL '30 days'",
            soh: "AND soh.as_of_ts >= CURRENT_DATE - INTERVAL '30 days'",
          };
        default:
          return { nxt: '', soh: '' };
      }
    };

    const buildCategoryQuery = (range: string) => {
      const { nxt, soh } = buildDateFilters(range);

      return serveViewAvailable
        ? `
      WITH category_inventory AS (
        SELECT
          cat.category_id,
          cat.name AS category_name,
          cat.parent_id AS parent_category_id,
          nxt.supplier_product_id,
          nxt.qty_on_hand AS qty,
          COALESCE(nxt.unit_cost, 0) AS unit_price,
          COALESCE(nxt.total_value, nxt.qty_on_hand * COALESCE(nxt.unit_cost, 0)) AS line_value
        FROM ${SERVE_VIEWS.NXT_SOH} nxt
        JOIN ${CORE_TABLES.STOCK_LOCATION} sl
          ON sl.location_id = nxt.location_id
        JOIN ${CORE_TABLES.SUPPLIER_PRODUCT} sp
          ON sp.supplier_product_id = nxt.supplier_product_id
        LEFT JOIN ${CORE_TABLES.PRODUCT} p
          ON p.product_id = sp.product_id
        LEFT JOIN ${CORE_TABLES.CATEGORY} cat
          ON cat.category_id = COALESCE(sp.category_id, p.category_id)
        WHERE nxt.qty_on_hand > 0 ${nxt}
          AND sl.type = 'internal'
      ),
      category_totals AS (
        SELECT
          category_id,
          category_name,
          parent_category_id,
          COUNT(DISTINCT supplier_product_id) AS product_count,
          SUM(qty) AS total_quantity,
          SUM(line_value) AS total_value,
          AVG(unit_price) AS avg_price
        FROM category_inventory
        GROUP BY category_id, category_name, parent_category_id
      )
      SELECT
        ct.category_id,
        ct.category_name,
        ct.parent_category_id,
        ct.product_count,
        ct.total_quantity,
        ct.total_value,
        ct.avg_price,
        ROUND((ct.total_value / NULLIF(SUM(ct.total_value) OVER (), 0)) * 100, 2) AS percentage
      FROM category_totals ct
      WHERE ct.total_value > 0
      ORDER BY ct.total_value DESC
      LIMIT 20;
    `
        : `
      WITH stock_with_category AS (
        SELECT
          soh.supplier_product_id,
          COALESCE(sp.category_id, p.category_id) AS core_category_id,
          COALESCE(cat.name, NULLIF(inv.category, ''), price_cat.category_raw, 'Uncategorized') AS category_name,
          cat.parent_id AS parent_category_id,
          soh.qty,
          COALESCE(soh.unit_cost, 0) AS unit_price,
          COALESCE(soh.total_value, soh.qty * COALESCE(soh.unit_cost, 0)) AS line_value
        FROM ${CORE_TABLES.STOCK_ON_HAND} soh
        JOIN ${CORE_TABLES.STOCK_LOCATION} sl
          ON sl.location_id = soh.location_id
        LEFT JOIN ${CORE_TABLES.SUPPLIER_PRODUCT} sp
          ON sp.supplier_product_id = soh.supplier_product_id
        LEFT JOIN ${CORE_TABLES.PRODUCT} p
          ON p.product_id = sp.product_id
        LEFT JOIN ${CORE_TABLES.CATEGORY} cat
          ON cat.category_id = COALESCE(sp.category_id, p.category_id)
        LEFT JOIN public.inventory_items inv
          ON inv.sku = sp.supplier_sku
        LEFT JOIN LATERAL (
          SELECT category_raw
          FROM spp.pricelist_row r
          JOIN spp.pricelist_upload u ON u.upload_id = r.upload_id
          WHERE r.supplier_sku = sp.supplier_sku
          ORDER BY u.received_at DESC
          LIMIT 1
        ) price_cat ON TRUE
        WHERE (sl.type IN ('internal', 'store', 'warehouse', 'main') OR sl.name ILIKE 'main%')
          AND soh.qty > 0 ${soh}
      ),
      category_inventory AS (
        SELECT
          COALESCE(sw.core_category_id::text, NULLIF(sw.category_name, ''), 'uncategorized') AS grouping_id,
          sw.core_category_id,
          sw.category_name,
          sw.parent_category_id,
          sw.supplier_product_id,
          sw.qty,
          sw.unit_price,
          sw.line_value
        FROM stock_with_category sw
      ),
      category_totals AS (
        SELECT
          grouping_id,
          MAX(core_category_id::text) AS category_id,
          category_name,
          MAX(parent_category_id::text) AS parent_category_id,
          COUNT(DISTINCT supplier_product_id) AS product_count,
          SUM(qty) AS total_quantity,
          SUM(line_value) AS total_value,
          AVG(unit_price) AS avg_price
        FROM category_inventory
        GROUP BY grouping_id, category_name
      )
      SELECT
        ct.category_id,
        ct.category_name,
        ct.parent_category_id,
        ct.product_count,
        ct.total_quantity,
        ct.total_value,
        ct.avg_price,
        ROUND((ct.total_value / NULLIF(SUM(ct.total_value) OVER (), 0)) * 100, 2) AS percentage
      FROM category_totals ct
      WHERE ct.total_quantity > 0
      ORDER BY ct.total_value DESC
      LIMIT 20;
    `;
    };

    const categoryQuery = buildCategoryQuery(dateRange);

    const result = await query(categoryQuery, [], { timeout: 5000 });

    let categories = result.rows.map((row: any) => ({
      categoryId: row.category_id || (row.category_name ? row.category_name : 'uncategorized'),
      categoryName: row.category_name || 'Uncategorized',
      parentCategoryId: row.parent_category_id || null,
      productCount: parseInt(row.product_count) || 0,
      totalQuantity: parseInt(row.total_quantity) || 0,
      totalValue: parseFloat(row.total_value) || 0,
      avgPrice: parseFloat(row.avg_price) || 0,
      percentage: parseFloat(row.percentage) || 0,
    }));

    if (categories.length === 0 && dateRange !== 'month') {
      const fallbackQuery = buildCategoryQuery('month');
      const fallbackResult = await query(fallbackQuery, [], { timeout: 5000 });
      categories = fallbackResult.rows.map((row: any) => ({
        categoryId: row.category_id || (row.category_name ? row.category_name : 'uncategorized'),
        categoryName: row.category_name || 'Uncategorized',
        parentCategoryId: row.parent_category_id || null,
        productCount: parseInt(row.product_count) || 0,
        totalQuantity: parseInt(row.total_quantity) || 0,
        totalValue: parseFloat(row.total_value) || 0,
        avgPrice: parseFloat(row.avg_price) || 0,
        percentage: parseFloat(row.percentage) || 0,
      }));
    }

    // Calculate summary stats
    const summary = {
      totalCategories: categories.length,
      totalProducts: categories.reduce((sum: number, c: any) => sum + c.productCount, 0),
      totalValue: categories.reduce((sum: number, c: any) => sum + c.totalValue, 0),
      topCategory: categories[0]?.categoryName || 'N/A',
    };

    return NextResponse.json({
      success: true,
      data: categories,
      summary,
      dateRange,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Inventory by category error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch inventory by category',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
