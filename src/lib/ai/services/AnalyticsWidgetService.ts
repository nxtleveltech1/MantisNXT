import { db } from '@/lib/database';
import {
  AIServiceBase,
  type AIServiceBaseOptions,
  type AIServiceRequestOptions,
  type AIServiceResponse,
} from './base';

// ============================================================================
// Types
// ============================================================================

export type WidgetType = 'chart' | 'kpi' | 'table' | 'map';

export type AnalyticsMetricType =
  | 'sales'
  | 'inventory'
  | 'supplier_performance'
  | 'customer_behavior'
  | 'financial'
  | 'operational';

export interface AnalyticsWidget {
  id: string;
  orgId: string;
  dashboardId: string;
  widgetType: WidgetType;
  metricType: AnalyticsMetricType;
  config: Record<string, unknown>;
  query: Record<string, unknown>;
  refreshIntervalSeconds: number;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateWidgetData {
  dashboardId: string;
  widgetType: WidgetType;
  metricType: AnalyticsMetricType;
  config?: Record<string, unknown>;
  query?: Record<string, unknown>;
  refreshIntervalSeconds?: number;
  positionX?: number;
  positionY?: number;
  width?: number;
  height?: number;
}

export interface UpdateWidgetData {
  widgetType?: WidgetType;
  metricType?: AnalyticsMetricType;
  config?: Record<string, unknown>;
  query?: Record<string, unknown>;
  refreshIntervalSeconds?: number;
}

// ============================================================================
// Service Implementation
// ============================================================================

export class AnalyticsWidgetService extends AIServiceBase<AIServiceRequestOptions> {
  constructor(options?: AIServiceBaseOptions) {
    super('AnalyticsWidgetService', options);
  }

  /**
   * Create a new widget
   */
  async createWidget(
    orgId: string,
    data: CreateWidgetData,
    options?: AIServiceRequestOptions,
  ): Promise<AIServiceResponse<AnalyticsWidget>> {
    return this.executeOperation(
      'widget.create',
      async () => {
        // Verify dashboard belongs to org
        const dashboardResult = await db.query(
          `SELECT id FROM analytics_dashboard WHERE id = $1 AND org_id = $2`,
          [data.dashboardId, orgId],
        );

        if (dashboardResult.rows.length === 0) {
          throw new Error(
            `Dashboard ${data.dashboardId} not found or access denied`,
          );
        }

        const result = await db.query(
          `
          INSERT INTO analytics_widget (
            org_id, dashboard_id, widget_type, metric_type,
            config, query, refresh_interval_seconds,
            position_x, position_y, width, height
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING *
          `,
          [
            orgId,
            data.dashboardId,
            data.widgetType,
            data.metricType,
            JSON.stringify(data.config || {}),
            JSON.stringify(data.query || {}),
            data.refreshIntervalSeconds || 300,
            data.positionX || 0,
            data.positionY || 0,
            data.width || 1,
            data.height || 1,
          ],
        );

        return this.mapWidgetRow(result.rows[0]);
      },
      options,
      { orgId, dashboardId: data.dashboardId, widgetType: data.widgetType },
    );
  }

  /**
   * Update an existing widget
   */
  async updateWidget(
    widgetId: string,
    updates: UpdateWidgetData,
    options?: AIServiceRequestOptions,
  ): Promise<AIServiceResponse<AnalyticsWidget>> {
    return this.executeOperation(
      'widget.update',
      async () => {
        const setClauses: string[] = [];
        const values: unknown[] = [];
        let paramIndex = 1;

        if (updates.widgetType !== undefined) {
          setClauses.push(`widget_type = $${paramIndex++}`);
          values.push(updates.widgetType);
        }
        if (updates.metricType !== undefined) {
          setClauses.push(`metric_type = $${paramIndex++}`);
          values.push(updates.metricType);
        }
        if (updates.config !== undefined) {
          setClauses.push(`config = $${paramIndex++}`);
          values.push(JSON.stringify(updates.config));
        }
        if (updates.query !== undefined) {
          setClauses.push(`query = $${paramIndex++}`);
          values.push(JSON.stringify(updates.query));
        }
        if (updates.refreshIntervalSeconds !== undefined) {
          setClauses.push(`refresh_interval_seconds = $${paramIndex++}`);
          values.push(updates.refreshIntervalSeconds);
        }

        if (setClauses.length === 0) {
          throw new Error('No valid updates provided');
        }

        values.push(widgetId);

        const result = await db.query(
          `
          UPDATE analytics_widget
          SET ${setClauses.join(', ')}, updated_at = NOW()
          WHERE id = $${paramIndex}
          RETURNING *
          `,
          values,
        );

        if (result.rows.length === 0) {
          throw new Error(`Widget ${widgetId} not found`);
        }

        return this.mapWidgetRow(result.rows[0]);
      },
      options,
      { widgetId },
    );
  }

