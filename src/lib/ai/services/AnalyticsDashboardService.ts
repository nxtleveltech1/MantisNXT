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

export interface AnalyticsDashboard {
  id: string;
  orgId: string;
  name: string;
  description?: string;
  layout: Array<{
    widgetId: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
  filters: Record<string, unknown>;
  isDefault: boolean;
  isShared: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDashboardData {
  name: string;
  description?: string;
  layout?: Array<{
    widgetId: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
  filters?: Record<string, unknown>;
  isDefault?: boolean;
  isShared?: boolean;
  createdBy: string;
}

export interface UpdateDashboardData {
  name?: string;
  description?: string;
  filters?: Record<string, unknown>;
  isDefault?: boolean;
  isShared?: boolean;
}

// ============================================================================
// Service Implementation
// ============================================================================

export class AnalyticsDashboardService extends AIServiceBase<AIServiceRequestOptions> {
  constructor(options?: AIServiceBaseOptions) {
    super('AnalyticsDashboardService', options);
  }

  /**
   * Create a new dashboard
   */
  async createDashboard(
    orgId: string,
    data: CreateDashboardData,
    options?: AIServiceRequestOptions,
  ): Promise<AIServiceResponse<AnalyticsDashboard>> {
    return this.executeOperation(
      'dashboard.create',
      async () => {
        // If this is set as default, unset any existing default
        if (data.isDefault) {
          await db.query(
            `
            UPDATE analytics_dashboard
            SET is_default = false
            WHERE org_id = $1 AND is_default = true
            `,
            [orgId],
          );
        }

        const result = await db.query(
          `
          INSERT INTO analytics_dashboard (
            org_id, name, description, layout, filters,
            is_default, is_shared, created_by
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING *
          `,
          [
            orgId,
            data.name,
            data.description,
            JSON.stringify(data.layout || []),
            JSON.stringify(data.filters || {}),
            data.isDefault || false,
            data.isShared || false,
            data.createdBy,
          ],
        );

        return this.mapDashboardRow(result.rows[0]);
      },
      options,
      { orgId, name: data.name },
    );
  }

  /**
   * Update an existing dashboard
   */
  async updateDashboard(
    dashboardId: string,
    updates: UpdateDashboardData,
    options?: AIServiceRequestOptions,
  ): Promise<AIServiceResponse<AnalyticsDashboard>> {
    return this.executeOperation(
      'dashboard.update',
      async () => {
        const setClauses: string[] = [];
        const values: unknown[] = [];
        let paramIndex = 1;

        if (updates.name !== undefined) {
          setClauses.push(`name = $${paramIndex++}`);
          values.push(updates.name);
        }
        if (updates.description !== undefined) {
          setClauses.push(`description = $${paramIndex++}`);
          values.push(updates.description);
        }
        if (updates.filters !== undefined) {
          setClauses.push(`filters = $${paramIndex++}`);
          values.push(JSON.stringify(updates.filters));
        }
        if (updates.isShared !== undefined) {
          setClauses.push(`is_shared = $${paramIndex++}`);
          values.push(updates.isShared);
        }

        // Handle is_default separately to unset other defaults
        if (updates.isDefault === true) {
          // Get the org_id for this dashboard
          const orgResult = await db.query(
            `SELECT org_id FROM analytics_dashboard WHERE id = $1`,
            [dashboardId],
          );

          if (orgResult.rows.length > 0) {
            const orgId = orgResult.rows[0].org_id;
            await db.query(
              `
              UPDATE analytics_dashboard
              SET is_default = false
              WHERE org_id = $1 AND is_default = true AND id != $2
              `,
              [orgId, dashboardId],
            );
          }

          setClauses.push(`is_default = $${paramIndex++}`);
          values.push(true);
        } else if (updates.isDefault === false) {
          setClauses.push(`is_default = $${paramIndex++}`);
          values.push(false);
        }

        if (setClauses.length === 0) {
          throw new Error('No valid updates provided');
        }

        values.push(dashboardId);

        const result = await db.query(
          `
          UPDATE analytics_dashboard
          SET ${setClauses.join(', ')}, updated_at = NOW()
          WHERE id = $${paramIndex}
          RETURNING *
          `,
          values,
        );

        if (result.rows.length === 0) {
          throw new Error(`Dashboard ${dashboardId} not found`);
        }

        return this.mapDashboardRow(result.rows[0]);
      },
      options,
      { dashboardId },
    );
  }

  /**
   * Delete a dashboard
   */
  async deleteDashboard(
    dashboardId: string,
    options?: AIServiceRequestOptions,
  ): Promise<AIServiceResponse<void>> {
    return this.executeOperation(
      'dashboard.delete',
      async () => {
        const result = await db.query(
          `
          DELETE FROM analytics_dashboard
          WHERE id = $1
          RETURNING id
          `,
          [dashboardId],
        );

        if (result.rows.length === 0) {
          throw new Error(`Dashboard ${dashboardId} not found`);
        }
      },
      options,
      { dashboardId },
    );
  }

  /**
   * Get a single dashboard by ID
   */
  async getDashboard(
    dashboardId: string,
    options?: AIServiceRequestOptions,
  ): Promise<AIServiceResponse<AnalyticsDashboard>> {
    return this.executeOperation(
      'dashboard.get',
      async () => {
        const result = await db.query(
          `
          SELECT * FROM analytics_dashboard
          WHERE id = $1
          `,
          [dashboardId],
        );

        if (result.rows.length === 0) {
          throw new Error(`Dashboard ${dashboardId} not found`);
        }

        return this.mapDashboardRow(result.rows[0]);
      },
      options,
      { dashboardId },
    );
  }

  /**
   * List all dashboards for an organization
   */
  async listDashboards(
    orgId: string,
    options?: AIServiceRequestOptions,
  ): Promise<AIServiceResponse<AnalyticsDashboard[]>> {
    return this.executeOperation(
      'dashboard.list',
      async () => {
        const result = await db.query(
          `
          SELECT * FROM analytics_dashboard
          WHERE org_id = $1
          ORDER BY is_default DESC, name ASC
          `,
          [orgId],
        );

        return result.rows.map((row) => this.mapDashboardRow(row));
      },
      options,
      { orgId },
    );
  }

  /**
   * Get dashboards created by a specific user
   */
  async getUserDashboards(
    userId: string,
    options?: AIServiceRequestOptions,
  ): Promise<AIServiceResponse<AnalyticsDashboard[]>> {
    return this.executeOperation(
      'dashboard.getByUser',
      async () => {
        const result = await db.query(
          `
          SELECT * FROM analytics_dashboard
          WHERE created_by = $1
          ORDER BY created_at DESC
          `,
          [userId],
        );

        return result.rows.map((row) => this.mapDashboardRow(row));
      },
      options,
      { userId },
    );
  }

  /**
   * Get the default dashboard for an organization
   */
  async getDefaultDashboard(
    orgId: string,
    options?: AIServiceRequestOptions,
  ): Promise<AIServiceResponse<AnalyticsDashboard | null>> {
    return this.executeOperation(
      'dashboard.getDefault',
      async () => {
        const result = await db.query(
          `
          SELECT * FROM analytics_dashboard
          WHERE org_id = $1 AND is_default = true
          LIMIT 1
          `,
          [orgId],
        );

        if (result.rows.length === 0) {
          return null;
        }

        return this.mapDashboardRow(result.rows[0]);
      },
      options,
      { orgId },
    );
  }

  /**
   * Share a dashboard (make it visible to all users in org)
   */
  async shareDashboard(
    dashboardId: string,
    options?: AIServiceRequestOptions,
  ): Promise<AIServiceResponse<void>> {
    return this.executeOperation(
      'dashboard.share',
      async () => {
        const result = await db.query(
          `
          UPDATE analytics_dashboard
          SET is_shared = true, updated_at = NOW()
          WHERE id = $1
          RETURNING id
          `,
          [dashboardId],
        );

        if (result.rows.length === 0) {
          throw new Error(`Dashboard ${dashboardId} not found`);
        }
      },
      options,
      { dashboardId },
    );
  }

  /**
   * Unshare a dashboard (make it private)
   */
  async unshareDashboard(
    dashboardId: string,
    options?: AIServiceRequestOptions,
  ): Promise<AIServiceResponse<void>> {
    return this.executeOperation(
      'dashboard.unshare',
      async () => {
        const result = await db.query(
          `
          UPDATE analytics_dashboard
          SET is_shared = false, updated_at = NOW()
          WHERE id = $1
          RETURNING id
          `,
          [dashboardId],
        );

        if (result.rows.length === 0) {
          throw new Error(`Dashboard ${dashboardId} not found`);
        }
      },
      options,
      { dashboardId },
    );
  }

  /**
   * Update dashboard layout
   */
  async updateLayout(
    dashboardId: string,
    layout: Array<{
      widgetId: string;
      x: number;
      y: number;
      width: number;
      height: number;
    }>,
    options?: AIServiceRequestOptions,
  ): Promise<AIServiceResponse<void>> {
    return this.executeOperation(
      'dashboard.updateLayout',
      async () => {
        const result = await db.query(
          `
          UPDATE analytics_dashboard
          SET layout = $1, updated_at = NOW()
          WHERE id = $2
          RETURNING id
          `,
          [JSON.stringify(layout), dashboardId],
        );

        if (result.rows.length === 0) {
          throw new Error(`Dashboard ${dashboardId} not found`);
        }
      },
      options,
      { dashboardId, widgetCount: layout.length },
    );
  }

  /**
   * Map database row to AnalyticsDashboard
   */
  private mapDashboardRow(row: unknown): AnalyticsDashboard {
    return {
      id: row.id,
      orgId: row.org_id,
      name: row.name,
      description: row.description,
      layout: row.layout || [],
      filters: row.filters || {},
      isDefault: row.is_default,
      isShared: row.is_shared,
      createdBy: row.created_by,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}
