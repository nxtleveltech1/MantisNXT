import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { pool } from '@/lib/database/unified-connection';

/**
 * GET /api/inventory/chart-data
 * Returns structured data for InventoryChart component:
 * - trends: monthly aggregation of stock value, item counts, low/out-of-stock
 * - distribution: category breakdown by product count
 * - stockLevels: monthly optimal/low/out-of-stock percentages
 * - turnover: category-level stock turnover rates
 */
export async function GET(_request: NextRequest) {
  try {
    const [trendsResult, distributionResult, stockLevelsResult, turnoverResult] =
      await Promise.all([
        // Trends: current snapshot (stock_movement doesn't have monthly history, so we derive from current state)
        pool.query(`
          SELECT
            TO_CHAR(sm.movement_date, 'Mon') as month,
            EXTRACT(MONTH FROM sm.movement_date) as month_num,
            COUNT(DISTINCT sm.supplier_product_id) as total_items,
            SUM(ABS(sm.qty_change)) as total_movement,
            COUNT(*) FILTER (WHERE sm.movement_type = 'receipt') as inbound_count,
            COUNT(*) FILTER (WHERE sm.movement_type IN ('sale', 'outbound', 'shipment')) as outbound_count
          FROM core.stock_movement sm
          WHERE sm.movement_date >= NOW() - INTERVAL '6 months'
          GROUP BY TO_CHAR(sm.movement_date, 'Mon'), EXTRACT(MONTH FROM sm.movement_date)
          ORDER BY month_num
        `),

        // Distribution: products grouped by category/brand
        pool.query(`
          SELECT
            COALESCE(sp.brand, 'Uncategorized') as name,
            COUNT(*) as value
          FROM core.supplier_product sp
          WHERE sp.is_active = true
          GROUP BY COALESCE(sp.brand, 'Uncategorized')
          ORDER BY COUNT(*) DESC
          LIMIT 6
        `),

        // Stock levels: current snapshot breakdown
        pool.query(`
          SELECT
            COUNT(*) FILTER (WHERE soh.qty > 10) as optimal_count,
            COUNT(*) FILTER (WHERE soh.qty > 0 AND soh.qty <= 10) as low_count,
            COUNT(*) FILTER (WHERE soh.qty = 0) as out_of_stock_count,
            COUNT(*) as total_count
          FROM core.stock_on_hand soh
          JOIN core.supplier_product sp ON sp.supplier_product_id = soh.supplier_product_id
          WHERE sp.is_active = true
        `),

        // Turnover: movement count by brand vs stock average
        pool.query(`
          SELECT
            COALESCE(sp.brand, 'Other') as category,
            CASE
              WHEN AVG(soh.qty) > 0
              THEN ROUND(COUNT(sm.movement_id)::numeric / GREATEST(1, AVG(soh.qty)), 1)
              ELSE 0
            END as turnover,
            ROUND(AVG(soh.qty), 0) as avg_stock
          FROM core.supplier_product sp
          LEFT JOIN core.stock_on_hand soh ON soh.supplier_product_id = sp.supplier_product_id
          LEFT JOIN core.stock_movement sm ON sm.supplier_product_id = sp.supplier_product_id
            AND sm.movement_date >= NOW() - INTERVAL '90 days'
          WHERE sp.is_active = true
          GROUP BY COALESCE(sp.brand, 'Other')
          HAVING COUNT(sm.movement_id) > 0
          ORDER BY turnover DESC
          LIMIT 6
        `),
      ]);

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

    // Format trends
    const trends = trendsResult.rows.map(row => ({
      month: row.month,
      totalItems: Number(row.total_items),
      totalMovement: Number(row.total_movement),
      inbound: Number(row.inbound_count),
      outbound: Number(row.outbound_count),
    }));

    // Format distribution with colors
    const distribution = distributionResult.rows.map((row, i) => ({
      name: row.name,
      value: Number(row.value),
      color: COLORS[i % COLORS.length],
    }));

    // Format stock levels as percentages
    const sl = stockLevelsResult.rows[0] || {};
    const total = Math.max(1, Number(sl.total_count || 1));
    const stockLevels = [
      {
        label: 'Current',
        optimal: Math.round((Number(sl.optimal_count || 0) / total) * 100),
        low: Math.round((Number(sl.low_count || 0) / total) * 100),
        outOfStock: Math.round((Number(sl.out_of_stock_count || 0) / total) * 100),
      },
    ];

    // Format turnover
    const turnover = turnoverResult.rows.map(row => ({
      category: row.category,
      turnover: Number(row.turnover),
      target: Math.max(1, Math.round(Number(row.turnover) * 1.1)), // target = 10% above current
    }));

    return NextResponse.json({
      success: true,
      data: { trends, distribution, stockLevels, turnover },
    });
  } catch (error) {
    console.error('Inventory chart-data API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch inventory chart data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