  /**
   * Delete a widget
   */
  async deleteWidget(
    widgetId: string,
    options?: AIServiceRequestOptions,
  ): Promise<AIServiceResponse<void>> {
    return this.executeOperation(
      'widget.delete',
      async () => {
        const result = await db.query(
          `
          DELETE FROM analytics_widget
          WHERE id = $1
          RETURNING id
          `,
          [widgetId],
        );

        if (result.rows.length === 0) {
          throw new Error(`Widget ${widgetId} not found`);
        }
      },
      options,
      { widgetId },
    );
  }

  /**
   * Get a single widget by ID
   */
  async getWidget(
    widgetId: string,
    options?: AIServiceRequestOptions,
  ): Promise<AIServiceResponse<AnalyticsWidget>> {
    return this.executeOperation(
      'widget.get',
      async () => {
        const result = await db.query(
          `
          SELECT * FROM analytics_widget
          WHERE id = $1
          `,
          [widgetId],
        );

        if (result.rows.length === 0) {
          throw new Error(`Widget ${widgetId} not found`);
        }

        return this.mapWidgetRow(result.rows[0]);
      },
      options,
      { widgetId },
    );
  }

  /**
   * Get all widgets for a dashboard
   */
  async getWidgetsByDashboard(
    dashboardId: string,
    options?: AIServiceRequestOptions,
  ): Promise<AIServiceResponse<AnalyticsWidget[]>> {
    return this.executeOperation(
      'widget.getByDashboard',
      async () => {
        const result = await db.query(
          `
          SELECT * FROM analytics_widget
          WHERE dashboard_id = $1
          ORDER BY position_y, position_x
          `,
          [dashboardId],
        );

        return result.rows.map((row) => this.mapWidgetRow(row));
      },
      options,
      { dashboardId },
    );
  }

  /**
   * Fetch widget data based on query configuration
   */
  async fetchWidgetData(
    widgetId: string,
    options?: AIServiceRequestOptions,
  ): Promise<AIServiceResponse<unknown>> {
    return this.executeOperation(
      'widget.fetchData',
      async () => {
        // Get widget configuration
        const widgetResult = await db.query(
          `SELECT * FROM analytics_widget WHERE id = $1`,
          [widgetId],
        );

        if (widgetResult.rows.length === 0) {
          throw new Error(`Widget ${widgetId} not found`);
        }

        const widget = this.mapWidgetRow(widgetResult.rows[0]);

        // Execute query based on metric type
        const data = await this.executeWidgetQuery(widget);

        return data;
      },
      options,
      { widgetId },
    );
  }

  /**
   * Refresh widget data (alias for fetchWidgetData)
   */
  async refreshWidget(
    widgetId: string,
    options?: AIServiceRequestOptions,
  ): Promise<AIServiceResponse<unknown>> {
    return this.fetchWidgetData(widgetId, options);
  }

  /**
   * Update widget position
   */
  async updatePosition(
    widgetId: string,
    x: number,
    y: number,
    options?: AIServiceRequestOptions,
  ): Promise<AIServiceResponse<void>> {
    return this.executeOperation(
      'widget.updatePosition',
      async () => {
        const result = await db.query(
          `
          UPDATE analytics_widget
          SET position_x = $1, position_y = $2, updated_at = NOW()
          WHERE id = $3
          RETURNING id
          `,
          [x, y, widgetId],
        );

        if (result.rows.length === 0) {
          throw new Error(`Widget ${widgetId} not found`);
        }
      },
      options,
      { widgetId, x, y },
    );
  }

  /**
   * Update widget size
   */
  async updateSize(
    widgetId: string,
    width: number,
    height: number,
    options?: AIServiceRequestOptions,
  ): Promise<AIServiceResponse<void>> {
    return this.executeOperation(
      'widget.updateSize',
      async () => {
        if (width < 1 || height < 1) {
          throw new Error('Widget dimensions must be at least 1');
        }

        const result = await db.query(
          `
          UPDATE analytics_widget
          SET width = $1, height = $2, updated_at = NOW()
          WHERE id = $3
          RETURNING id
          `,
          [width, height, widgetId],
        );

        if (result.rows.length === 0) {
          throw new Error(`Widget ${widgetId} not found`);
        }
      },
      options,
      { widgetId, width, height },
    );
  }

