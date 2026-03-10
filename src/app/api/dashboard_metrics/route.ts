export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { pool } from '@/lib/database/unified-connection';

/** Run query with fallback; returns null rows on failure */
async function safeQuery<T = unknown>(
  sql: string,
  params?: unknown[]
): Promise<{ rows: T[] } | null> {
  try {
    const result = await pool.query(sql, params);
    return result as { rows: T[] };
  } catch (err) {
    console.warn('Dashboard metrics query failed:', (err as Error).message);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('📊 Fetching dashboard metrics');

    // Core queries (essential tables) - run in parallel
    const [
      suppliersResult,
      inventoryResult,
      supplierProductsResult,
      lowStockResult,
      outOfStockResult,
      supplierBaseResult,
    ] = await Promise.all([
      safeQuery('SELECT COUNT(*) as count FROM core.supplier WHERE active = $1', [true]),
      safeQuery(
        `SELECT COUNT(*) as count,
          COALESCE(SUM(soh.qty * COALESCE(soh.unit_cost, 0)), 0) as total_value,
          COALESCE(AVG(soh.qty * COALESCE(soh.unit_cost, 0)), 0) as avg_value
        FROM core.stock_on_hand soh
        JOIN core.supplier_product sp ON sp.supplier_product_id = soh.supplier_product_id
        WHERE sp.is_active = $1`,
        [true]
      ),
      safeQuery('SELECT COUNT(*) as count FROM core.supplier_product WHERE is_active = $1', [true]),
      safeQuery('SELECT COUNT(*) as count FROM core.stock_on_hand WHERE qty <= 10 AND qty > 0'),
      safeQuery('SELECT COUNT(*) as count FROM core.stock_on_hand WHERE qty = 0'),
      safeQuery(
        `SELECT COUNT(*) as total_suppliers,
          COUNT(*) FILTER (WHERE active = true) as active_suppliers
        FROM core.supplier`
      ),
    ]);

    // Optional: supplier_performance (table may not exist in all envs)
    const supplierPerfResult = await safeQuery<{
      preferred_suppliers: string;
      avg_performance_score: string;
    }>(
      `SELECT
        COALESCE((SELECT COUNT(DISTINCT supplier_id) FROM core.supplier_performance WHERE score >= 80), 0)::text as preferred_suppliers,
        COALESCE((SELECT AVG(score)::text FROM core.supplier_performance), '75') as avg_performance_score`
    );

    const supplierMetrics = {
      total_suppliers: supplierBaseResult?.rows[0]?.total_suppliers ?? '0',
      active_suppliers: supplierBaseResult?.rows[0]?.active_suppliers ?? '0',
      preferred_suppliers: supplierPerfResult?.rows[0]?.preferred_suppliers ?? '0',
      avg_performance_score: supplierPerfResult?.rows[0]?.avg_performance_score ?? '75',
    };

    // Extract metrics from query results (safe parsing)
    const totalInventoryValue = parseFloat(
      String(inventoryResult?.rows[0]?.total_value ?? 0)
    );
    const avgInventoryValue = parseFloat(String(inventoryResult?.rows[0]?.avg_value ?? 0));
    const totalSupplierProducts = parseInt(
      String(supplierProductsResult?.rows[0]?.count ?? 0),
      10
    );

    // Purchase order metrics from core.purchase_orders
    let purchaseOrderMetrics = {
      total_orders: '0',
      pending_orders: '0',
      approved_orders: '0',
      total_value: '0',
    };
    try {
      const poResult = await pool.query(`
        SELECT
          COUNT(*) as total_orders,
          COUNT(*) FILTER (WHERE status = 'pending' OR status = 'draft') as pending_orders,
          COUNT(*) FILTER (WHERE status = 'approved' OR status = 'confirmed') as approved_orders,
          COALESCE(SUM(total_amount), 0) as total_value
        FROM core.purchase_orders
        WHERE created_at >= NOW() - INTERVAL '30 days'
      `);
      if (poResult.rows[0]) {
        purchaseOrderMetrics = poResult.rows[0];
      }
    } catch {
      // Purchase orders table may not have data yet
    }

    const dashboardMetrics = {
      success: true,
      data: {
        // Core KPIs
        totalSuppliers: parseInt(supplierMetrics.total_suppliers || '0'),
        activeSuppliers: parseInt(supplierMetrics.active_suppliers || '0'),
        preferredSuppliers: parseInt(supplierMetrics.preferred_suppliers || '0'),
        totalInventoryItems: parseInt(String(inventoryResult?.rows[0]?.count ?? 0), 10),
        totalInventoryValue,
        totalSupplierProducts,
        averageInventoryValue: avgInventoryValue,
        lowStockAlerts: parseInt(lowStockResult?.rows[0]?.count || '0'),
        outOfStockItems: parseInt(outOfStockResult?.rows[0]?.count || '0'),
        avgSupplierPerformance: parseFloat(supplierMetrics.avg_performance_score || '75'),

        // Purchase Order Metrics (Last 30 Days)
        totalPurchaseOrders: parseInt(purchaseOrderMetrics.total_orders || '0'),
        pendingPurchaseOrders: parseInt(purchaseOrderMetrics.pending_orders || '0'),
        approvedPurchaseOrders: parseInt(purchaseOrderMetrics.approved_orders || '0'),
        totalPurchaseOrderValue: parseFloat(purchaseOrderMetrics.total_value || '0'),

        // Calculated Health Scores
        inventoryHealthScore: Math.min(
          100,
          Math.max(
            0,
            100 -
              ((parseInt(lowStockResult?.rows[0]?.count || '0') +
                parseInt(outOfStockResult?.rows[0]?.count || '0')) /
                Math.max(1, parseInt(inventoryResult?.rows[0]?.count || '1'))) *
                100
          )
        ),
        supplierDiversityScore: Math.min(
          100,
          (parseInt(supplierMetrics.active_suppliers || '0') /
            Math.max(1, parseInt(supplierMetrics.total_suppliers || '1'))) *
            100
        ),

        // Alert Counts
        totalAlerts:
          parseInt(lowStockResult?.rows[0]?.count || '0') +
          parseInt(outOfStockResult?.rows[0]?.count || '0'),
        criticalAlerts: parseInt(outOfStockResult?.rows[0]?.count || '0'),

        // Performance Indicators
        stockTurnoverRate: await (async () => {
          try {
            const tr = await pool.query(`
              SELECT CASE WHEN avg_stock > 0
                THEN ROUND(total_movements::numeric / avg_stock, 1) ELSE 0 END as rate
              FROM (
                SELECT COUNT(*) as total_movements,
                  GREATEST(1, (SELECT AVG(qty) FROM core.stock_on_hand WHERE qty > 0)) as avg_stock
                FROM core.stock_movement WHERE movement_date >= NOW() - INTERVAL '90 days'
              ) sub`);
            return parseFloat(tr.rows[0]?.rate || '0');
          } catch { return 0; }
        })(),
        fillRate: Math.max(
          0,
          100 -
            (parseInt(outOfStockResult?.rows[0]?.count || '0') /
              Math.max(1, parseInt(inventoryResult?.rows[0]?.count || '1'))) *
              100
        ),
        onTimeDeliveryRate: 0, // TODO: requires logistics module
      },
      metadata: {
        dataFreshness: new Date().toISOString(),
        calculationMethod: 'real-time',
        lastUpdated: new Date().toISOString(),
      },
    };

    console.log('✅ Dashboard metrics retrieved successfully', {
      inventoryValue: totalInventoryValue,
      supplierProducts: totalSupplierProducts,
    });
    return NextResponse.json(dashboardMetrics);
  } catch (error) {
    console.error('❌ Dashboard metrics API error:', error);
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
