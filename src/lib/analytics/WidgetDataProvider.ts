import { db } from '@/lib/database';
import { MetricsCalculator, type MetricType } from './MetricsCalculator';

export type WidgetType = 'chart' | 'kpi' | 'table' | 'map';

export interface WidgetConfig {
  id: string;
  widgetType: WidgetType;
  metricType: MetricType;
  config: {
    chartType?: 'line' | 'bar' | 'pie' | 'area';
    aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max';
    groupBy?: string;
    timeRange?: string;
    limit?: number;
  };
  query: {
    filters?: Record<string, unknown>;
    dateRange?: { start: Date; end: Date };
  };
}

export interface WidgetData {
  widgetId: string;
  data: unknown;
  metadata: {
    calculatedAt: Date;
    dataPoints: number;
    fromCache: boolean;
  };
}

export class WidgetDataProvider {
  /**
   * Fetch data for a specific widget
   */
  static async getWidgetData(
    orgId: string,
    widgetConfig: WidgetConfig,
  ): Promise<WidgetData> {
    const startTime = Date.now();

    let data: unknown;
    let fromCache = false;

    // Try to get from cache first
    const cacheKey = this.generateCacheKey(widgetConfig);
    const cached = await MetricsCalculator.getCachedMetric(
      orgId,
      widgetConfig.metricType,
      cacheKey,
      widgetConfig.query.dateRange?.start || new Date(),
    );

    if (cached) {
      data = cached;
      fromCache = true;
    } else {
      // Calculate fresh data
      data = await this.calculateWidgetData(orgId, widgetConfig);

      // Cache the result
      if (widgetConfig.query.dateRange) {
        await MetricsCalculator.cacheMetric(
          orgId,
          widgetConfig.metricType,
          cacheKey,
          data,
          'hourly',
          widgetConfig.query.dateRange.start,
          widgetConfig.query.dateRange.end,
        );
      }
    }

    return {
      widgetId: widgetConfig.id,
      data,
      metadata: {
        calculatedAt: new Date(),
        dataPoints: Array.isArray(data) ? data.length : Object.keys(data).length,
        fromCache,
      },
    };
  }

  /**
   * Fetch data for multiple widgets in parallel
   */
  static async getBatchWidgetData(
    orgId: string,
    widgetConfigs: WidgetConfig[],
  ): Promise<WidgetData[]> {
    const results = await Promise.all(
      widgetConfigs.map((config) => this.getWidgetData(orgId, config)),
    );

    return results;
  }

  /**
   * Calculate widget data based on type and config
   */
  private static async calculateWidgetData(
    orgId: string,
    widgetConfig: WidgetConfig,
  ): Promise<unknown> {
    switch (widgetConfig.metricType) {
      case 'sales':
        return this.calculateSalesData(orgId, widgetConfig);
      case 'inventory':
        return this.calculateInventoryData(orgId, widgetConfig);
      case 'supplier_performance':
        return this.calculateSupplierData(orgId, widgetConfig);
      case 'financial':
        return this.calculateFinancialData(orgId, widgetConfig);
      case 'operational':
        return this.calculateOperationalData(orgId, widgetConfig);
      default:
        throw new Error(`Unsupported metric type: ${widgetConfig.metricType}`);
    }
  }

  /**
   * Calculate sales-related widget data
   */
  private static async calculateSalesData(
    orgId: string,
    widgetConfig: WidgetConfig,
  ): Promise<unknown> {
    const { dateRange, filters } = widgetConfig.query;
    const { chartType, groupBy, limit } = widgetConfig.config;

    if (!dateRange) {
      throw new Error('Date range required for sales metrics');
    }

    switch (widgetConfig.widgetType) {
      case 'kpi':
        return MetricsCalculator.calculateSalesMetrics(
          orgId,
          dateRange.start,
          dateRange.end,
        );

      case 'chart':
        if (groupBy === 'category') {
          const metrics = await MetricsCalculator.calculateSalesMetrics(
            orgId,
            dateRange.start,
            dateRange.end,
          );
          return metrics.revenueByCategory;
        }

        if (groupBy === 'time') {
          return this.getSalesOverTime(orgId, dateRange.start, dateRange.end);
        }

        return [];

      case 'table':
        const metrics = await MetricsCalculator.calculateSalesMetrics(
          orgId,
          dateRange.start,
          dateRange.end,
        );
        return metrics.topProducts.slice(0, limit || 10);

      default:
        return {};
    }
  }

