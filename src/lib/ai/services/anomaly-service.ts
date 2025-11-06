/**
 * Production AI Anomaly Detection Service
 *
 * Integrates with AIDatabaseService for AI-powered anomaly detection
 * and provides comprehensive anomaly management capabilities.
 *
 * Features:
 * - Multi-entity anomaly detection (suppliers, products, inventory, orders)
 * - AI-powered analysis using Claude 3.5 Sonnet
 * - Dual-table storage (analytics_anomalies + ai_data_anomalies)
 * - Real-time statistics and trend analysis
 * - Severity-based alerting and filtering
 */

import { query } from '@/lib/database/connection';
import { aiDatabase } from '@/lib/ai/database-integration';
import { z } from 'zod';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type AnomalyType =
  | 'data_quality'
  | 'statistical'
  | 'business_rule'
  | 'security'
  | 'delivery_performance'
  | 'quality_issues'
  | 'low_stock'
  | 'price_variance'
  | 'supplier_risk';

export type AnomalySeverity = 'low' | 'medium' | 'high' | 'critical';

export type AnomalyStatus = 'active' | 'acknowledged' | 'resolved' | 'false_positive';

export type EntityType = 'supplier' | 'product' | 'inventory' | 'purchase_order' | 'system';

export interface Anomaly {
  id: string;
  organization_id?: number;
  type: AnomalyType;
  severity: AnomalySeverity;
  title: string;
  description: string;
  value?: number;
  threshold?: number;
  entity_type?: EntityType;
  entity_id?: string;
  affected_records?: number;
  detection_method?: string;
  suggested_fix?: string;
  sql_to_fix?: string;
  detected_at: Date;
  acknowledged_at?: Date;
  acknowledged_by?: number;
  resolved_at?: Date;
  resolved_by?: number;
  resolution_notes?: string;
  false_positive?: boolean;
  status?: AnomalyStatus;
}

