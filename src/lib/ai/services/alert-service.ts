/**
 * AI Alert Service
 * Production service for managing AI-generated alerts
 *
 * Features:
 * - List alerts with filtering and pagination
 * - Create new alerts with validation
 * - Acknowledge and resolve alerts
 * - Alert statistics and aggregations
 * - Full tenant isolation via RLS
 */

import { query, withTransaction } from '../../database/index';
import { AlertError } from '../errors';
import type { PoolClient } from 'pg';

// ============================================================================
// TYPES
// ============================================================================

export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low';
export type AlertStatus = 'pending' | 'acknowledged' | 'resolved' | 'dismissed';
export type AIServiceType =
  | 'demand_forecasting'
  | 'anomaly_detection'
  | 'supplier_scoring'
  | 'assistant';

export interface Alert {
  id: string;
  org_id: string;
  service_type: AIServiceType;
  severity: AlertSeverity;
  title: string;
  message: string;
  recommendations?: Record<string, unknown>[];
  entity_type?: string;
  entity_id?: string;
  is_acknowledged: boolean;
  acknowledged_by?: string;
  acknowledged_at?: Date;
  is_resolved: boolean;
  resolved_at?: Date;
  created_at: Date;
  metadata?: Record<string, unknown>;
}

export interface CreateAlertInput {
  serviceType: AIServiceType;
  severity: AlertSeverity;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  recommendations?: Record<string, unknown>[];
}