  /**
   * Calculate inventory-related widget data
   */
  private static async calculateInventoryData(
    orgId: string,
    widgetConfig: WidgetConfig,
  ): Promise<unknown> {
    const metrics = await MetricsCalculator.calculateInventoryMetrics(orgId);

    switch (widgetConfig.widgetType) {
      case 'kpi':
        return metrics;

      case 'chart':
        // Return inventory breakdown
        return [
          { label: 'Total Items', value: metrics.itemCount },
          { label: 'Low Stock', value: metrics.lowStockItems },
          { label: 'Overstock', value: metrics.overstockItems },
        ];

      case 'table':
        return this.getLowStockProducts(orgId, widgetConfig.config.limit || 10);

      default:
        return {};
    }
  }

  /**
   * Calculate supplier-related widget data
   */
  private static async calculateSupplierData(
    orgId: string,
    widgetConfig: WidgetConfig,
  ): Promise<unknown> {
    const metrics = await MetricsCalculator.calculateSupplierMetrics(orgId);

    switch (widgetConfig.widgetType) {
      case 'kpi':
        return metrics;

      case 'chart':
        return Object.entries(metrics.riskDistribution).map(([level, count]) => ({
          label: level.charAt(0).toUpperCase() + level.slice(1) + ' Risk',
          value: count,
        }));

      case 'table':
        return metrics.topSuppliers.slice(0, widgetConfig.config.limit || 10);

      default:
        return {};
    }
  }

  /**
   * Calculate financial widget data
   */
  private static async calculateFinancialData(
    orgId: string,
    widgetConfig: WidgetConfig,
  ): Promise<unknown> {
    const { dateRange } = widgetConfig.query;

    if (!dateRange) {
      throw new Error('Date range required for financial metrics');
    }

    const result = await db.query(
      `
      SELECT
        SUM(po.total_amount) as total_spend,
        AVG(po.total_amount) as avg_order_value,
        COUNT(DISTINCT po.supplier_id) as suppliers_used,
        SUM(CASE WHEN po.payment_status = 'paid' THEN po.total_amount ELSE 0 END) as total_paid,
        SUM(CASE WHEN po.payment_status = 'pending' THEN po.total_amount ELSE 0 END) as total_pending
      FROM purchase_orders po
      WHERE po.org_id = $1
        AND po.created_at BETWEEN $2 AND $3
      `,
      [orgId, dateRange.start, dateRange.end],
    );

    const row = result.rows[0];

    return {
      totalSpend: parseFloat(row.total_spend) || 0,
      avgOrderValue: parseFloat(row.avg_order_value) || 0,
      suppliersUsed: parseInt(row.suppliers_used) || 0,
      totalPaid: parseFloat(row.total_paid) || 0,
      totalPending: parseFloat(row.total_pending) || 0,
    };
  }

