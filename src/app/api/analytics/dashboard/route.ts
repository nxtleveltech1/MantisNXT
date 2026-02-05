import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { withAuth } from '@/middleware/api-auth';
import { getOrSet, makeKey } from '@/lib/cache/responseCache';
import { pool } from '@/lib/database/unified-connection';

export const GET = withAuth(async (request: NextRequest) => {
  const cacheKey = makeKey(request.url);

  try {
    const payload = await getOrSet(cacheKey, async () => {
      const searchParams = request.nextUrl.searchParams;
      const organizationId = searchParams.get('organizationId') || '1';

      const [
        suppliersResult,
        inventoryCountResult,
        lowStockResult,
        outOfStockResult,
        inventoryValueResult,
        supplierMetricsResult,
        prevPeriodStockResult,
        prevPeriodSuppliersResult,
      ] = await Promise.all([
        pool.query<{ count: string }>(
          'SELECT COUNT(*) as count FROM core.supplier WHERE active = $1',
          [true]
        ),
        pool.query<{ count: string }>('SELECT COUNT(*) as count FROM core.stock_on_hand'),
        pool.query<{ count: string }>(
          'SELECT COUNT(*) as count FROM core.stock_on_hand WHERE qty <= 10 AND qty > 0'
        ),
        pool.query<{ out_of_stock: string }>(
          'SELECT COUNT(*) as out_of_stock FROM core.stock_on_hand WHERE qty = 0'
        ),
        pool.query<{ total_value: string }>(
          'SELECT COALESCE(SUM(qty * unit_cost), 0) as total_value FROM core.stock_on_hand'
        ),
        pool.query<{
          total_suppliers: string;
          active_suppliers: string;
          preferred_suppliers: string;
          avg_performance_score: string;
        }>(
          `
            SELECT
              COUNT(*) as total_suppliers,
              COUNT(*) FILTER (WHERE active = true) as active_suppliers,
              COALESCE((
                SELECT COUNT(DISTINCT sp.supplier_id)
                FROM core.supplier_performance sp
                WHERE sp.score >= 80
              ), 0) as preferred_suppliers,
              COALESCE((
                SELECT AVG(sp.score)
                FROM core.supplier_performance sp
              ), 0) as avg_performance_score
            FROM core.supplier
          `
        ),
        // Previous period stock count (30 days ago snapshot via stock_movement)
        pool.query<{ prev_count: string; prev_value: string }>(
          `SELECT
             COUNT(DISTINCT sm.supplier_product_id) as prev_count,
             COALESCE(SUM(ABS(sm.qty_change)), 0) as prev_value
           FROM core.stock_movement sm
           WHERE sm.movement_date >= NOW() - INTERVAL '60 days'
             AND sm.movement_date < NOW() - INTERVAL '30 days'`
        ),
        // Previous period supplier count
        pool.query<{ prev_active: string }>(
          `SELECT COUNT(*) as prev_active
           FROM core.supplier
           WHERE active = true
             AND created_at < NOW() - INTERVAL '30 days'`
        ),
      ]);

      const totalInventoryValue = Number(inventoryValueResult.rows[0]?.total_value ?? 0);
      const outOfStockCount = Number(outOfStockResult.rows[0]?.out_of_stock ?? 0);
      const supplierMetrics = supplierMetricsResult.rows[0] ?? {};

      return {
        success: true,
        data: {
          kpis: {
            totalSuppliers: Number(supplierMetrics.total_suppliers ?? 0),
            activeSuppliers: Number(supplierMetrics.active_suppliers ?? 0),
            totalInventoryItems: Number(inventoryCountResult.rows[0]?.count ?? 0),
            totalInventoryValue,
            lowStockAlerts: Number(lowStockResult.rows[0]?.count ?? 0),
            outOfStockItems: outOfStockCount,
            preferredSuppliers: Number(supplierMetrics.preferred_suppliers ?? 0),
            avgSupplierPerformance: Number(supplierMetrics.avg_performance_score ?? 75),
          },
          realTimeMetrics: {
            suppliersAnalyzed: Number(supplierMetrics.total_suppliers ?? 0),
            inventoryOptimized: Number(inventoryCountResult.rows[0]?.count ?? 0),
            totalValue: totalInventoryValue,
            alertsGenerated: Number(lowStockResult.rows[0]?.count ?? 0) + outOfStockCount,
            performanceScore: Number(supplierMetrics.avg_performance_score ?? 75),
          },
          performanceTrends: (() => {
            const currentActive = Number(supplierMetrics.active_suppliers ?? 0);
            const prevActive = Number(prevPeriodSuppliersResult.rows[0]?.prev_active ?? currentActive);
            const activeChange = prevActive > 0 ? ((currentActive - prevActive) / prevActive * 100) : 0;

            const currentItems = Number(inventoryCountResult.rows[0]?.count ?? 0);
            const prevItems = Number(prevPeriodStockResult.rows[0]?.prev_count ?? currentItems);
            const itemsChange = prevItems > 0 ? ((currentItems - prevItems) / prevItems * 100) : 0;

            const stockAccuracy = Math.max(0, 100 - (outOfStockCount / Math.max(1, currentItems)) * 100);

            const computeTrend = (change: number): 'up' | 'down' | 'stable' =>
              change > 1 ? 'up' : change < -1 ? 'down' : 'stable';

            const formatChange = (change: number): string | null =>
              change === 0 ? null : `${change > 0 ? '+' : ''}${change.toFixed(1)}%`;

            return [
              {
                metric: 'Supplier Performance',
                value: Number(supplierMetrics.avg_performance_score ?? 0),
                change: formatChange(activeChange),
                trend: computeTrend(activeChange),
              },
              {
                metric: 'Inventory Value',
                value: totalInventoryValue,
                change: formatChange(itemsChange),
                trend: computeTrend(itemsChange),
              },
              {
                metric: 'Active Suppliers',
                value: currentActive,
                change: formatChange(activeChange),
                trend: computeTrend(activeChange),
              },
              {
                metric: 'Stock Accuracy',
                value: stockAccuracy,
                change: null,
                trend: 'stable' as const,
              },
            ];
          })(),
        },
        meta: { organizationId },
        timestamp: new Date().toISOString(),
      };
    });

    return NextResponse.json(payload);
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch dashboard data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
});