export interface AnomalyFilters {
  entityType?: EntityType;
  entityId?: string;
  severity?: AnomalySeverity;
  status?: AnomalyStatus;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface AnomalyStats {
  total: number;
  bySeverity: Record<AnomalySeverity, number>;
  byType: Record<string, number>;
  byStatus: Record<AnomalyStatus, number>;
  byEntity: Array<{
    entityType: EntityType;
    count: number;
    avgSeverity: string;
  }>;
  trends: {
    daily: Array<{
      date: string;
      count: number;
      avgSeverity: string;
    }>;
    weekOverWeek: {
      change: number;
      direction: 'increasing' | 'decreasing' | 'stable';
    };
  };
  topAnomalies: Array<{
    id: string;
    type: string;
    severity: AnomalySeverity;
    title: string;
    affected_records: number;
    detected_at: Date;
  }>;
  calculatedAt: Date;
}

export interface DetectAnomaliesOptions {
  organizationId: number;
  entityType?: EntityType;
  entityId?: string;
  checkTypes?: AnomalyType[];
  sensitivity?: 'low' | 'medium' | 'high';
}

export interface DetectionResult {
  anomaliesDetected: number;
  anomalies: Anomaly[];
  overallHealthScore: number;
  recommendations: string[];
  detectionTime: number;
}

// ============================================================================
// ANOMALY SERVICE CLASS
// ============================================================================

export class AnomalyService {
  /**
   * Detect anomalies using AI-powered analysis
   */
  async detectAnomalies(options: DetectAnomaliesOptions): Promise<DetectionResult> {
    const startTime = Date.now();
    const { organizationId, entityType, entityId, checkTypes, sensitivity = 'medium' } = options;

    try {
      // Build query based on entity type
      let dataQuery = this.buildDetectionQuery(organizationId, entityType, entityId);

      // Run AI-powered anomaly detection
      const aiResult = await aiDatabase.detectAnomalies({
        query: dataQuery,
        checks: checkTypes as any[],
      });

      // Store anomalies in both tables for compatibility
      const storedAnomalies = await this.storeDetectedAnomalies(
        organizationId,
        aiResult.anomalies,
        entityType,
        entityId
      );

      const detectionTime = Date.now() - startTime;

      return {
        anomaliesDetected: storedAnomalies.length,
        anomalies: storedAnomalies,
        overallHealthScore: aiResult.overall_health_score,
        recommendations: aiResult.recommendations,
        detectionTime,
      };
    } catch (error) {
      console.error('Error in detectAnomalies:', error);
      throw new Error(`Anomaly detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * List anomalies with filtering and pagination
   */
  async listAnomalies(
    organizationId: number,
    filters: AnomalyFilters = {}
  ): Promise<{ anomalies: Anomaly[]; total: number }> {
    try {
      const {
        entityType,
        entityId,
        severity,
        status = 'active',
        startDate,
        endDate,
        limit = 50,
        offset = 0,
      } = filters;

      // Build WHERE conditions
      const conditions: string[] = ['organization_id = $1'];
      const params: any[] = [organizationId];
      let paramIndex = 2;

      if (entityType) {
        conditions.push(`entity_type = $${paramIndex++}`);
        params.push(entityType);
      }

      if (entityId) {
        conditions.push(`entity_id = $${paramIndex++}`);
        params.push(entityId);
      }

      if (severity) {
        conditions.push(`severity = $${paramIndex++}`);
        params.push(severity);
      }

      // Status filtering
      if (status === 'active') {
        conditions.push('resolved_at IS NULL');
      } else if (status === 'resolved') {
        conditions.push('resolved_at IS NOT NULL');
      } else if (status === 'acknowledged') {
      } else if (status === 'false_positive') {
      }

      if (startDate) {
        conditions.push(`detected_at >= $${paramIndex++}`);
        params.push(startDate);
      }

      if (endDate) {
        conditions.push(`detected_at <= $${paramIndex++}`);
        params.push(endDate);
      }

      const whereClause = conditions.join(' AND ');

      // Get total count
      const countResult = await query(
        `SELECT COUNT(*) as total FROM analytics_anomalies WHERE ${whereClause}`,
        params
      );
      const total = parseInt(countResult.rows[0]?.total || '0');

      // Get anomalies
      const anomaliesResult = await query(
        `
        SELECT
          id,
          organization_id,
          type,
          severity,
          description,
          entity_type,
          entity_id,
          detected_at,
          resolved_at
        FROM analytics_anomalies
        WHERE ${whereClause}
        ORDER BY
          CASE severity
            WHEN 'critical' THEN 1
            WHEN 'high' THEN 2
            WHEN 'medium' THEN 3
            WHEN 'low' THEN 4
          END,
          detected_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `,
        [...params, limit, offset]
      );

      const anomalies = anomaliesResult.rows.map(row => ({
        ...row,
        detected_at: new Date(row.detected_at),
        acknowledged_at: row.acknowledged_at ? new Date(row.acknowledged_at) : undefined,
        resolved_at: row.resolved_at ? new Date(row.resolved_at) : undefined,
      }));

      return { anomalies, total };
    } catch (error) {
      console.error('Error in listAnomalies:', error);
      throw new Error(`Failed to list anomalies: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get anomaly by ID
   */
  async getAnomalyById(anomalyId: string, organizationId?: number): Promise<Anomaly | null> {
    try {
      const conditions = ['id = $1'];
      const params: any[] = [anomalyId];

      if (organizationId) {
        conditions.push('organization_id = $2');
        params.push(organizationId);
      }

      const result = await query(
        `
        SELECT
          id,
          organization_id,
          type,
          severity,
          description,
          entity_type,
          entity_id,
          detected_at,
          resolved_at,
          resolved_by,
        FROM analytics_anomalies
        WHERE ${conditions.join(' AND ')}
        `,
        params
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        ...row,
        detected_at: new Date(row.detected_at),
        acknowledged_at: row.acknowledged_at ? new Date(row.acknowledged_at) : undefined,
        resolved_at: row.resolved_at ? new Date(row.resolved_at) : undefined,
      };
    } catch (error) {
      console.error('Error in getAnomalyById:', error);
      throw new Error(`Failed to get anomaly: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Mark anomaly as resolved
   */
  async markResolved(
    anomalyId: string,
    userId: number,
    resolutionNotes?: string,
    organizationId?: number
  ): Promise<Anomaly> {
    try {
      const conditions = ['id = $1'];
      const params: any[] = [anomalyId];

      if (organizationId) {
        conditions.push('organization_id = $5');
        params.push(organizationId);
      }

      const result = await query(
        `
        UPDATE analytics_anomalies
        SET
          resolved_at = NOW(),
          resolved_by = $2,
          resolution_notes = $3,
          updated_at = NOW()
        WHERE ${conditions.join(' AND ')}
        RETURNING
          id,
          organization_id,
          type,
          severity,
          description,
          value,
          threshold,
          entity_type,
          entity_id,
          detected_at,
          acknowledged_at,
          acknowledged_by,
          resolved_at,
          resolved_by,
          resolution_notes,
          false_positive
        `,
        [anomalyId, userId, resolutionNotes || null, ...params.slice(1)]
      );

      if (result.rows.length === 0) {
        throw new Error('Anomaly not found or already resolved');
      }

      const row = result.rows[0];
      return {
        ...row,
        detected_at: new Date(row.detected_at),
        acknowledged_at: row.acknowledged_at ? new Date(row.acknowledged_at) : undefined,
        resolved_at: row.resolved_at ? new Date(row.resolved_at) : undefined,
      };
    } catch (error) {
      console.error('Error in markResolved:', error);
      throw new Error(`Failed to mark anomaly as resolved: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Acknowledge anomaly (intermediate state before resolution)
   */
  async acknowledgeAnomaly(
    anomalyId: string,
    userId: number,
    organizationId?: number
  ): Promise<Anomaly> {
    try {
      const conditions = ['id = $1'];
      const params: any[] = [anomalyId];

      if (organizationId) {
        conditions.push('organization_id = $3');
        params.push(organizationId);
      }

      const result = await query(
        `
        UPDATE analytics_anomalies
        SET
          acknowledged_at = NOW(),
          acknowledged_by = $2,
          updated_at = NOW()
        WHERE ${conditions.join(' AND ')}
          AND acknowledged_at IS NULL
        RETURNING
          id,
          organization_id,
          type,
          severity,
          description,
          value,
          threshold,
          entity_type,
          entity_id,
          detected_at,
          acknowledged_at,
          acknowledged_by,
          resolved_at,
          resolved_by,
          resolution_notes,
          false_positive
        `,
        [anomalyId, userId, ...params.slice(1)]
      );

      if (result.rows.length === 0) {
        throw new Error('Anomaly not found or already acknowledged');
      }

      const row = result.rows[0];
      return {
        ...row,
        detected_at: new Date(row.detected_at),
        acknowledged_at: row.acknowledged_at ? new Date(row.acknowledged_at) : undefined,
        resolved_at: row.resolved_at ? new Date(row.resolved_at) : undefined,
      };
    } catch (error) {
      console.error('Error in acknowledgeAnomaly:', error);
      throw new Error(`Failed to acknowledge anomaly: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Mark anomaly as false positive
   */
  async markFalsePositive(
    anomalyId: string,
    userId: number,
    notes?: string,
    organizationId?: number
  ): Promise<Anomaly> {
    try {
      const conditions = ['id = $1'];
      const params: any[] = [anomalyId];

      if (organizationId) {
        conditions.push('organization_id = $4');
        params.push(organizationId);
      }

      const result = await query(
        `
        UPDATE analytics_anomalies
        SET
          resolved_at = NOW(),
          resolved_by = $2,
          resolution_notes = $3,
          updated_at = NOW()
        WHERE ${conditions.join(' AND ')}
        RETURNING
          id,
          organization_id,
          type,
          severity,
          description,
          value,
          threshold,
          entity_type,
          entity_id,
          detected_at,
          acknowledged_at,
          acknowledged_by,
          resolved_at,
          resolved_by,
          resolution_notes,
          false_positive
        `,
        [anomalyId, userId, notes || 'Marked as false positive', ...params.slice(1)]
      );

      if (result.rows.length === 0) {
        throw new Error('Anomaly not found');
      }

      const row = result.rows[0];
      return {
        ...row,
        detected_at: new Date(row.detected_at),
        acknowledged_at: row.acknowledged_at ? new Date(row.acknowledged_at) : undefined,
        resolved_at: row.resolved_at ? new Date(row.resolved_at) : undefined,
      };
    } catch (error) {
      console.error('Error in markFalsePositive:', error);
      throw new Error(`Failed to mark as false positive: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get comprehensive anomaly statistics
   */
  async getAnomalyStats(
    organizationId: number,
    filters: { startDate?: Date; endDate?: Date; entityType?: EntityType } = {}
  ): Promise<AnomalyStats> {
    try {
      const { startDate, endDate, entityType } = filters;

      // Build WHERE conditions
      const conditions: string[] = ['organization_id = $1'];
      const params: any[] = [organizationId];
      let paramIndex = 2;

      if (startDate) {
        conditions.push(`detected_at >= $${paramIndex++}`);
        params.push(startDate);
      }

      if (endDate) {
        conditions.push(`detected_at <= $${paramIndex++}`);
        params.push(endDate);
      }

      if (entityType) {
        conditions.push(`entity_type = $${paramIndex++}`);
        params.push(entityType);
      }

      const whereClause = conditions.join(' AND ');

      // Get comprehensive statistics
      const statsResult = await query(
        `
        WITH severity_counts AS (
          SELECT
            severity,
            COUNT(*) as count
          FROM analytics_anomalies
          WHERE ${whereClause}
          GROUP BY severity
        ),
        type_counts AS (
          SELECT
            type,
            COUNT(*) as count
          FROM analytics_anomalies
          WHERE ${whereClause}
          GROUP BY type
        ),
        status_counts AS (
          SELECT
            CASE
              WHEN resolved_at IS NOT NULL THEN 'resolved'
              WHEN acknowledged_at IS NOT NULL THEN 'acknowledged'
              ELSE 'active'
            END as status,
            COUNT(*) as count
          FROM analytics_anomalies
          WHERE ${whereClause}
          GROUP BY
            CASE
              WHEN resolved_at IS NOT NULL THEN 'resolved'
              WHEN acknowledged_at IS NOT NULL THEN 'acknowledged'
              ELSE 'active'
            END
        ),
        entity_counts AS (
          SELECT
            entity_type,
            COUNT(*) as count,
            CASE
              WHEN AVG(CASE severity
                WHEN 'critical' THEN 4
                WHEN 'high' THEN 3
                WHEN 'medium' THEN 2
                WHEN 'low' THEN 1
              END) >= 3.5 THEN 'critical'
              WHEN AVG(CASE severity
                WHEN 'critical' THEN 4
                WHEN 'high' THEN 3
                WHEN 'medium' THEN 2
                WHEN 'low' THEN 1
              END) >= 2.5 THEN 'high'
              WHEN AVG(CASE severity
                WHEN 'critical' THEN 4
                WHEN 'high' THEN 3
                WHEN 'medium' THEN 2
                WHEN 'low' THEN 1
              END) >= 1.5 THEN 'medium'
              ELSE 'low'
            END as avg_severity
          FROM analytics_anomalies
          WHERE ${whereClause} AND entity_type IS NOT NULL
          GROUP BY entity_type
        ),
        daily_trends AS (
          SELECT
            DATE(detected_at) as date,
            COUNT(*) as count,
            CASE
              WHEN AVG(CASE severity
                WHEN 'critical' THEN 4
                WHEN 'high' THEN 3
                WHEN 'medium' THEN 2
                WHEN 'low' THEN 1
              END) >= 3.5 THEN 'critical'
              WHEN AVG(CASE severity
                WHEN 'critical' THEN 4
                WHEN 'high' THEN 3
                WHEN 'medium' THEN 2
                WHEN 'low' THEN 1
              END) >= 2.5 THEN 'high'
              WHEN AVG(CASE severity
                WHEN 'critical' THEN 4
                WHEN 'high' THEN 3
                WHEN 'medium' THEN 2
                WHEN 'low' THEN 1
              END) >= 1.5 THEN 'medium'
              ELSE 'low'
            END as avg_severity
          FROM analytics_anomalies
          WHERE ${whereClause}
            AND detected_at >= NOW() - INTERVAL '30 days'
          GROUP BY DATE(detected_at)
          ORDER BY date DESC
          LIMIT 30
        ),
        top_anomalies AS (
          SELECT
            id,
            type,
            severity,
            COALESCE(
              (SELECT name FROM core.supplier WHERE id = analytics_anomalies.entity_id AND analytics_anomalies.entity_type = 'supplier'),
              description
            ) as title,
            COALESCE(
              (SELECT COUNT(*) FROM core.stock_on_hand WHERE qty < 10 AND analytics_anomalies.entity_type = 'inventory'),
              1
            ) as affected_records,
            detected_at
          FROM analytics_anomalies
          WHERE ${whereClause}
            AND resolved_at IS NULL
          ORDER BY
            CASE severity
              WHEN 'critical' THEN 1
              WHEN 'high' THEN 2
              WHEN 'medium' THEN 3
              WHEN 'low' THEN 4
            END,
            detected_at DESC
          LIMIT 10
        )
        SELECT
          (SELECT COUNT(*) FROM analytics_anomalies WHERE ${whereClause}) as total,
          (SELECT json_agg(json_build_object('severity', severity, 'count', count)) FROM severity_counts) as by_severity,
          (SELECT json_agg(json_build_object('type', type, 'count', count)) FROM type_counts) as by_type,
          (SELECT json_agg(json_build_object('status', status, 'count', count)) FROM status_counts) as by_status,
          (SELECT json_agg(json_build_object('entityType', entity_type, 'count', count, 'avgSeverity', avg_severity)) FROM entity_counts) as by_entity,
          (SELECT json_agg(json_build_object('date', date, 'count', count, 'avgSeverity', avg_severity)) FROM daily_trends) as daily_trends,
          (SELECT json_agg(json_build_object('id', id, 'type', type, 'severity', severity, 'title', description, 'impact_score', impact_score, 'detected_at', detected_at)) FROM top_anomalies) as top_anomalies
        `,
        params
      );

      const row = statsResult.rows[0];

      // Calculate week-over-week change
      const thisWeekCount = await query(
        `
        SELECT COUNT(*) as count
        FROM analytics_anomalies
        WHERE ${whereClause}
          AND detected_at >= NOW() - INTERVAL '7 days'
        `,
        params
      );

      const lastWeekCount = await query(
        `
        SELECT COUNT(*) as count
        FROM analytics_anomalies
        WHERE ${whereClause}
          AND detected_at >= NOW() - INTERVAL '14 days'
          AND detected_at < NOW() - INTERVAL '7 days'
        `,
        params
      );

      const thisWeek = parseInt(thisWeekCount.rows[0]?.count || '0');
      const lastWeek = parseInt(lastWeekCount.rows[0]?.count || '0');
      const weekOverWeekChange = lastWeek > 0 ? ((thisWeek - lastWeek) / lastWeek) * 100 : 0;

      // Build response
      const bySeverity: Record<AnomalySeverity, number> = {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0,
      };

      if (row.by_severity) {
        row.by_severity.forEach((item: any) => {
          bySeverity[item.severity as AnomalySeverity] = parseInt(item.count);
        });
      }

      const byType: Record<string, number> = {};
      if (row.by_type) {
        row.by_type.forEach((item: any) => {
          byType[item.type] = parseInt(item.count);
        });
      }

      const byStatus: Record<AnomalyStatus, number> = {
        active: 0,
        acknowledged: 0,
        resolved: 0,
        false_positive: 0,
      };

      if (row.by_status) {
        row.by_status.forEach((item: any) => {
          byStatus[item.status as AnomalyStatus] = parseInt(item.count);
        });
      }

      return {
        total: parseInt(row.total || '0'),
        bySeverity,
        byType,
        byStatus,
        byEntity: row.by_entity || [],
        trends: {
          daily: row.daily_trends || [],
          weekOverWeek: {
            change: Math.round(weekOverWeekChange * 10) / 10,
            direction: weekOverWeekChange > 5 ? 'increasing' : weekOverWeekChange < -5 ? 'decreasing' : 'stable',
          },
        },
        topAnomalies: row.top_anomalies || [],
        calculatedAt: new Date(),
      };
    } catch (error) {
      console.error('Error in getAnomalyStats:', error);
      throw new Error(`Failed to get anomaly stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Build detection query based on entity type
   */
  private buildDetectionQuery(
    organizationId: number,
    entityType?: EntityType,
    entityId?: number
  ): string {
    if (entityType && entityId) {
      // Entity-specific query
      switch (entityType) {
        case 'supplier':
          return `
            SELECT * FROM core.supplier
            WHERE id = ${entityId}
            LIMIT 1
          `;
        case 'product':
          return `
            SELECT * FROM core.product
            WHERE id = ${entityId}
            LIMIT 1
          `;
        case 'inventory':
          return `
            SELECT * FROM core.stock_on_hand
            WHERE id = ${entityId}
            LIMIT 100
          `;
        case 'purchase_order':
          return `
            SELECT * FROM core.purchase_order
            WHERE id = ${entityId}
            LIMIT 1
          `;
        default:
          return `SELECT * FROM core.supplier LIMIT 100`;
      }
    } else if (entityType) {
      // Entity-type query
      switch (entityType) {
        case 'supplier':
          return `SELECT * FROM core.supplier LIMIT 100`;
        case 'product':
          return `SELECT * FROM core.product LIMIT 100`;
        case 'inventory':
          return `SELECT * FROM core.stock_on_hand WHERE qty < 50 LIMIT 100`;
        case 'purchase_order':
          return `SELECT * FROM core.purchase_order ORDER BY created_at DESC LIMIT 100`;
        default:
          return `SELECT * FROM core.supplier LIMIT 100`;
      }
    } else {
      // General system-wide query
      return `
        SELECT
          'system' as entity_type,
          COUNT(*) as total_records,
          COUNT(CASE WHEN qty < 10 THEN 1 END) as low_stock_items,
          AVG(qty) as avg_quantity
        FROM core.stock_on_hand
        LIMIT 1000
      `;
    }
  }

  /**
   * Store detected anomalies in both tables
   */
  private async storeDetectedAnomalies(
    organizationId: number,
    aiAnomalies: any[],
    entityType?: EntityType,
    entityId?: number
  ): Promise<Anomaly[]> {
    const storedAnomalies: Anomaly[] = [];

    for (const aiAnomaly of aiAnomalies) {
      try {
        // Store in analytics_anomalies (main table)
        const result = await query(
          `
          INSERT INTO analytics_anomalies (
            organization_id,
            type,
            severity,
            description,
            entity_type,
            entity_id,
            detected_at
          ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
          RETURNING
            id,
            organization_id,
            type,
            severity,
            description,
            entity_type,
            entity_id,
            detected_at,
            resolved_at,
          `,
          [
            organizationId,
            aiAnomaly.type,
            aiAnomaly.severity,
            aiAnomaly.description,
            entityType || null,
            entityId || null,
          ]
        );

        const stored = result.rows[0];
        storedAnomalies.push({
          ...stored,
          detected_at: new Date(stored.detected_at),
          acknowledged_at: stored.acknowledged_at ? new Date(stored.acknowledged_at) : undefined,
          resolved_at: stored.resolved_at ? new Date(stored.resolved_at) : undefined,
        });

        // Also store in ai_data_anomalies for AI-specific tracking
        await query(
          `
          INSERT INTO ai_data_anomalies (
            anomaly_type,
            severity,
            title,
            description,
            affected_records,
            detection_method,
            suggested_fix,
            sql_to_fix,
            detected_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
          `,
          [
            aiAnomaly.type,
            aiAnomaly.severity,
            aiAnomaly.title,
            aiAnomaly.description,
            aiAnomaly.affected_records || 0,
            aiAnomaly.detection_method || 'AI-powered analysis',
            aiAnomaly.suggested_fix || null,
            aiAnomaly.sql_to_fix || null,
          ]
        );
      } catch (error) {
        console.error('Error storing anomaly:', error);
        // Continue with other anomalies
      }
    }

    return storedAnomalies;
  }
}

// Export singleton instance
export const anomalyService = new AnomalyService();
