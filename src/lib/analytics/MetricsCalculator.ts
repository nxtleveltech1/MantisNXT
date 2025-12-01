import { db } from '@/lib/database';

export type MetricType =
  | 'sales'
  | 'inventory'
  | 'supplier_performance'
  | 'customer_behavior'
  | 'financial'
  | 'operational';

export type TimePeriod = 'hourly' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export interface MetricResult {
  metricType: MetricType;
  metricKey: string;
  value: unknown;
  timePeriod: TimePeriod;
  periodStart: Date;
  periodEnd: Date;
  calculatedAt: Date;
}

export interface SalesMetrics {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  topProducts: Array<{ productId: string; name: string; revenue: number; quantity: number }>;
  revenueByCategory: Array<{ category: string; revenue: number }>;
  growthRate: number;
}

export interface InventoryMetrics {
  totalValue: number;
  itemCount: number;
  lowStockItems: number;
  overstockItems: number;
  turnoverRate: number;
  daysOfInventory: number;
  stockAccuracy: number;
}

export interface SupplierPerformanceMetrics {
  totalSuppliers: number;
  activeSuppliers: number;
  averageScore: number;
  onTimeDeliveryRate: number;
  topSuppliers: Array<{ supplierId: string; name: string; score: number; totalOrders: number }>;
  riskDistribution: Record<string, number>;
}

