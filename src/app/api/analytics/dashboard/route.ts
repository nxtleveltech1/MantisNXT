// Real-time Analytics Dashboard API Endpoint
import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { createAnalyticsService } from '@/lib/analytics/analytics-service';

// Database connection
const db = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: false,
  max: parseInt(process.env.DB_POOL_MAX || '50'),
  min: parseInt(process.env.DB_POOL_MIN || '10'),
  idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT || '30000'),
  connectionTimeoutMillis: parseInt(process.env.DB_POOL_CONNECTION_TIMEOUT || '5000'),
});

const analyticsService = createAnalyticsService(db);

// Real-time KPI calculations
async function calculateKPIs(organizationId: string) {
  const queries = {
    // Supplier KPIs
    totalSuppliers: `SELECT COUNT(*) as count FROM suppliers WHERE organization_id = $1`,
    activeSuppliers: `SELECT COUNT(*) as count FROM suppliers WHERE organization_id = $1 AND status = 'active'`,
    avgSupplierPerformance: `
      SELECT AVG(overall_rating) as avg_rating
      FROM supplier_performance sp
      JOIN suppliers s ON sp.supplier_id = s.id
      WHERE s.organization_id = $1
      AND sp.evaluation_date >= NOW() - INTERVAL '30 days'
    `,
    suppliersAtRisk: `
      SELECT COUNT(*) as count
      FROM supplier_performance sp
      JOIN suppliers s ON sp.supplier_id = s.id
      WHERE s.organization_id = $1
      AND (sp.on_time_delivery_rate < 85 OR sp.quality_acceptance_rate < 90)
      AND sp.evaluation_date >= NOW() - INTERVAL '30 days'
    `,

    // Inventory KPIs
    totalInventoryItems: `SELECT COUNT(*) as count FROM inventory_items WHERE organization_id = $1`,
    totalInventoryValue: `
      SELECT SUM(current_stock * unit_cost) as total_value
      FROM inventory_items
      WHERE organization_id = $1
    `,
    lowStockItems: `
      SELECT COUNT(*) as count
      FROM inventory_items
      WHERE organization_id = $1
      AND current_stock <= reorder_point
    `,
    outOfStockItems: `
      SELECT COUNT(*) as count
      FROM inventory_items
      WHERE organization_id = $1
      AND current_stock = 0
    `,

    // Movement KPIs
    totalMovementsToday: `
      SELECT COUNT(*) as count
      FROM stock_movements sm
      JOIN inventory_items ii ON sm.item_id = ii.id
      WHERE ii.organization_id = $1
      AND sm.timestamp::date = CURRENT_DATE
    `,
    inboundMovementsToday: `
      SELECT COALESCE(SUM(quantity), 0) as total
      FROM stock_movements sm
      JOIN inventory_items ii ON sm.item_id = ii.id
      WHERE ii.organization_id = $1
      AND sm.type = 'inbound'
      AND sm.timestamp::date = CURRENT_DATE
    `,
    outboundMovementsToday: `
      SELECT COALESCE(SUM(quantity), 0) as total
      FROM stock_movements sm
      JOIN inventory_items ii ON sm.item_id = ii.id
      WHERE ii.organization_id = $1
      AND sm.type = 'outbound'
      AND sm.timestamp::date = CURRENT_DATE
    `,

    // Analytics KPIs
    activeAnomalies: `
      SELECT COUNT(*) as count
      FROM analytics_anomalies
      WHERE organization_id = $1
      AND detected_at >= NOW() - INTERVAL '24 hours'
      AND resolved_at IS NULL
    `,
    predictionAccuracy: `
      SELECT AVG(accuracy) as avg_accuracy
      FROM analytics_predictions
      WHERE organization_id = $1
      AND created_at >= NOW() - INTERVAL '7 days'
    `,

    // Financial KPIs
    purchaseOrdersThisMonth: `
      SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total_value
      FROM purchase_orders po
      JOIN suppliers s ON po.supplier_id = s.id
      WHERE s.organization_id = $1
      AND po.order_date >= DATE_TRUNC('month', CURRENT_DATE)
    `,
  };

  const results: any = {};

  // Execute all queries in parallel
  await Promise.all(
    Object.entries(queries).map(async ([key, query]) => {
      try {
        const result = await db.query(query, [organizationId]);
        results[key] = result.rows[0];
      } catch (error) {
        console.error(`Error executing ${key} query:`, error);
        results[key] = { count: 0, total_value: 0, avg_rating: 0, avg_accuracy: 0 };
      }
    })
  );

  return results;
}

