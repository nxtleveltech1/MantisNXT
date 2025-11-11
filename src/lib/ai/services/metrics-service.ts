// @ts-nocheck
/**
 * AI Metrics Service
 *
 * Production-ready service for managing analytics metrics cache.
 * Integrates with analytics_metric_cache table and MetricsCalculator.
 *
 * Features:
 * - Intelligent caching with configurable TTL
 * - Automatic recalculation and invalidation
 * - Multi-metric type support
 * - Performance optimized queries
 * - Production error handling
 */

import { db } from '@/lib/database';
import { MetricsCalculator } from '@/lib/analytics/MetricsCalculator';
import type {
  MetricType,
  TimePeriod,
  SalesMetrics,
  InventoryMetrics,
  SupplierPerformanceMetrics,
} from '@/lib/analytics/MetricsCalculator';

// ============================================================================
// Types & Interfaces
// ============================================================================

export type { MetricType, TimePeriod };

export interface TimeRange {
  startDate: Date;
  endDate: Date;
}

export interface CachedMetric {
  id: string;
  orgId: string;
  metricType: MetricType;
  metricKey: string;
  metricValue: any;
  timePeriod: TimePeriod;
  periodStart: Date;
  periodEnd: Date;
  calculatedAt: Date;
}

export interface MetricOptions {
  period?: TimePeriod;
  fresh?: boolean;
  cacheMaxAge?: number; // seconds
}

export interface MetricsSummary {
  summary: {
    totalPredictions: number;
    averageAccuracy: number;
    activeAlerts: number;
    resolvedAlerts: number;
  };
  byService: Record<string, any>;
  trends: Record<string, any>;
  calculatedAt: string;
  cacheExpires: string;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_CACHE_TTL = 5 * 60; // 5 minutes in seconds
const METRIC_KEYS = {
  sales: 'daily_sales_summary',
  inventory: 'inventory_snapshot',
  supplier_performance: 'supplier_performance_summary',
  customer_behavior: 'customer_behavior_summary',
  financial: 'financial_summary',
  operational: 'operational_summary',
} as const;

// ============================================================================
// AI Metrics Service
// ============================================================================

export class AIMetricsService {
  /**
   * Get metrics with intelligent caching
   *
   * @param orgId - Organization ID
   * @param metricType - Type of metric to retrieve
   * @param options - Optional parameters for period, freshness, and cache control
   * @returns Cached or freshly calculated metrics
   */
  static async getMetrics(
    orgId: string,
    metricType: MetricType,
    options: MetricOptions = {}
  ): Promise<any> {
    const { period = 'daily', fresh = false, cacheMaxAge = DEFAULT_CACHE_TTL } = options;

    // If not requesting fresh data, try to get from cache
    if (!fresh) {
      const cached = await this.getCachedMetric(orgId, metricType, period, cacheMaxAge);
      if (cached) {
        return cached.metricValue;
      }
    }

    // Calculate fresh metrics
    const timeRange = this.getTimeRangeForPeriod(period);
    const metrics = await this.calculateMetric(orgId, metricType, timeRange);

    // Cache the calculated metrics
    await this.cacheMetric(orgId, metricType, metrics, period, timeRange);

    return metrics;
  }

  /**
   * Calculate metrics for a specific type and time range
   *
   * @param orgId - Organization ID
   * @param metricType - Type of metric to calculate
   * @param timeRange - Time range for calculation
   * @returns Calculated metric data
   */
  static async calculateMetric(
    orgId: string,
    metricType: MetricType,
    timeRange: TimeRange
  ): Promise<any> {
    const { startDate, endDate } = timeRange;

    switch (metricType) {
      case 'sales':
        return await MetricsCalculator.calculateSalesMetrics(
          orgId,
          startDate,
          endDate
        );

      case 'inventory':
        return await MetricsCalculator.calculateInventoryMetrics(orgId);

      case 'supplier_performance':
        return await MetricsCalculator.calculateSupplierMetrics(orgId);

      case 'customer_behavior':
        return await this.calculateCustomerBehaviorMetrics(orgId, startDate, endDate);

      case 'financial':
        return await this.calculateFinancialMetrics(orgId, startDate, endDate);

      case 'operational':
        return await this.calculateOperationalMetrics(orgId, startDate, endDate);

      default:
        throw new Error(`Unsupported metric type: ${metricType}`);
    }
  }

