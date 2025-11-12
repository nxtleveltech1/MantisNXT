/**
 * Inventory by Category API Endpoint
 * Returns inventory value and product count breakdown by category
 */

import { NextResponse } from 'next/server';
import { query } from '@/lib/database/unified-connection';
import { CORE_TABLES } from '@/lib/db/schema-contract';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateRange = searchParams.get('range') || 'month'; // today, week, month, custom

    // Build date filter based on range
    let dateFilter = '';
    switch (dateRange) {
      case 'today':
        dateFilter = "AND soh.updated_at >= CURRENT_DATE";
        break;
      case 'week':
        dateFilter = "AND soh.updated_at >= CURRENT_DATE - INTERVAL '7 days'";
        break;
      case 'month':
        dateFilter = "AND soh.updated_at >= CURRENT_DATE - INTERVAL '30 days'";
        break;
      default:
        dateFilter = '';
    }

    const categoryQuery = `
      WITH category_inventory AS (
        SELECT
          c.category_id,
          c.name as category_name,
          c.parent_category_id,
          COUNT(DISTINCT p.product_id) as product_count,
          SUM(soh.quantity) as total_quantity,
          SUM(soh.quantity * COALESCE(ph.price, 0)) as total_value,
          AVG(COALESCE(ph.price, 0)) as avg_price
        FROM ${CORE_TABLES.CATEGORY} c
        LEFT JOIN ${CORE_TABLES.CATEGORY_MAP} cm ON c.category_id = cm.category_id
        LEFT JOIN ${CORE_TABLES.PRODUCT} p ON cm.product_id = p.product_id
        LEFT JOIN ${CORE_TABLES.STOCK_ON_HAND} soh ON p.product_id = soh.product_id
        LEFT JOIN LATERAL (
          SELECT price
          FROM ${CORE_TABLES.PRICE_HISTORY}
          WHERE supplier_product_id = soh.product_id AND is_current = true
          LIMIT 1
        ) ph ON true
        WHERE soh.quantity > 0 ${dateFilter}
        GROUP BY c.category_id, c.name, c.parent_category_id
      )
      SELECT
        category_id,
        category_name,
        parent_category_id,
        product_count,
        total_quantity,
        total_value,
        avg_price,
        ROUND((total_value / NULLIF(SUM(total_value) OVER (), 0)) * 100, 2) as percentage
      FROM category_inventory
      WHERE total_value > 0
      ORDER BY total_value DESC
      LIMIT 20;
    `;

    const result = await query(categoryQuery, [], { timeout: 5000 });

    const categories = result.rows.map((row: any) => ({
      categoryId: row.category_id,
      categoryName: row.category_name || 'Uncategorized',
      parentCategoryId: row.parent_category_id,
      productCount: parseInt(row.product_count) || 0,
      totalQuantity: parseInt(row.total_quantity) || 0,
      totalValue: parseFloat(row.total_value) || 0,
      avgPrice: parseFloat(row.avg_price) || 0,
      percentage: parseFloat(row.percentage) || 0,
    }));

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