export class MetricsCalculator {
  /**
   * Calculate sales metrics for a period
   */
  static async calculateSalesMetrics(
    orgId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<SalesMetrics> {
    // Total revenue and orders
    const totalsResult = await db.query(
      `
      SELECT
        COALESCE(SUM(po.total_amount), 0) as total_revenue,
        COUNT(DISTINCT po.id) as total_orders,
        COALESCE(AVG(po.total_amount), 0) as average_order_value
      FROM purchase_orders po
      WHERE po.org_id = $1
        AND po.created_at BETWEEN $2 AND $3
        AND po.status = 'completed'
      `,
      [orgId, periodStart, periodEnd]
    );

    const { total_revenue, total_orders, average_order_value } = totalsResult.rows[0];

    // Top products by revenue
    const topProductsResult = await db.query(
      `
      SELECT
        p.id as product_id,
        p.name,
        SUM(poi.quantity * poi.unit_price) as revenue,
        SUM(poi.quantity) as quantity
      FROM purchase_order_items poi
      JOIN purchase_orders po ON po.id = poi.purchase_order_id
      JOIN products p ON p.id = poi.product_id
      WHERE po.org_id = $1
        AND po.created_at BETWEEN $2 AND $3
        AND po.status = 'completed'
      GROUP BY p.id, p.name
      ORDER BY revenue DESC
      LIMIT 10
      `,
      [orgId, periodStart, periodEnd]
    );

    const topProducts = topProductsResult.rows.map(row => ({
      productId: row.product_id,
      name: row.name,
      revenue: parseFloat(row.revenue),
      quantity: parseFloat(row.quantity),
    }));

    // Revenue by category
    const categoryResult = await db.query(
      `
      SELECT
        COALESCE(c.name, 'Uncategorized') as category,
        SUM(poi.quantity * poi.unit_price) as revenue
      FROM purchase_order_items poi
      JOIN purchase_orders po ON po.id = poi.purchase_order_id
      JOIN products p ON p.id = poi.product_id
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE po.org_id = $1
        AND po.created_at BETWEEN $2 AND $3
        AND po.status = 'completed'
      GROUP BY c.name
      ORDER BY revenue DESC
      `,
      [orgId, periodStart, periodEnd]
    );

    const revenueByCategory = categoryResult.rows.map(row => ({
      category: row.category,
      revenue: parseFloat(row.revenue),
    }));

    // Calculate growth rate (compare to previous period)
    const previousPeriodStart = new Date(periodStart);
    const previousPeriodEnd = new Date(periodEnd);
    const periodDuration = periodEnd.getTime() - periodStart.getTime();
    previousPeriodStart.setTime(previousPeriodStart.getTime() - periodDuration);
    previousPeriodEnd.setTime(previousPeriodEnd.getTime() - periodDuration);

    const previousResult = await db.query(
      `
      SELECT COALESCE(SUM(po.total_amount), 0) as previous_revenue
      FROM purchase_orders po
      WHERE po.org_id = $1
        AND po.created_at BETWEEN $2 AND $3
        AND po.status = 'completed'
      `,
      [orgId, previousPeriodStart, previousPeriodEnd]
    );

    const previousRevenue = parseFloat(previousResult.rows[0].previous_revenue);
    const growthRate =
      previousRevenue > 0
        ? ((parseFloat(total_revenue) - previousRevenue) / previousRevenue) * 100
        : 0;

    return {
      totalRevenue: parseFloat(total_revenue),
      totalOrders: parseInt(total_orders),
      averageOrderValue: parseFloat(average_order_value),
      topProducts,
      revenueByCategory,
      growthRate,
    };
  }

  /**
   * Calculate inventory metrics
   */
  static async calculateInventoryMetrics(orgId: string): Promise<InventoryMetrics> {
    const result = await db.query(
      `
      WITH inventory_data AS (
        SELECT
          p.id,
          p.name,
          p.unit_cost,
          soh.quantity,
          p.reorder_point,
          p.max_stock_level
        FROM products p
        LEFT JOIN stock_on_hand soh ON soh.product_id = p.id
        WHERE current_setting('app.current_org_id', true)::uuid = $1
      ),
      movement_data AS (
        SELECT
          product_id,
          SUM(ABS(quantity)) as total_movement
        FROM stock_movement
        WHERE created_at >= NOW() - INTERVAL '30 days'
          AND current_setting('app.current_org_id', true)::uuid = $1
        GROUP BY product_id
      )
      SELECT
        COUNT(DISTINCT id.id) as item_count,
        SUM(id.unit_cost * id.quantity) as total_value,
        COUNT(*) FILTER (WHERE id.quantity <= id.reorder_point) as low_stock_items,
        COUNT(*) FILTER (WHERE id.quantity >= id.max_stock_level * 1.2) as overstock_items,
        AVG(CASE WHEN id.quantity > 0 THEN md.total_movement / id.quantity ELSE 0 END) as turnover_rate,
        AVG(CASE WHEN md.total_movement > 0 THEN (30.0 * id.quantity) / md.total_movement ELSE 999 END) as days_of_inventory
      FROM inventory_data id
      LEFT JOIN movement_data md ON md.product_id = id.id
      `,
      [orgId]
    );

    const row = result.rows[0];

    return {
      totalValue: parseFloat(row.total_value) || 0,
      itemCount: parseInt(row.item_count) || 0,
      lowStockItems: parseInt(row.low_stock_items) || 0,
      overstockItems: parseInt(row.overstock_items) || 0,
      turnoverRate: parseFloat(row.turnover_rate) || 0,
      daysOfInventory: Math.min(parseFloat(row.days_of_inventory) || 0, 999),
      stockAccuracy: 0.95, // Would calculate from cycle counts
    };
  }

  /**
   * Calculate supplier performance metrics
   */
  static async calculateSupplierMetrics(orgId: string): Promise<SupplierPerformanceMetrics> {
    // Total and active suppliers
    const suppliersResult = await db.query(
      `
      SELECT
        COUNT(*) as total_suppliers,
        COUNT(*) FILTER (WHERE is_active = true) as active_suppliers
      FROM public.suppliers
      WHERE current_setting('app.current_org_id', true)::uuid = $1
      `,
      [orgId]
    );

    const { total_suppliers, active_suppliers } = suppliersResult.rows[0];

    // Average score from predictions
    const scoreResult = await db.query(
      `
      SELECT AVG(confidence_score) as avg_score
      FROM ai_prediction
      WHERE org_id = $1
        AND service_type = 'supplier_scoring'
        AND expires_at > NOW()
      `,
      [orgId]
    );

    const averageScore = (parseFloat(scoreResult.rows[0]?.avg_score) || 0.75) * 100;

    // On-time delivery rate
    const deliveryResult = await db.query(
      `
      SELECT AVG(CASE WHEN delivered_on_time THEN 1 ELSE 0 END) as on_time_rate
      FROM purchase_orders
      WHERE org_id = $1
        AND status = 'completed'
        AND created_at >= NOW() - INTERVAL '90 days'
      `,
      [orgId]
    );

    const onTimeDeliveryRate = parseFloat(deliveryResult.rows[0]?.on_time_rate) || 0;

    // Top suppliers
    const topSuppliersResult = await db.query(
      `
      SELECT
        s.id as supplier_id,
        s.name,
        COALESCE((
          SELECT confidence_score * 100
          FROM ai_prediction
          WHERE service_type = 'supplier_scoring'
            AND entity_id = s.id
            AND expires_at > NOW()
          ORDER BY created_at DESC
          LIMIT 1
        ), 75) as score,
        COUNT(po.id) as total_orders
      FROM public.suppliers s
      LEFT JOIN purchase_orders po ON po.supplier_id = s.id AND po.created_at >= NOW() - INTERVAL '90 days'
      WHERE current_setting('app.current_org_id', true)::uuid = $1
      GROUP BY s.id, s.name
      ORDER BY score DESC, total_orders DESC
      LIMIT 10
      `,
      [orgId]
    );

    const topSuppliers = topSuppliersResult.rows.map(row => ({
      supplierId: row.supplier_id,
      name: row.name,
      score: parseFloat(row.score),
      totalOrders: parseInt(row.total_orders),
    }));

    // Risk distribution
    const riskDistribution: Record<string, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    topSuppliers.forEach(supplier => {
      if (supplier.score >= 85) riskDistribution.low++;
      else if (supplier.score >= 70) riskDistribution.medium++;
      else if (supplier.score >= 50) riskDistribution.high++;
      else riskDistribution.critical++;
    });

    return {
      totalSuppliers: parseInt(total_suppliers),
      activeSuppliers: parseInt(active_suppliers),
      averageScore,
      onTimeDeliveryRate: onTimeDeliveryRate * 100,
      topSuppliers,
      riskDistribution,
    };
  }

  /**
   * Cache metric in database
   */
  static async cacheMetric(
    orgId: string,
    metricType: MetricType,
    metricKey: string,
    value: unknown,
    timePeriod: TimePeriod,
    periodStart: Date,
    periodEnd: Date
  ): Promise<void> {
    await db.query(
      `
      INSERT INTO analytics_metric_cache (
        org_id, metric_type, metric_key, metric_value,
        time_period, period_start, period_end
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (org_id, metric_type, metric_key, period_start)
      DO UPDATE SET
        metric_value = EXCLUDED.metric_value,
        calculated_at = NOW()
      `,
      [orgId, metricType, metricKey, JSON.stringify(value), timePeriod, periodStart, periodEnd]
    );
  }

  /**
   * Get cached metric
   */
  static async getCachedMetric(
    orgId: string,
    metricType: MetricType,
    metricKey: string,
    periodStart: Date
  ): Promise<unknown | null> {
    const result = await db.query(
      `
      SELECT metric_value, calculated_at
      FROM analytics_metric_cache
      WHERE org_id = $1
        AND metric_type = $2
        AND metric_key = $3
        AND period_start = $4
        AND calculated_at >= NOW() - INTERVAL '1 hour'
      ORDER BY calculated_at DESC
      LIMIT 1
      `,
      [orgId, metricType, metricKey, periodStart]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0].metric_value;
  }
}
