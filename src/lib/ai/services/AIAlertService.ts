import { db } from '@/lib/database';
import {
  AIServiceBase,
  type AIServiceBaseOptions,
  type AIServiceRequestOptions,
  type AIServiceResponse,
} from './base';
import type { AIServiceType } from './AIServiceConfigService';

// ============================================================================
// Types
// ============================================================================

export type AlertSeverity = 'info' | 'warning' | 'critical' | 'urgent';

export interface AIAlert {
  id: string;
  orgId: string;
  serviceType: AIServiceType;
  severity: AlertSeverity;
  title: string;
  message: string;
  recommendations: Array<{
    action: string;
    priority: number;
    details?: string;
  }>;
  entityType?: string;
  entityId?: string;
  isAcknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  isResolved: boolean;
  resolvedAt?: Date;
  createdAt: Date;
  metadata: Record<string, any>;
}

export interface CreateAlertData {
  serviceType: AIServiceType;
  severity: AlertSeverity;
  title: string;
  message: string;
  recommendations?: Array<{
    action: string;
    priority: number;
    details?: string;
  }>;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, any>;
}

export interface AlertStats {
  total: number;
  bySerity: Record<AlertSeverity, number>;
  acknowledged: number;
  resolved: number;
  active: number;
  avgResolutionTimeMinutes: number;
}

// ============================================================================
// Service Implementation
// ============================================================================

export class AIAlertService extends AIServiceBase<AIServiceRequestOptions> {
  constructor(options?: AIServiceBaseOptions) {
    super('AIAlertService', options);
  }