  /**
   * Get metrics by specific key
   *
   * @param orgId - Organization ID
   * @param metricType - Type of metric
   * @param key - Specific metric key
   * @returns Metric value or null
   */
  static async getMetricsByKey(
    orgId: string,
    metricType: MetricType,
    key: string
  ): Promise<any | null> {
    const result = await db.query(
      `
      SELECT metric_value, calculated_at
      FROM analytics_metric_cache
      WHERE org_id = $1
        AND metric_type = $2
        AND metric_key = $3
      ORDER BY calculated_at DESC
      LIMIT 1
      `,
      [orgId, metricType, key]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0].metric_value;
  }

  /**
   * Invalidate metric cache for a specific type
   *
   * @param orgId - Organization ID
   * @param metricType - Type of metric to invalidate (optional, invalidates all if not provided)
   * @returns Number of cache entries invalidated
   */
  static async invalidateMetricCache(
    orgId: string,
    metricType?: MetricType
  ): Promise<number> {
    if (metricType) {
      const result = await db.query(
        `
        DELETE FROM analytics_metric_cache
        WHERE org_id = $1 AND metric_type = $2
        RETURNING id
        `,
        [orgId, metricType]
      );
      return result.rows.length;
    } else {
      // Invalidate all metrics for the organization
      const result = await db.query(
        `
        DELETE FROM analytics_metric_cache
        WHERE org_id = $1
        RETURNING id
        `,
        [orgId]
      );
      return result.rows.length;
    }
  }

  /**
   * Recalculate multiple metrics
   *
   * @param orgId - Organization ID
   * @param metricTypes - Array of metric types to recalculate
   * @returns Object with recalculated metrics
   */
  static async recalculateMetrics(
    orgId: string,
    metricTypes: MetricType[]
  ): Promise<Record<MetricType, any>> {
    const results: Record<string, any> = {};

    for (const metricType of metricTypes) {
      // Invalidate existing cache
      await this.invalidateMetricCache(orgId, metricType);

      // Recalculate
      const timeRange = this.getTimeRangeForPeriod('daily');
      const metrics = await this.calculateMetric(orgId, metricType, timeRange);

      // Cache new values
      await this.cacheMetric(orgId, metricType, metrics, 'daily', timeRange);

      results[metricType] = metrics;
    }

    return results;
  }