// Real-time trend data
async function getTrendData(organizationId: string, days: number = 30) {
  const trendQueries = {
    supplierPerformance: `
      SELECT
        DATE(sp.evaluation_date) as date,
        AVG(sp.overall_rating) as avg_rating,
        AVG(sp.on_time_delivery_rate) as avg_delivery_rate,
        AVG(sp.quality_acceptance_rate) as avg_quality_rate
      FROM supplier_performance sp
      JOIN suppliers s ON sp.supplier_id = s.id
      WHERE s.organization_id = $1
      AND sp.evaluation_date >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE(sp.evaluation_date)
      ORDER BY date
    `,
    inventoryMovements: `
      SELECT
        DATE(sm.timestamp) as date,
        SUM(CASE WHEN sm.type = 'inbound' THEN sm.quantity ELSE 0 END) as inbound,
        SUM(CASE WHEN sm.type = 'outbound' THEN sm.quantity ELSE 0 END) as outbound,
        COUNT(*) as total_movements
      FROM stock_movements sm
      JOIN inventory_items ii ON sm.item_id = ii.id
      WHERE ii.organization_id = $1
      AND sm.timestamp >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE(sm.timestamp)
      ORDER BY date
    `,
    inventoryValue: `
      SELECT
        DATE(created_at) as date,
        SUM(current_stock * unit_cost) as total_value,
        COUNT(*) as item_count
      FROM inventory_items
      WHERE organization_id = $1
      AND created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE(created_at)
      ORDER BY date
    `,
    anomalies: `
      SELECT
        DATE(detected_at) as date,
        COUNT(*) as total,
        SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END) as critical,
        SUM(CASE WHEN severity = 'high' THEN 1 ELSE 0 END) as high,
        SUM(CASE WHEN severity = 'medium' THEN 1 ELSE 0 END) as medium
      FROM analytics_anomalies
      WHERE organization_id = $1
      AND detected_at >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE(detected_at)
      ORDER BY date
    `
  };

  const trends: any = {};

  await Promise.all(
    Object.entries(trendQueries).map(async ([key, query]) => {
      try {
        const result = await db.query(query, [organizationId]);
        trends[key] = result.rows;
      } catch (error) {
        console.error(`Error executing ${key} trend query:`, error);
        trends[key] = [];
      }
    })
  );

  return trends;
}

// Top performing and at-risk items
async function getTopItems(organizationId: string) {
  const topItemsQueries = {
    topSuppliers: `
      SELECT
        s.id,
        s.name,
        s.tier,
        sp.overall_rating,
        sp.on_time_delivery_rate,
        sp.quality_acceptance_rate,
        po_stats.total_orders,
        po_stats.total_value
      FROM suppliers s
      LEFT JOIN supplier_performance sp ON s.id = sp.supplier_id
      LEFT JOIN (
        SELECT
          supplier_id,
          COUNT(*) as total_orders,
          SUM(total_amount) as total_value
        FROM purchase_orders
        WHERE order_date >= NOW() - INTERVAL '90 days'
        GROUP BY supplier_id
      ) po_stats ON s.id = po_stats.supplier_id
      WHERE s.organization_id = $1
      AND s.status = 'active'
      ORDER BY sp.overall_rating DESC NULLS LAST
      LIMIT 10
    `,
    riskSuppliers: `
      SELECT
        s.id,
        s.name,
        s.tier,
        sp.overall_rating,
        sp.on_time_delivery_rate,
        sp.quality_acceptance_rate,
        sp.response_time_hours
      FROM suppliers s
      JOIN supplier_performance sp ON s.id = sp.supplier_id
      WHERE s.organization_id = $1
      AND s.status = 'active'
      AND (sp.on_time_delivery_rate < 85 OR sp.quality_acceptance_rate < 90)
      ORDER BY sp.overall_rating ASC
      LIMIT 10
    `,
    topMovingItems: `
      SELECT
        ii.id,
        ii.sku,
        ii.name,
        ii.category,
        ii.current_stock,
        movement_stats.total_outbound,
        movement_stats.total_inbound,
        movement_stats.net_movement
      FROM inventory_items ii
      JOIN (
        SELECT
          item_id,
          SUM(CASE WHEN type = 'outbound' THEN quantity ELSE 0 END) as total_outbound,
          SUM(CASE WHEN type = 'inbound' THEN quantity ELSE 0 END) as total_inbound,
          SUM(CASE WHEN type = 'outbound' THEN -quantity ELSE quantity END) as net_movement
        FROM stock_movements
        WHERE timestamp >= NOW() - INTERVAL '30 days'
        GROUP BY item_id
      ) movement_stats ON ii.id = movement_stats.item_id
      WHERE ii.organization_id = $1
      ORDER BY movement_stats.total_outbound DESC
      LIMIT 10
    `,
    lowStockItems: `
      SELECT
        id,
        sku,
        name,
        category,
        current_stock,
        reorder_point,
        (reorder_point - current_stock) as shortage,
        unit_cost * (reorder_point - current_stock) as shortage_value
      FROM inventory_items
      WHERE organization_id = $1
      AND current_stock <= reorder_point
      ORDER BY (reorder_point - current_stock) DESC
      LIMIT 10
    `
  };

  const topItems: any = {};

  await Promise.all(
    Object.entries(topItemsQueries).map(async ([key, query]) => {
      try {
        const result = await db.query(query, [organizationId]);
        topItems[key] = result.rows;
      } catch (error) {
        console.error(`Error executing ${key} query:`, error);
        topItems[key] = [];
      }
    })
  );

  return topItems;
}

