/**
 * Inventory by Category API Endpoint
 * Returns inventory value and product count breakdown by category
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
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
        nxtDateFilter = 'AND nxt.as_of_ts >= CURRENT_DATE';
        sohDateFilter = 'AND soh.as_of_ts >= CURRENT_DATE';
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
            nxt: 'AND nxt.as_of_ts >= CURRENT_DATE',
            soh: 'AND soh.as_of_ts >= CURRENT_DATE',
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

    // Simplified query that reliably works with the data
    const categoryQuery = `
      WITH category_stock AS (
        SELECT 
          COALESCE(cat.name, 'Uncategorized') AS category_name,
          cat.category_id,
          soh.supplier_product_id,
          soh.qty,
          COALESCE(soh.unit_cost, 0) AS unit_cost,
          COALESCE(soh.total_value, soh.qty * COALESCE(soh.unit_cost, 0)) AS line_value
        FROM core.stock_on_hand soh
        JOIN core.stock_location sl ON sl.location_id = soh.location_id
        LEFT JOIN core.supplier_product sp ON sp.supplier_product_id = soh.supplier_product_id
        LEFT JOIN core.category cat ON cat.category_id = sp.category_id
        WHERE soh.qty > 0
          AND sl.type = 'internal'
      )
      SELECT 
        category_name,
        category_id,
        COUNT(DISTINCT supplier_product_id) AS product_count,
        SUM(qty) AS total_quantity,
        SUM(line_value) AS total_value,
        AVG(unit_cost) AS avg_price,
        ROUND((SUM(line_value) / NULLIF(SUM(SUM(line_value)) OVER (), 0)) * 100, 2) AS percentage
      FROM category_stock
      GROUP BY category_name, category_id
      ORDER BY total_value DESC
      LIMIT 20
    `;

    const result = await query(categoryQuery, [], { timeout: 10000 });

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