export interface ListAlertsFilters {
  severity?: AlertSeverity | AlertSeverity[];
  status?: AlertStatus;
  serviceType?: AIServiceType;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface AlertStats {
  total: number;
  by_severity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  by_status: {
    pending: number;
    acknowledged: number;
    resolved: number;
  };
  by_service: Record<string, number>;
  unresolved_count: number;
  acknowledged_count: number;
}

// ============================================================================
// ALERT SERVICE CLASS
// ============================================================================

export class AIAlertService {
  /**
   * List alerts with optional filters and pagination
   */
  async listAlerts(
    orgId: string,
    filters: ListAlertsFilters = {}
  ): Promise<{ alerts: Alert[]; total: number }> {
    try {
      // Build WHERE conditions
      const conditions: string[] = ['org_id = $1'];
      const params: unknown[] = [orgId];
      let paramIndex = 2;

      // Severity filter (supports single or array)
      if (filters.severity) {
        if (Array.isArray(filters.severity)) {
          conditions.push(`severity = ANY($${paramIndex})`);
          params.push(filters.severity);
        } else {
          conditions.push(`severity = $${paramIndex}`);
          params.push(filters.severity);
        }
        paramIndex++;
      }

      // Status filter
      if (filters.status) {
        switch (filters.status) {
          case 'pending':
            conditions.push('is_acknowledged = false AND is_resolved = false');
            break;
          case 'acknowledged':
            conditions.push('is_acknowledged = true AND is_resolved = false');
            break;
          case 'resolved':
            conditions.push('is_resolved = true');
            break;
          case 'dismissed':
            // Dismissed could be a custom status in metadata or a separate field
            // For now, treating as metadata-based
            conditions.push("metadata->>'status' = 'dismissed'");
            break;
        }
      }

      // Service type filter
      if (filters.serviceType) {
        conditions.push(`service_type = $${paramIndex}`);
        params.push(filters.serviceType);
        paramIndex++;
      }

      // Date range filters
      if (filters.startDate) {
        conditions.push(`created_at >= $${paramIndex}`);
        params.push(filters.startDate);
        paramIndex++;
      }

      if (filters.endDate) {
        conditions.push(`created_at <= $${paramIndex}`);
        params.push(filters.endDate);
        paramIndex++;
      }

      const whereClause = conditions.join(' AND ');

      // Get total count
      const countResult = await query<{ count: string }>(
        `SELECT COUNT(*) as count FROM ai_alert WHERE ${whereClause}`,
        params
      );
      const total = parseInt(countResult.rows[0]?.count || '0', 10);

      // Get paginated alerts
      const limit = filters.limit ?? 50;
      const offset = filters.offset ?? 0;

      const alertsResult = await query<Alert>(
        `
        SELECT
          id,
          org_id,
          service_type,
          severity,
          title,
          message,
          recommendations,
          entity_type,
          entity_id,
          is_acknowledged,
          acknowledged_by,
          acknowledged_at,
          is_resolved,
          resolved_at,
          created_at,
          metadata
        FROM ai_alert
        WHERE ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `,
        [...params, limit, offset]
      );

      return {
        alerts: alertsResult.rows,
        total,
      };
    } catch (error) {
      console.error('Error listing alerts:', error);
      throw new AlertError(
        `Failed to list alerts: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get a single alert by ID
   */
  async getAlertById(alertId: string, orgId: string): Promise<Alert> {
    try {
      const result = await query<Alert>(
        `
        SELECT
          id,
          org_id,
          service_type,
          severity,
          title,
          message,
          recommendations,
          entity_type,
          entity_id,
          is_acknowledged,
          acknowledged_by,
          acknowledged_at,
          is_resolved,
          resolved_at,
          created_at,
          metadata
        FROM ai_alert
        WHERE id = $1 AND org_id = $2
        `,
        [alertId, orgId]
      );

      if (result.rowCount === 0) {
        throw new AlertError(`Alert not found: ${alertId}`);
      }

      return result.rows[0];
    } catch (error) {
      if (error instanceof AlertError) throw error;

      console.error('Error fetching alert:', error);
      throw new AlertError(
        `Failed to fetch alert: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Create a new alert
   */
  async createAlert(orgId: string, data: CreateAlertInput): Promise<Alert> {
    try {
      const result = await query<Alert>(
        `
        INSERT INTO ai_alert (
          org_id,
          service_type,
          severity,
          title,
          message,
          entity_type,
          entity_id,
          metadata,
          recommendations
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING
          id,
          org_id,
          service_type,
          severity,
          title,
          message,
          recommendations,
          entity_type,
          entity_id,
          is_acknowledged,
          acknowledged_by,
          acknowledged_at,
          is_resolved,
          resolved_at,
          created_at,
          metadata
        `,
        [
          orgId,
          data.serviceType,
          data.severity,
          data.title,
          data.message,
          data.entityType ?? null,
          data.entityId ?? null,
          data.metadata ? JSON.stringify(data.metadata) : '{}',
          data.recommendations ? JSON.stringify(data.recommendations) : '[]',
        ]
      );

      if (result.rowCount === 0) {
        throw new AlertError('Failed to create alert');
      }

      return result.rows[0];
    } catch (error) {
      console.error('Error creating alert:', error);
      throw new AlertError(
        `Failed to create alert: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(
    alertId: string,
    userId: string,
    orgId: string
  ): Promise<Alert> {
    try {
      return await withTransaction(async (client: PoolClient) => {
        // First verify the alert exists and belongs to the org
        const checkResult = await client.query<{ is_acknowledged: boolean }>(
          'SELECT is_acknowledged FROM ai_alert WHERE id = $1 AND org_id = $2',
          [alertId, orgId]
        );

        if (checkResult.rowCount === 0) {
          throw new AlertError(`Alert not found: ${alertId}`);
        }

        if (checkResult.rows[0].is_acknowledged) {
          throw new AlertError(`Alert already acknowledged: ${alertId}`);
        }

        // Update the alert
        const result = await client.query<Alert>(
          `
          UPDATE ai_alert
          SET
            is_acknowledged = true,
            acknowledged_by = $1,
            acknowledged_at = NOW()
          WHERE id = $2 AND org_id = $3
          RETURNING
            id,
            org_id,
            service_type,
            severity,
            title,
            message,
            recommendations,
            entity_type,
            entity_id,
            is_acknowledged,
            acknowledged_by,
            acknowledged_at,
            is_resolved,
            resolved_at,
            created_at,
            metadata
          `,
          [userId, alertId, orgId]
        );

        if (result.rowCount === 0) {
          throw new AlertError('Failed to acknowledge alert');
        }

        return result.rows[0];
      });
    } catch (error) {
      if (error instanceof AlertError) throw error;

      console.error('Error acknowledging alert:', error);
      throw new AlertError(
        `Failed to acknowledge alert: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(alertId: string, orgId: string): Promise<Alert> {
    try {
      return await withTransaction(async (client: PoolClient) => {
        // First verify the alert exists and belongs to the org
        const checkResult = await client.query<{ is_resolved: boolean }>(
          'SELECT is_resolved FROM ai_alert WHERE id = $1 AND org_id = $2',
          [alertId, orgId]
        );

        if (checkResult.rowCount === 0) {
          throw new AlertError(`Alert not found: ${alertId}`);
        }

        if (checkResult.rows[0].is_resolved) {
          throw new AlertError(`Alert already resolved: ${alertId}`);
        }

        // Update the alert
        const result = await client.query<Alert>(
          `
          UPDATE ai_alert
          SET
            is_resolved = true,
            resolved_at = NOW()
          WHERE id = $1 AND org_id = $2
          RETURNING
            id,
            org_id,
            service_type,
            severity,
            title,
            message,
            recommendations,
            entity_type,
            entity_id,
            is_acknowledged,
            acknowledged_by,
            acknowledged_at,
            is_resolved,
            resolved_at,
            created_at,
            metadata
          `,
          [alertId, orgId]
        );

        if (result.rowCount === 0) {
          throw new AlertError('Failed to resolve alert');
        }

        return result.rows[0];
      });
    } catch (error) {
      if (error instanceof AlertError) throw error;

      console.error('Error resolving alert:', error);
      throw new AlertError(
        `Failed to resolve alert: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get alert statistics for an organization
   */
  async getAlertStats(orgId: string): Promise<AlertStats> {
    try {
      // Get counts by severity
      const severityResult = await query<{ severity: AlertSeverity; count: string }>(
        `
        SELECT severity, COUNT(*) as count
        FROM ai_alert
        WHERE org_id = $1
        GROUP BY severity
        `,
        [orgId]
      );

      // Get counts by status
      const statusResult = await query<{
        is_acknowledged: boolean;
        is_resolved: boolean;
        count: string;
      }>(
        `
        SELECT is_acknowledged, is_resolved, COUNT(*) as count
        FROM ai_alert
        WHERE org_id = $1
        GROUP BY is_acknowledged, is_resolved
        `,
        [orgId]
      );

      // Get counts by service type
      const serviceResult = await query<{ service_type: string; count: string }>(
        `
        SELECT service_type, COUNT(*) as count
        FROM ai_alert
        WHERE org_id = $1
        GROUP BY service_type
        `,
        [orgId]
      );

      // Get total count
      const totalResult = await query<{ count: string }>(
        'SELECT COUNT(*) as count FROM ai_alert WHERE org_id = $1',
        [orgId]
      );

      // Process results
      const by_severity = {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
      };

      severityResult.rows.forEach((row) => {
        by_severity[row.severity] = parseInt(row.count, 10);
      });

      const by_status = {
        pending: 0,
        acknowledged: 0,
        resolved: 0,
      };

      let unresolved_count = 0;
      let acknowledged_count = 0;

      statusResult.rows.forEach((row) => {
        const count = parseInt(row.count, 10);
        if (row.is_resolved) {
          by_status.resolved += count;
        } else if (row.is_acknowledged) {
          by_status.acknowledged += count;
          acknowledged_count += count;
          unresolved_count += count;
        } else {
          by_status.pending += count;
          unresolved_count += count;
        }
      });

      const by_service: Record<string, number> = {};
      serviceResult.rows.forEach((row) => {
        by_service[row.service_type] = parseInt(row.count, 10);
      });

      return {
        total: parseInt(totalResult.rows[0]?.count || '0', 10),
        by_severity,
        by_status,
        by_service,
        unresolved_count,
        acknowledged_count,
      };
    } catch (error) {
      console.error('Error getting alert stats:', error);
      throw new AlertError(
        `Failed to get alert stats: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Delete an alert (admin only)
   */
  async deleteAlert(alertId: string, orgId: string): Promise<void> {
    try {
      const result = await query(
        'DELETE FROM ai_alert WHERE id = $1 AND org_id = $2',
        [alertId, orgId]
      );

      if (result.rowCount === 0) {
        throw new AlertError(`Alert not found: ${alertId}`);
      }
    } catch (error) {
      if (error instanceof AlertError) throw error;

      console.error('Error deleting alert:', error);
      throw new AlertError(
        `Failed to delete alert: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Batch acknowledge multiple alerts
   */
  async batchAcknowledgeAlerts(
    alertIds: string[],
    userId: string,
    orgId: string
  ): Promise<number> {
    try {
      const result = await query(
        `
        UPDATE ai_alert
        SET
          is_acknowledged = true,
          acknowledged_by = $1,
          acknowledged_at = NOW()
        WHERE id = ANY($2) AND org_id = $3 AND is_acknowledged = false
        `,
        [userId, alertIds, orgId]
      );

      return result.rowCount || 0;
    } catch (error) {
      console.error('Error batch acknowledging alerts:', error);
      throw new AlertError(
        `Failed to batch acknowledge alerts: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Batch resolve multiple alerts
   */
  async batchResolveAlerts(alertIds: string[], orgId: string): Promise<number> {
    try {
      const result = await query(
        `
        UPDATE ai_alert
        SET
          is_resolved = true,
          resolved_at = NOW()
        WHERE id = ANY($1) AND org_id = $2 AND is_resolved = false
        `,
        [alertIds, orgId]
      );

      return result.rowCount || 0;
    } catch (error) {
      console.error('Error batch resolving alerts:', error);
      throw new AlertError(
        `Failed to batch resolve alerts: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const alertService = new AIAlertService();