// GET /api/analytics/dashboard - Get real-time dashboard data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId') || '1';
    const includeRealtimeMetrics = searchParams.get('realtime') === 'true';
    const trendDays = parseInt(searchParams.get('trendDays') || '30');

    const startTime = Date.now();

    // Get all dashboard components in parallel
    const [kpis, trends, topItems, realtimeMetrics, businessInsights] = await Promise.all([
      calculateKPIs(organizationId),
      getTrendData(organizationId, trendDays),
      getTopItems(organizationId),
      includeRealtimeMetrics ? analyticsService.getRealTimeMetrics(organizationId) : null,
      analyticsService.getBusinessInsights(organizationId)
    ]);

    const processingTime = Date.now() - startTime;

    const dashboardData = {
      kpis: {
        suppliers: {
          total: kpis.totalSuppliers?.count || 0,
          active: kpis.activeSuppliers?.count || 0,
          avgPerformance: parseFloat(kpis.avgSupplierPerformance?.avg_rating || '0'),
          atRisk: kpis.suppliersAtRisk?.count || 0
        },
        inventory: {
          totalItems: kpis.totalInventoryItems?.count || 0,
          totalValue: parseFloat(kpis.totalInventoryValue?.total_value || '0'),
          lowStock: kpis.lowStockItems?.count || 0,
          outOfStock: kpis.outOfStockItems?.count || 0
        },
        movements: {
          todayTotal: kpis.totalMovementsToday?.count || 0,
          todayInbound: parseFloat(kpis.inboundMovementsToday?.total || '0'),
          todayOutbound: parseFloat(kpis.outboundMovementsToday?.total || '0')
        },
        analytics: {
          activeAnomalies: kpis.activeAnomalies?.count || 0,
          predictionAccuracy: parseFloat(kpis.predictionAccuracy?.avg_accuracy || '0.85')
        },
        financial: {
          monthlyPOs: kpis.purchaseOrdersThisMonth?.count || 0,
          monthlyPOValue: parseFloat(kpis.purchaseOrdersThisMonth?.total_value || '0')
        }
      },
      trends,
      topItems,
      realtimeMetrics,
      businessInsights,
      metadata: {
        organizationId,
        processingTime,
        timestamp: new Date().toISOString(),
        trendPeriod: `${trendDays} days`,
        dataFreshness: 'real-time'
      }
    };

    return NextResponse.json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    console.error('Dashboard data error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate dashboard data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST /api/analytics/dashboard - Update dashboard configuration
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { organizationId, refreshInterval, widgets, alerts, preferences } = body;

    // Store dashboard configuration
    const configQuery = `
      INSERT INTO analytics_dashboard_config (
        organization_id,
        refresh_interval,
        widgets,
        alerts,
        preferences,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (organization_id) DO UPDATE SET
        refresh_interval = $2,
        widgets = $3,
        alerts = $4,
        preferences = $5,
        updated_at = NOW()
    `;

    await db.query(configQuery, [
      organizationId,
      refreshInterval || 30000, // Default 30 seconds
      JSON.stringify(widgets || {}),
      JSON.stringify(alerts || {}),
      JSON.stringify(preferences || {})
    ]);

    return NextResponse.json({
      success: true,
      message: 'Dashboard configuration updated successfully',
      data: {
        organizationId,
        refreshInterval,
        widgets,
        alerts,
        preferences
      }
    });

  } catch (error) {
    console.error('Dashboard configuration error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update dashboard configuration',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}