  /**
   * Calculate operational widget data
   */
  private static async calculateOperationalData(
    orgId: string,
    widgetConfig: WidgetConfig,
  ): Promise<unknown> {
    const { dateRange } = widgetConfig.query;

    if (!dateRange) {
      throw new Error('Date range required for operational metrics');
    }

    const result = await db.query(
      `
      SELECT
        COUNT(DISTINCT sm.id) as total_movements,
        COUNT(DISTINCT sm.product_id) as products_moved,
        SUM(ABS(sm.quantity)) as total_quantity_moved,
        COUNT(DISTINCT po.id) as total_orders,
        AVG(EXTRACT(DAY FROM po.delivery_date - po.order_date)) as avg_lead_time
      FROM stock_movement sm
      LEFT JOIN purchase_orders po ON po.created_at BETWEEN $2 AND $3
      WHERE current_setting('app.current_org_id', true)::uuid = $1
        AND sm.created_at BETWEEN $2 AND $3
      `,
      [orgId, dateRange.start, dateRange.end],
    );

    const row = result.rows[0];

    return {
      totalMovements: parseInt(row.total_movements) || 0,
      productsMoved: parseInt(row.products_moved) || 0,
      totalQuantityMoved: parseFloat(row.total_quantity_moved) || 0,
      totalOrders: parseInt(row.total_orders) || 0,
      avgLeadTime: parseFloat(row.avg_lead_time) || 0,
    };
  }

  /**
   * Get sales data over time
   */
  private static async getSalesOverTime(
    orgId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Array<{ date: string; revenue: number; orders: number }>> {
    const result = await db.query(
      `
      SELECT
        DATE(po.created_at) as date,
        SUM(po.total_amount) as revenue,
        COUNT(*) as orders
      FROM purchase_orders po
      WHERE po.org_id = $1
        AND po.created_at BETWEEN $2 AND $3
        AND po.status = 'completed'
      GROUP BY DATE(po.created_at)
      ORDER BY date ASC
      `,
      [orgId, startDate, endDate],
    );

    return result.rows.map((row) => ({
      date: row.date,
      revenue: parseFloat(row.revenue),
      orders: parseInt(row.orders),
    }));
  }

  /**
   * Get low stock products
   */
  private static async getLowStockProducts(
    orgId: string,
    limit: number,
  ): Promise<Array<{ productId: string; name: string; quantity: number; reorderPoint: number }>> {
    const result = await db.query(
      `
      SELECT
        p.id as product_id,
        p.name,
        soh.quantity,
        p.reorder_point
      FROM products p
      JOIN stock_on_hand soh ON soh.product_id = p.id
      WHERE current_setting('app.current_org_id', true)::uuid = $1
        AND soh.quantity <= p.reorder_point
      ORDER BY (soh.quantity / NULLIF(p.reorder_point, 0)) ASC
      LIMIT $2
      `,
      [orgId, limit],
    );

    return result.rows.map((row) => ({
      productId: row.product_id,
      name: row.name,
      quantity: parseFloat(row.quantity),
      reorderPoint: parseFloat(row.reorder_point),
    }));
  }

  /**
   * Generate cache key for widget
   */
  private static generateCacheKey(widgetConfig: WidgetConfig): string {
    const parts = [
      widgetConfig.widgetType,
      widgetConfig.metricType,
      widgetConfig.config.chartType || '',
      widgetConfig.config.groupBy || '',
      JSON.stringify(widgetConfig.query.filters || {}),
    ];

    return parts.join('_');
  }

  /**
   * Refresh widget cache
   */
  static async refreshWidgetCache(
    orgId: string,
    widgetId: string,
  ): Promise<void> {
    // Get widget config from database
    const result = await db.query(
      `
      SELECT widget_type, metric_type, config, query
      FROM analytics_widget
      WHERE id = $1 AND org_id = $2
      `,
      [widgetId, orgId],
    );

    if (result.rows.length === 0) {
      throw new Error(`Widget ${widgetId} not found`);
    }

    const row = result.rows[0];
    const widgetConfig: WidgetConfig = {
      id: widgetId,
      widgetType: row.widget_type,
      metricType: row.metric_type,
      config: row.config,
      query: row.query,
    };

    // Force fresh calculation
    const data = await this.calculateWidgetData(orgId, widgetConfig);

    // Update cache
    if (widgetConfig.query.dateRange) {
      await MetricsCalculator.cacheMetric(
        orgId,
        widgetConfig.metricType,
        this.generateCacheKey(widgetConfig),
        data,
        'hourly',
        widgetConfig.query.dateRange.start,
        widgetConfig.query.dateRange.end,
      );
    }
  }
}