  /**
   * Execute widget query based on metric type
   */
  private async executeWidgetQuery(
    widget: AnalyticsWidget,
  ): Promise<unknown> {
    const { metricType, query, config } = widget;

    switch (metricType) {
      case 'sales':
        return this.fetchSalesData(widget.orgId, query);
      case 'inventory':
        return this.fetchInventoryData(widget.orgId, query);
      case 'supplier_performance':
        return this.fetchSupplierPerformanceData(widget.orgId, query);
      case 'customer_behavior':
        return this.fetchCustomerBehaviorData(widget.orgId, query);
      case 'financial':
        return this.fetchFinancialData(widget.orgId, query);
      case 'operational':
        return this.fetchOperationalData(widget.orgId, query);
      default:
        throw new Error(`Unsupported metric type: ${metricType}`);
    }
  }

  /**
   * Fetch sales metrics
   */
  private async fetchSalesData(
    orgId: string,
    query: Record<string, unknown>,
  ): Promise<unknown> {
    // Simplified sales query - would be more complex in production
    const result = await db.query(
      `
      SELECT
        COUNT(*) as total_orders,
        SUM(total_amount) as total_revenue,
        AVG(total_amount) as avg_order_value
      FROM orders
      WHERE org_id = $1
        AND created_at >= NOW() - INTERVAL '30 days'
      `,
      [orgId],
    );

    return result.rows[0] || {};
  }

  /**
   * Fetch inventory metrics
   */
  private async fetchInventoryData(
    orgId: string,
    query: Record<string, unknown>,
  ): Promise<unknown> {
    const result = await db.query(
      `
      SELECT
        COUNT(*) as total_products,
        SUM(stock_level) as total_stock,
        COUNT(*) FILTER (WHERE stock_level <= reorder_point) as low_stock_count
      FROM products
      WHERE org_id = $1
      `,
      [orgId],
    );

    return result.rows[0] || {};
  }

  /**
   * Fetch supplier performance metrics
   */
  private async fetchSupplierPerformanceData(
    orgId: string,
    query: Record<string, unknown>,
  ): Promise<unknown> {
    const result = await db.query(
      `
      SELECT
        COUNT(DISTINCT id) as total_suppliers,
        AVG(rating) as avg_rating
      FROM public.suppliers
      WHERE org_id = $1
      `,
      [orgId],
    );

    return result.rows[0] || {};
  }

  /**
   * Fetch customer behavior metrics
   */
  private async fetchCustomerBehaviorData(
    orgId: string,
    query: Record<string, unknown>,
  ): Promise<unknown> {
    const result = await db.query(
      `
      SELECT
        COUNT(DISTINCT id) as total_customers,
        COUNT(DISTINCT id) FILTER (
          WHERE last_order_date >= NOW() - INTERVAL '30 days'
        ) as active_customers
      FROM customers
      WHERE org_id = $1
      `,
      [orgId],
    );

    return result.rows[0] || {};
  }

  /**
   * Fetch financial metrics
   */
  private async fetchFinancialData(
    orgId: string,
    query: Record<string, unknown>,
  ): Promise<unknown> {
    // Placeholder - would integrate with actual financial tables
    return {
      revenue: 0,
      expenses: 0,
      profit: 0,
    };
  }

  /**
   * Fetch operational metrics
   */
  private async fetchOperationalData(
    orgId: string,
    query: Record<string, unknown>,
  ): Promise<unknown> {
    // Placeholder - would integrate with actual operational tables
    return {
      efficiency: 0,
      throughput: 0,
      utilization: 0,
    };
  }

  /**
   * Map database row to AnalyticsWidget
   */
  private mapWidgetRow(row: unknown): AnalyticsWidget {
    return {
      id: row.id,
      orgId: row.org_id,
      dashboardId: row.dashboard_id,
      widgetType: row.widget_type,
      metricType: row.metric_type,
      config: row.config || {},
      query: row.query || {},
      refreshIntervalSeconds: row.refresh_interval_seconds,
      positionX: row.position_x,
      positionY: row.position_y,
      width: row.width,
      height: row.height,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}
