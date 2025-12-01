import { db } from '@/lib/database';
import {
  AIServiceBase,
  type AIServiceBaseOptions,
  type AIServiceRequestOptions,
  type AIServiceResponse,
} from './base';
import type { AnalyticsMetricType } from './AnalyticsWidgetService';

// ============================================================================
// Types
// ============================================================================

export type TimePeriod = 'hourly' | 'daily' | 'weekly' | 'monthly';

export interface CachedMetric {
  id: string;
  orgId: string;
  metricType: AnalyticsMetricType;
  metricKey: string;
  metricValue: Record<string, unknown>;
  timePeriod: TimePeriod;
  periodStart: Date;
  periodEnd: Date;
  calculatedAt: Date;
}

export interface CacheMetricData {
  metricType: AnalyticsMetricType;
  metricKey: string;
  metricValue: Record<string, unknown>;
  timePeriod: TimePeriod;
  periodStart: Date;
  periodEnd: Date;
}

// ============================================================================
// Service Implementation
// ============================================================================

export class MetricsCacheService extends AIServiceBase<AIServiceRequestOptions> {
  constructor(options?: AIServiceBaseOptions) {
    super('MetricsCacheService', options);
  }

  /**
   * Set a cached metric (upsert)
   */
  async setCachedMetric(
    orgId: string,
    data: CacheMetricData,
    options?: AIServiceRequestOptions
  ): Promise<AIServiceResponse<void>> {
    return this.executeOperation(
      'cache.set',
      async () => {
        // Use upsert (INSERT ... ON CONFLICT UPDATE)
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
            period_end = EXCLUDED.period_end,
            calculated_at = NOW()
          `,
          [
            orgId,
            data.metricType,
            data.metricKey,
            JSON.stringify(data.metricValue),
            data.timePeriod,
            data.periodStart,
            data.periodEnd,
          ]
        );
      },
      options,
      {
        orgId,
        metricType: data.metricType,
        metricKey: data.metricKey,
      }
    );
  }

  /**
   * Get a cached metric
   */
  async getCachedMetric(
    orgId: string,
    metricType: AnalyticsMetricType,
    metricKey: string,
    options?: AIServiceRequestOptions
  ): Promise<AIServiceResponse<Record<string, unknown> | null>> {
    return this.executeOperation(
      'cache.get',
      async () => {
        const result = await db.query(
          `
          SELECT metric_value
          FROM analytics_metric_cache
          WHERE org_id = $1
            AND metric_type = $2
            AND metric_key = $3
          ORDER BY period_start DESC
          LIMIT 1
          `,
          [orgId, metricType, metricKey]
        );

        if (result.rows.length === 0) {
          return null;
        }

        return result.rows[0].metric_value || null;
      },
      options,
      { orgId, metricType, metricKey }
    );
  }

  /**
   * Invalidate cache for a specific metric type
   */
  async invalidateCache(
    orgId: string,
    metricType: AnalyticsMetricType,
    options?: AIServiceRequestOptions
  ): Promise<AIServiceResponse<number>> {
    return this.executeOperation(
      'cache.invalidate',
      async () => {
        const result = await db.query(
          `
          DELETE FROM analytics_metric_cache
          WHERE org_id = $1 AND metric_type = $2
          RETURNING id
          `,
          [orgId, metricType]
        );

        return result.rows.length;
      },
      options,
      { orgId, metricType }
    );
  }

  /**
   * Get metrics by time period
   */
  async getMetricsByPeriod(
    orgId: string,
    metricType: AnalyticsMetricType,
    period: TimePeriod,
    options?: AIServiceRequestOptions
  ): Promise<AIServiceResponse<CachedMetric[]>> {
    return this.executeOperation(
      'cache.getByPeriod',
      async () => {
        const result = await db.query(
          `
          SELECT *
          FROM analytics_metric_cache
          WHERE org_id = $1
            AND metric_type = $2
            AND time_period = $3
          ORDER BY period_start DESC
          LIMIT 100
          `,
          [orgId, metricType, period]
        );

        return result.rows.map(row => this.mapCachedMetricRow(row));
      },
      options,
      { orgId, metricType, period }
    );
  }

  /**
   * Get latest metrics for all types
   */
  async getLatestMetrics(
    orgId: string,
    options?: AIServiceRequestOptions
  ): Promise<AIServiceResponse<CachedMetric[]>> {
    return this.executeOperation(
      'cache.getLatest',
      async () => {
        const result = await db.query(
          `
          SELECT DISTINCT ON (metric_type, metric_key) *
          FROM analytics_metric_cache
          WHERE org_id = $1
          ORDER BY metric_type, metric_key, calculated_at DESC
          `,
          [orgId]
        );

        return result.rows.map(row => this.mapCachedMetricRow(row));
      },
      options,
      { orgId }
    );
  }

  /**
   * Clean up old cached metrics
   */
  async cleanupOldCache(
    daysOld: number,
    options?: AIServiceRequestOptions
  ): Promise<AIServiceResponse<number>> {
    return this.executeOperation(
      'cache.cleanup',
      async () => {
        const result = await db.query(
          `
          DELETE FROM analytics_metric_cache
          WHERE calculated_at < NOW() - INTERVAL '1 day' * $1
          RETURNING id
          `,
          [daysOld]
        );

        return result.rows.length;
      },
      options,
      { daysOld }
    );
  }

  /**
   * Recalculate metrics for specific types
   */
  async recalculateMetrics(
    orgId: string,
    metricTypes: AnalyticsMetricType[],
    options?: AIServiceRequestOptions
  ): Promise<AIServiceResponse<void>> {
    return this.executeOperation(
      'cache.recalculate',
      async () => {
        // First, invalidate existing cache for these types
        for (const metricType of metricTypes) {
          await db.query(
            `
            DELETE FROM analytics_metric_cache
            WHERE org_id = $1 AND metric_type = $2
            `,
            [orgId, metricType]
          );
        }

        // Then recalculate each metric type
        for (const metricType of metricTypes) {
          await this.calculateMetric(orgId, metricType);
        }
      },
      options,
      { orgId, metricTypes }
    );
  }

  /**
   * Calculate and cache a specific metric type
   */
  private async calculateMetric(orgId: string, metricType: AnalyticsMetricType): Promise<void> {
    const now = new Date();
    const periodStart = new Date(now);
    periodStart.setHours(0, 0, 0, 0);

    const periodEnd = new Date(now);
    periodEnd.setHours(23, 59, 59, 999);

    let metricValue: Record<string, unknown> = {};

    switch (metricType) {
      case 'sales':
        metricValue = await this.calculateSalesMetrics(orgId, periodStart, periodEnd);
        break;
      case 'inventory':
        metricValue = await this.calculateInventoryMetrics(orgId);
        break;
      case 'supplier_performance':
        metricValue = await this.calculateSupplierMetrics(orgId, periodStart, periodEnd);
        break;
      case 'customer_behavior':
        metricValue = await this.calculateCustomerMetrics(orgId, periodStart, periodEnd);
        break;
      case 'financial':
        metricValue = await this.calculateFinancialMetrics(orgId, periodStart, periodEnd);
        break;
      case 'operational':
        metricValue = await this.calculateOperationalMetrics(orgId, periodStart, periodEnd);
        break;
    }

    // Cache the calculated metric
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
      [
        orgId,
        metricType,
        'daily_summary',
        JSON.stringify(metricValue),
        'daily',
        periodStart,
        periodEnd,
      ]
    );
  }

  /**
   * Calculate sales metrics
   */
  private async calculateSalesMetrics(
    orgId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<Record<string, unknown>> {
    const result = await db.query(
      `
      SELECT
        COUNT(*) as order_count,
        COALESCE(SUM(total_amount), 0) as total_revenue,
        COALESCE(AVG(total_amount), 0) as avg_order_value,
        COUNT(DISTINCT customer_id) as unique_customers
      FROM orders
      WHERE org_id = $1
        AND created_at >= $2
        AND created_at <= $3
      `,
      [orgId, periodStart, periodEnd]
    );

    const row = result.rows[0] || {};
    return {
      orderCount: parseInt(row.order_count || '0'),
      totalRevenue: parseFloat(row.total_revenue || '0'),
      avgOrderValue: parseFloat(row.avg_order_value || '0'),
      uniqueCustomers: parseInt(row.unique_customers || '0'),
    };
  }

  /**
   * Calculate inventory metrics
   */
  private async calculateInventoryMetrics(orgId: string): Promise<Record<string, unknown>> {
    const result = await db.query(
      `
      SELECT
        COUNT(*) as total_products,
        COALESCE(SUM(stock_level), 0) as total_stock_units,
        COUNT(*) FILTER (WHERE stock_level <= reorder_point) as low_stock_count,
        COUNT(*) FILTER (WHERE stock_level = 0) as out_of_stock_count
      FROM products
      WHERE org_id = $1
      `,
      [orgId]
    );

    const row = result.rows[0] || {};
    return {
      totalProducts: parseInt(row.total_products || '0'),
      totalStockUnits: parseFloat(row.total_stock_units || '0'),
      lowStockCount: parseInt(row.low_stock_count || '0'),
      outOfStockCount: parseInt(row.out_of_stock_count || '0'),
    };
  }

  /**
   * Calculate supplier performance metrics
   */
  private async calculateSupplierMetrics(
    orgId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<Record<string, unknown>> {
    const result = await db.query(
      `
      SELECT
        COUNT(DISTINCT s.id) as total_suppliers,
        COALESCE(AVG(s.rating), 0) as avg_rating,
        COUNT(DISTINCT po.id) as purchase_orders
      FROM public.suppliers s
      LEFT JOIN purchase_orders po ON po.supplier_id = s.id
        AND po.created_at >= $2
        AND po.created_at <= $3
      WHERE s.org_id = $1
      GROUP BY s.org_id
      `,
      [orgId, periodStart, periodEnd]
    );

    const row = result.rows[0] || {};
    return {
      totalSuppliers: parseInt(row.total_suppliers || '0'),
      avgRating: parseFloat(row.avg_rating || '0'),
      purchaseOrders: parseInt(row.purchase_orders || '0'),
    };
  }

  /**
   * Calculate customer behavior metrics
   */
  private async calculateCustomerMetrics(
    orgId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<Record<string, unknown>> {
    const result = await db.query(
      `
      SELECT
        COUNT(DISTINCT id) as total_customers,
        COUNT(DISTINCT id) FILTER (
          WHERE last_order_date >= $2
        ) as active_customers
      FROM customers
      WHERE org_id = $1
      `,
      [orgId, periodStart]
    );

    const row = result.rows[0] || {};
    return {
      totalCustomers: parseInt(row.total_customers || '0'),
      activeCustomers: parseInt(row.active_customers || '0'),
    };
  }

  /**
   * Calculate financial metrics
   */
  private async calculateFinancialMetrics(
    orgId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<Record<string, unknown>> {
    // Placeholder - would integrate with actual financial data
    return {
      revenue: 0,
      expenses: 0,
      profit: 0,
      margin: 0,
    };
  }

  /**
   * Calculate operational metrics
   */
  private async calculateOperationalMetrics(
    orgId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<Record<string, unknown>> {
    // Placeholder - would integrate with actual operational data
    return {
      efficiency: 0,
      throughput: 0,
      utilization: 0,
    };
  }

  /**
   * Map database row to CachedMetric
   */
  private mapCachedMetricRow(row: unknown): CachedMetric {
    return {
      id: row.id,
      orgId: row.org_id,
      metricType: row.metric_type,
      metricKey: row.metric_key,
      metricValue: row.metric_value || {},
      timePeriod: row.time_period,
      periodStart: new Date(row.period_start),
      periodEnd: new Date(row.period_end),
      calculatedAt: new Date(row.calculated_at),
    };
  }
}