  /**
   * Get comprehensive metrics summary (for main metrics endpoint)
   *
   * @param orgId - Organization ID
   * @param timeRange - Optional time range
   * @returns Comprehensive metrics summary
   */
  static async getMetricsSummary(
    orgId: string,
    timeRange?: TimeRange
  ): Promise<MetricsSummary> {
    const range = timeRange || this.getTimeRangeForPeriod('daily');

    // Get AI service health metrics
    const aiHealthResult = await db.query(
      `
      SELECT * FROM get_ai_service_health($1)
      `,
      [orgId]
    );

    // Aggregate AI metrics
    let totalPredictions = 0;
    let totalConfidence = 0;
    let activeAlerts = 0;
    const byService: Record<string, any> = {};

    aiHealthResult.rows.forEach((row) => {
      const predictions = parseInt(row.total_predictions || '0');
      const confidence = parseFloat(row.avg_confidence || '0');
      const alerts = parseInt(row.active_alerts || '0');

      totalPredictions += predictions;
      totalConfidence += confidence * predictions;
      activeAlerts += alerts;

      byService[row.service_type] = {
        predictions,
        accuracy: confidence,
        alerts,
        lastPrediction: row.last_prediction,
      };
    });

    const averageAccuracy = totalPredictions > 0
      ? totalConfidence / totalPredictions
      : 0;

    // Get resolved alerts count
    const resolvedAlertsResult = await db.query(
      `
      SELECT COUNT(*) as count
      FROM ai_alert
      WHERE org_id = $1
        AND is_resolved = true
        AND created_at >= $2
        AND created_at <= $3
      `,
      [orgId, range.startDate, range.endDate]
    );

    const resolvedAlerts = parseInt(resolvedAlertsResult.rows[0]?.count || '0');

    // Calculate trends (compare with previous period)
    const previousRange = this.getPreviousPeriod(range);
    const previousHealthResult = await db.query(
      `
      SELECT
        COUNT(DISTINCT id) as predictions,
        AVG(confidence_score) as avg_confidence
      FROM ai_prediction
      WHERE org_id = $1
        AND created_at >= $2
        AND created_at <= $3
      `,
      [orgId, previousRange.startDate, previousRange.endDate]
    );

    const previousPredictions = parseInt(previousHealthResult.rows[0]?.predictions || '0');
    const previousConfidence = parseFloat(previousHealthResult.rows[0]?.avg_confidence || '0');

    const predictionChange = previousPredictions > 0
      ? ((totalPredictions - previousPredictions) / previousPredictions) * 100
      : 0;

    const accuracyChange = previousConfidence > 0
      ? ((averageAccuracy - previousConfidence) / previousConfidence) * 100
      : 0;

    const now = new Date();
    const cacheExpires = new Date(now.getTime() + DEFAULT_CACHE_TTL * 1000);

    return {
      summary: {
        totalPredictions,
        averageAccuracy,
        activeAlerts,
        resolvedAlerts,
      },
      byService,
      trends: {
        predictions: {
          change: predictionChange,
          direction: predictionChange > 0 ? 'increasing' : predictionChange < 0 ? 'decreasing' : 'stable',
        },
        accuracy: {
          change: accuracyChange,
          direction: accuracyChange > 0 ? 'improving' : accuracyChange < 0 ? 'declining' : 'stable',
        },
      },
      calculatedAt: now.toISOString(),
      cacheExpires: cacheExpires.toISOString(),
    };
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Get cached metric from database
   */
  private static async getCachedMetric(
    orgId: string,
    metricType: MetricType,
    period: TimePeriod,
    maxAge: number
  ): Promise<CachedMetric | null> {
    const result = await db.query(
      `
      SELECT *
      FROM analytics_metric_cache
      WHERE org_id = $1
        AND metric_type = $2
        AND time_period = $3
        AND calculated_at >= NOW() - INTERVAL '1 second' * $4
      ORDER BY calculated_at DESC
      LIMIT 1
      `,
      [orgId, metricType, period, maxAge]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      orgId: row.org_id,
      metricType: row.metric_type,
      metricKey: row.metric_key,
      metricValue: row.metric_value,
      timePeriod: row.time_period,
      periodStart: new Date(row.period_start),
      periodEnd: new Date(row.period_end),
      calculatedAt: new Date(row.calculated_at),
    };
  }

  /**
   * Cache metric in database
   */
  private static async cacheMetric(
    orgId: string,
    metricType: MetricType,
    metricValue: any,
    period: TimePeriod,
    timeRange: TimeRange
  ): Promise<void> {
    const metricKey = METRIC_KEYS[metricType] || `${metricType}_summary`;

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
        metricType,
        metricKey,
        JSON.stringify(metricValue),
        period,
        timeRange.startDate,
        timeRange.endDate,
      ]
    );
  }

  /**
   * Get time range for a given period
   */
  private static getTimeRangeForPeriod(period: TimePeriod): TimeRange {
    const now = new Date();
    const endDate = new Date(now);
    let startDate = new Date(now);

    switch (period) {
      case 'hourly':
        startDate.setHours(now.getHours(), 0, 0, 0);
        endDate.setHours(now.getHours(), 59, 59, 999);
        break;

      case 'daily':
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;

      case 'weekly':
        const dayOfWeek = now.getDay();
        startDate.setDate(now.getDate() - dayOfWeek);
        startDate.setHours(0, 0, 0, 0);
        endDate.setDate(now.getDate() + (6 - dayOfWeek));
        endDate.setHours(23, 59, 59, 999);
        break;

      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        break;

      case 'quarterly':
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1, 0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), quarter * 3 + 3, 0, 23, 59, 59, 999);
        break;