  /**
   * Create a new AI alert
   */
  async createAlert(
    orgId: string,
    data: CreateAlertData,
    options?: AIServiceRequestOptions,
  ): Promise<AIServiceResponse<AIAlert>> {
    return this.executeOperation(
      'alert.create',
      async () => {
        const result = await db.query(
          `
          INSERT INTO ai_alert (
            org_id, service_type, severity, title, message,
            recommendations, entity_type, entity_id, metadata
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING *
          `,
          [
            orgId,
            data.serviceType,
            data.severity,
            data.title,
            data.message,
            JSON.stringify(data.recommendations || []),
            data.entityType,
            data.entityId,
            JSON.stringify(data.metadata || {}),
          ],
        );

        return this.mapAlertRow(result.rows[0]);
      },
      options,
      {
        orgId,
        serviceType: data.serviceType,
        severity: data.severity,
      },
    );
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(
    alertId: string,
    userId: string,
    options?: AIServiceRequestOptions,
  ): Promise<AIServiceResponse<void>> {
    return this.executeOperation(
      'alert.acknowledge',
      async () => {
        const result = await db.query(
          `
          UPDATE ai_alert
          SET
            is_acknowledged = true,
            acknowledged_by = $1,
            acknowledged_at = NOW()
          WHERE id = $2 AND is_acknowledged = false
          RETURNING id
          `,
          [userId, alertId],
        );

        if (result.rows.length === 0) {
          throw new Error(
            `Alert ${alertId} not found or already acknowledged`,
          );
        }
      },
      options,
      { alertId, userId },
    );
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(
    alertId: string,
    options?: AIServiceRequestOptions,
  ): Promise<AIServiceResponse<void>> {
    return this.executeOperation(
      'alert.resolve',
      async () => {
        const result = await db.query(
          `
          UPDATE ai_alert
          SET is_resolved = true, resolved_at = NOW()
          WHERE id = $1 AND is_resolved = false
          RETURNING id
          `,
          [alertId],
        );

        if (result.rows.length === 0) {
          throw new Error(`Alert ${alertId} not found or already resolved`);
        }
      },
      options,
      { alertId },
    );
  }

  /**
   * Dismiss an alert with a reason
   */
  async dismissAlert(
    alertId: string,
    reason: string,
    options?: AIServiceRequestOptions,
  ): Promise<AIServiceResponse<void>> {
    return this.executeOperation(
      'alert.dismiss',
      async () => {
        const result = await db.query(
          `
          UPDATE ai_alert
          SET
            is_resolved = true,
            resolved_at = NOW(),
            metadata = metadata || jsonb_build_object('dismissReason', $1)
          WHERE id = $2 AND is_resolved = false
          RETURNING id
          `,
          [reason, alertId],
        );

        if (result.rows.length === 0) {
          throw new Error(`Alert ${alertId} not found or already dismissed`);
        }
      },
      options,
      { alertId, reason },
    );
  }

  /**
   * Get a single alert by ID
   */
  async getAlert(
    alertId: string,
    options?: AIServiceRequestOptions,
  ): Promise<AIServiceResponse<AIAlert>> {
    return this.executeOperation(
      'alert.get',
      async () => {
        const result = await db.query(
          `
          SELECT * FROM ai_alert
          WHERE id = $1
          `,
          [alertId],
        );

        if (result.rows.length === 0) {
          throw new Error(`Alert ${alertId} not found`);
        }

        return this.mapAlertRow(result.rows[0]);
      },
      options,
      { alertId },
    );
  }

  /**
   * Get all unresolved alerts for an organization
   */
  async getUnresolvedAlerts(
    orgId: string,
    options?: AIServiceRequestOptions,
  ): Promise<AIServiceResponse<AIAlert[]>> {
    return this.executeOperation(
      'alert.getUnresolved',
      async () => {
        const result = await db.query(
          `
          SELECT * FROM ai_alert
          WHERE org_id = $1 AND is_resolved = false
          ORDER BY
            CASE severity
              WHEN 'urgent' THEN 1
              WHEN 'critical' THEN 2
              WHEN 'warning' THEN 3
              WHEN 'info' THEN 4
            END,
            created_at DESC
          `,
          [orgId],
        );

        return result.rows.map((row) => this.mapAlertRow(row));
      },
      options,
      { orgId },
    );
  }

  /**
   * Get alerts by severity level
   */
  async getAlertsBySeverity(
    orgId: string,
    severity: AlertSeverity,
    options?: AIServiceRequestOptions,
  ): Promise<AIServiceResponse<AIAlert[]>> {
    return this.executeOperation(
      'alert.getBySeverity',
      async () => {
        const result = await db.query(
          `
          SELECT * FROM ai_alert
          WHERE org_id = $1 AND severity = $2
          ORDER BY created_at DESC
          `,
          [orgId, severity],
        );

        return result.rows.map((row) => this.mapAlertRow(row));
      },
      options,
      { orgId, severity },
    );
  }

  /**
   * Get alerts by service type
   */
  async getAlertsByService(
    orgId: string,
    serviceType: AIServiceType,
    options?: AIServiceRequestOptions,
  ): Promise<AIServiceResponse<AIAlert[]>> {
    return this.executeOperation(
      'alert.getByService',
      async () => {
        const result = await db.query(
          `
          SELECT * FROM ai_alert
          WHERE org_id = $1 AND service_type = $2
          ORDER BY created_at DESC
          `,
          [orgId, serviceType],
        );

        return result.rows.map((row) => this.mapAlertRow(row));
      },
      options,
      { orgId, serviceType },
    );
  }

  /**
   * Get comprehensive alert statistics
   */
  async getAlertStats(
    orgId: string,
    options?: AIServiceRequestOptions,
  ): Promise<AIServiceResponse<AlertStats>> {
    return this.executeOperation(
      'alert.stats',
      async () => {
        // Get overall stats
        const overallResult = await db.query(
          `
          SELECT
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE is_acknowledged = true) as acknowledged,
            COUNT(*) FILTER (WHERE is_resolved = true) as resolved,
            COUNT(*) FILTER (WHERE is_resolved = false) as active,
            AVG(
              EXTRACT(EPOCH FROM (resolved_at - created_at)) / 60
            ) FILTER (WHERE is_resolved = true) as avg_resolution_minutes
          FROM ai_alert
          WHERE org_id = $1
          `,
          [orgId],
        );

        const overall = overallResult.rows[0];

        // Get counts by severity
        const severityResult = await db.query(
          `
          SELECT severity, COUNT(*) as count
          FROM ai_alert
          WHERE org_id = $1
          GROUP BY severity
          `,
          [orgId],
        );

        const bySeverity: Record<AlertSeverity, number> = {
          info: 0,
          warning: 0,
          critical: 0,
          urgent: 0,
        };

        for (const row of severityResult.rows) {
          bySeverity[row.severity as AlertSeverity] = parseInt(row.count);
        }

        return {
          total: parseInt(overall.total || '0'),
          bySerity: bySeverity,
          acknowledged: parseInt(overall.acknowledged || '0'),
          resolved: parseInt(overall.resolved || '0'),
          active: parseInt(overall.active || '0'),
          avgResolutionTimeMinutes: parseFloat(
            overall.avg_resolution_minutes || '0',
          ),
        };
      },
      options,
      { orgId },
    );
  }

  /**
   * Get count of active (unresolved) alerts
   */
  async getActiveAlertCount(
    orgId: string,
    options?: AIServiceRequestOptions,
  ): Promise<AIServiceResponse<number>> {
    return this.executeOperation(
      'alert.activeCount',
      async () => {
        const result = await db.query(
          `
          SELECT COUNT(*) as count
          FROM ai_alert
          WHERE org_id = $1 AND is_resolved = false
          `,
          [orgId],
        );

        return parseInt(result.rows[0]?.count || '0');
      },
      options,
      { orgId },
    );
  }

  /**
   * Map database row to AIAlert
   */
  private mapAlertRow(row: any): AIAlert {
    return {
      id: row.id,
      orgId: row.org_id,
      serviceType: row.service_type,
      severity: row.severity,
      title: row.title,
      message: row.message,
      recommendations: row.recommendations || [],
      entityType: row.entity_type,
      entityId: row.entity_id,
      isAcknowledged: row.is_acknowledged,
      acknowledgedBy: row.acknowledged_by,
      acknowledgedAt: row.acknowledged_at
        ? new Date(row.acknowledged_at)
        : undefined,
      isResolved: row.is_resolved,
      resolvedAt: row.resolved_at ? new Date(row.resolved_at) : undefined,
      createdAt: new Date(row.created_at),
      metadata: row.metadata || {},
    };
  }
}