      case 'yearly':
        startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        break;
    }

    return { startDate, endDate };
  }

  /**
   * Get previous period for trend calculation
   */
  private static getPreviousPeriod(timeRange: TimeRange): TimeRange {
    const duration = timeRange.endDate.getTime() - timeRange.startDate.getTime();
    return {
      startDate: new Date(timeRange.startDate.getTime() - duration),
      endDate: new Date(timeRange.endDate.getTime() - duration),
    };
  }

  /**
   * Calculate customer behavior metrics
   */
  private static async calculateCustomerBehaviorMetrics(
    orgId: string,
    startDate: Date,
    endDate: Date
  ): Promise<any> {
    const result = await db.query(
      `
      WITH customer_stats AS (
        SELECT
          COUNT(DISTINCT c.id) as total_customers,
          COUNT(DISTINCT c.id) FILTER (
            WHERE c.last_order_date >= $2
          ) as active_customers,
          COUNT(DISTINCT o.id) as total_orders,
          COALESCE(AVG(o.total_amount), 0) as avg_order_value
        FROM customers c
        LEFT JOIN orders o ON o.customer_id = c.id
          AND o.created_at BETWEEN $2 AND $3
        WHERE c.org_id = $1
      )
      SELECT * FROM customer_stats
      `,
      [orgId, startDate, endDate]
    );

    const row = result.rows[0] || {};
    return {
      totalCustomers: parseInt(row.total_customers || '0'),
      activeCustomers: parseInt(row.active_customers || '0'),
      totalOrders: parseInt(row.total_orders || '0'),
      avgOrderValue: parseFloat(row.avg_order_value || '0'),
      retentionRate: row.total_customers > 0
        ? (parseInt(row.active_customers || '0') / parseInt(row.total_customers || '1')) * 100
        : 0,
    };
  }

  /**
   * Calculate financial metrics
   */
  private static async calculateFinancialMetrics(
    orgId: string,
    startDate: Date,
    endDate: Date
  ): Promise<any> {
    const result = await db.query(
      `
      WITH financial_data AS (
        SELECT
          COALESCE(SUM(o.total_amount), 0) as revenue,
          COALESCE(SUM(po.total_amount), 0) as expenses,
          COUNT(DISTINCT o.id) as order_count,
          COUNT(DISTINCT po.id) as purchase_count
        FROM orders o
        FULL OUTER JOIN purchase_orders po ON po.org_id = o.org_id
        WHERE (o.org_id = $1 OR po.org_id = $1)
          AND (o.created_at BETWEEN $2 AND $3 OR po.created_at BETWEEN $2 AND $3)
          AND (o.status = 'completed' OR po.status = 'completed')
      )
      SELECT * FROM financial_data
      `,
      [orgId, startDate, endDate]
    );

    const row = result.rows[0] || {};
    const revenue = parseFloat(row.revenue || '0');
    const expenses = parseFloat(row.expenses || '0');
    const profit = revenue - expenses;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

    return {
      revenue,
      expenses,
      profit,
      margin,
      orderCount: parseInt(row.order_count || '0'),
      purchaseCount: parseInt(row.purchase_count || '0'),
    };
  }

  /**
   * Calculate operational metrics
   */
  private static async calculateOperationalMetrics(
    orgId: string,
    startDate: Date,
    endDate: Date
  ): Promise<any> {
    const result = await db.query(
      `
      WITH operational_data AS (
        SELECT
          COUNT(DISTINCT o.id) as total_orders,
          COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'completed') as completed_orders,
          COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'cancelled') as cancelled_orders,
          COALESCE(AVG(EXTRACT(EPOCH FROM (o.updated_at - o.created_at))), 0) as avg_processing_time
        FROM orders o
        WHERE o.org_id = $1
          AND o.created_at BETWEEN $2 AND $3
      )
      SELECT * FROM operational_data
      `,
      [orgId, startDate, endDate]
    );

    const row = result.rows[0] || {};
    const totalOrders = parseInt(row.total_orders || '0');
    const completedOrders = parseInt(row.completed_orders || '0');
    const cancelledOrders = parseInt(row.cancelled_orders || '0');

    return {
      totalOrders,
      completedOrders,
      cancelledOrders,
      completionRate: totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0,
      cancellationRate: totalOrders > 0 ? (cancelledOrders / totalOrders) * 100 : 0,
      avgProcessingTime: parseFloat(row.avg_processing_time || '0'),
      efficiency: totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0,
    };
  }
}

export default AIMetricsService;
