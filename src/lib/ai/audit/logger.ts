import { randomUUID } from 'crypto';
import { query } from '../../database';
import type {
  AuditEvent,
  AuditQuery,
  AuditSummary,
  ToolExecutionAudit,
  DecisionAudit,
  AccessCheckAudit,
} from './types';

/**
 * AuditLogger - Comprehensive audit logging system
 * Logs all AI decisions and actions for compliance, debugging, and transparency
 */
export class AuditLogger {
  private buffer: AuditEvent[] = [];
  private readonly bufferSize = 100;
  private readonly flushInterval = 5000; // 5 seconds
  private flushTimer?: NodeJS.Timeout;
  private eventListeners: Map<string, (event: AuditEvent) => void> = new Map();

  constructor() {
    this.startFlushTimer();
  }

  /**
   * Log a generic audit event
   */
  async log(event: Omit<AuditEvent, 'id' | 'timestamp'>): Promise<string> {
    const auditEvent: AuditEvent = {
      ...event,
      id: randomUUID(),
      timestamp: new Date(),
    };

    this.buffer.push(auditEvent);
    this.notifyListeners(auditEvent);

    // Flush if buffer is full
    if (this.buffer.length >= this.bufferSize) {
      await this.flush();
    }

    return auditEvent.id;
  }

  /**
   * Log tool execution
   */
  async logToolExecution(
    toolName: string,
    params: Record<string, any>,
    result: any,
    context: {
      orgId?: string;
      userId?: string;
      sessionId?: string;
      severity?: 'debug' | 'info' | 'warning' | 'error' | 'critical';
    } = {}
  ): Promise<string> {
    const event: Omit<ToolExecutionAudit, 'id' | 'timestamp'> = {
      eventType: 'tool_execution',
      severity: context.severity || 'info',
      orgId: context.orgId,
      userId: context.userId,
      sessionId: context.sessionId,
      toolName,
      parameters: params,
      result,
    };

    return this.log(event);
  }

  /**
   * Log AI decision
   */
  async logDecision(
    decision: string,
    reasoning: string,
    alternatives: string[] = [],
    context: {
      orgId?: string;
      userId?: string;
      sessionId?: string;
      confidence?: number;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<string> {
    const event: Omit<DecisionAudit, 'id' | 'timestamp'> = {
      eventType: 'decision',
      severity: 'info',
      orgId: context.orgId,
      userId: context.userId,
      sessionId: context.sessionId,
      reasoning,
      alternatives,
      metadata: {
        decision,
        confidence: context.confidence,
        ...context.metadata,
      },
    };

    return this.log(event);
  }

  /**
   * Log access control check
   */
  async logAccessCheck(
    resource: string,
    result: boolean,
    context: {
      orgId?: string;
      userId?: string;
      sessionId?: string;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<string> {
    const event: Omit<AccessCheckAudit, 'id' | 'timestamp'> = {
      eventType: 'access_check',
      severity: result ? 'debug' : 'warning',
      orgId: context.orgId,
      userId: context.userId,
      sessionId: context.sessionId,
      resource,
      result,
      metadata: context.metadata,
    };

    return this.log(event);
  }

  /**
   * Log approval action
   */
  async logApproval(
    action: string,
    response: any,
    context: {
      orgId?: string;
      userId?: string;
      sessionId?: string;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<string> {
    const event: Omit<AuditEvent, 'id' | 'timestamp'> = {
      eventType: 'approval',
      severity: 'info',
      orgId: context.orgId,
      userId: context.userId,
      sessionId: context.sessionId,
      metadata: {
        action,
        response,
        ...context.metadata,
      },
    };

    return this.log(event);
  }

  /**
   * Log error
   */
  async logError(
    error: Error | string,
    context: {
      orgId?: string;
      userId?: string;
      sessionId?: string;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<string> {
    const errorMessage = error instanceof Error ? error.message : error;
    const stack = error instanceof Error ? error.stack : undefined;

    const event: Omit<AuditEvent, 'id' | 'timestamp'> = {
      eventType: 'error',
      severity: 'error',
      orgId: context.orgId,
      userId: context.userId,
      sessionId: context.sessionId,
      metadata: {
        error: errorMessage,
        stack,
        ...context.metadata,
      },
    };

    return this.log(event);
  }

  /**
   * Log conversation/message
   */
  async logConversation(
    message: string,
    context: {
      orgId?: string;
      userId?: string;
      sessionId?: string;
      role?: 'user' | 'assistant' | 'system';
      metadata?: Record<string, any>;
    } = {}
  ): Promise<string> {
    const event: Omit<AuditEvent, 'id' | 'timestamp'> = {
      eventType: 'conversation',
      severity: 'debug',
      orgId: context.orgId,
      userId: context.userId,
      sessionId: context.sessionId,
      metadata: {
        message,
        role: context.role || 'user',
        ...context.metadata,
      },
    };

    return this.log(event);
  }

  /**
   * Query audit events
   */
  async query(filters: AuditQuery): Promise<AuditEvent[]> {
    let sql = `
      SELECT
        id, event_type, severity, org_id, user_id, session_id,
        tool_name, parameters, result, reasoning, alternatives,
        timestamp, metadata
      FROM ai_audit_events
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (filters.orgId) {
      sql += ` AND org_id = $${paramIndex}`;
      params.push(filters.orgId);
      paramIndex++;
    }

    if (filters.userId) {
      sql += ` AND user_id = $${paramIndex}`;
      params.push(filters.userId);
      paramIndex++;
    }

    if (filters.sessionId) {
      sql += ` AND session_id = $${paramIndex}`;
      params.push(filters.sessionId);
      paramIndex++;
    }

    if (filters.eventType && filters.eventType.length > 0) {
      sql += ` AND event_type = ANY($${paramIndex})`;
      params.push(filters.eventType);
      paramIndex++;
    }

    if (filters.severity && filters.severity.length > 0) {
      sql += ` AND severity = ANY($${paramIndex})`;
      params.push(filters.severity);
      paramIndex++;
    }

    if (filters.startDate) {
      sql += ` AND timestamp >= $${paramIndex}`;
      params.push(filters.startDate);
      paramIndex++;
    }

    if (filters.endDate) {
      sql += ` AND timestamp <= $${paramIndex}`;
      params.push(filters.endDate);
      paramIndex++;
    }

    sql += ` ORDER BY timestamp DESC`;

    if (filters.limit) {
      sql += ` LIMIT $${paramIndex}`;
      params.push(filters.limit);
      paramIndex++;
    }

    if (filters.offset) {
      sql += ` OFFSET $${paramIndex}`;
      params.push(filters.offset);
      paramIndex++;
    }

    const result = await query(sql, params);

    return result.rows.map(row => ({
      id: row.id,
      eventType: row.event_type,
      severity: row.severity,
      timestamp: new Date(row.timestamp),
      orgId: row.org_id,
      userId: row.user_id,
      sessionId: row.session_id,
      toolName: row.tool_name,
      parameters: row.parameters,
      result: row.result,
      reasoning: row.reasoning,
      alternatives: row.alternatives,
      metadata: row.metadata,
    }));
  }

  /**
   * Get audit statistics
   */
  async getStatistics(
    orgId?: string,
    timeRange?: { start: Date; end: Date }
  ): Promise<AuditSummary> {
    let sql = `
      SELECT
        COUNT(*) as total_events,
        COUNT(*) FILTER (WHERE event_type = 'tool_execution') as tool_executions,
        COUNT(*) FILTER (WHERE event_type = 'decision') as decisions,
        COUNT(*) FILTER (WHERE event_type = 'access_check') as access_checks,
        COUNT(*) FILTER (WHERE event_type = 'error') as errors,
        COUNT(*) FILTER (WHERE severity = 'error' OR severity = 'critical') as error_events,
        json_object_agg(DISTINCT tool_name, tool_count) FILTER (WHERE tool_name IS NOT NULL) as tool_stats
      FROM (
        SELECT
          event_type,
          severity,
          tool_name,
          COUNT(*) FILTER (WHERE tool_name IS NOT NULL) as tool_count
        FROM ai_audit_events
        WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (orgId) {
      sql += ` AND org_id = $${paramIndex}`;
      params.push(orgId);
      paramIndex++;
    }

    if (timeRange) {
      sql += ` AND timestamp >= $${paramIndex} AND timestamp <= $${paramIndex + 1}`;
      params.push(timeRange.start, timeRange.end);
      paramIndex += 2;
    }

    sql += `
        GROUP BY event_type, severity, tool_name
      ) stats
    `;

    const result = await query(sql, params);
    const row = result.rows[0];

    const toolStats = row.tool_stats || {};
    const topTools = Object.entries(toolStats)
      .map(([toolName, count]) => ({ toolName, count: Number(count) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalEvents: Number(row.total_events),
      eventsByType: {
        tool_execution: Number(row.tool_executions),
        decision: Number(row.decisions),
        access_check: Number(row.access_checks),
        approval: 0, // Would need additional query
        error: Number(row.errors),
        conversation: 0, // Would need additional query
      },
      eventsBySeverity: {
        debug: 0, // Would need additional query
        info: 0,
        warning: 0,
        error: Number(row.error_events),
        critical: 0,
      },
      timeRange: timeRange || {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        end: new Date(),
      },
      topTools,
      errorRate: row.total_events > 0 ? Number(row.error_events) / Number(row.total_events) : 0,
    };
  }

  /**
   * Subscribe to real-time audit events
   */
  onEvent(eventType: string, listener: (event: AuditEvent) => void): () => void {
    this.eventListeners.set(eventType, listener);
    return () => this.eventListeners.delete(eventType);
  }

  /**
   * Flush buffered events to database
   */
  private async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const events = [...this.buffer];
    this.buffer = [];

    try {
      const values = events.map(event => `(
        $${events.indexOf(event) * 12 + 1},
        $${events.indexOf(event) * 12 + 2},
        $${events.indexOf(event) * 12 + 3},
        $${events.indexOf(event) * 12 + 4},
        $${events.indexOf(event) * 12 + 5},
        $${events.indexOf(event) * 12 + 6},
        $${events.indexOf(event) * 12 + 7},
        $${events.indexOf(event) * 12 + 8},
        $${events.indexOf(event) * 12 + 9},
        $${events.indexOf(event) * 12 + 10},
        $${events.indexOf(event) * 12 + 11},
        $${events.indexOf(event) * 12 + 12}
      )`).join(', ');

      const params = events.flatMap(event => [
        event.id,
        event.eventType,
        event.severity,
        event.orgId || null,
        event.userId || null,
        event.sessionId || null,
        event.toolName || null,
        JSON.stringify(event.parameters || {}),
        JSON.stringify(event.result || null),
        event.reasoning || null,
        JSON.stringify(event.alternatives || []),
        event.timestamp.toISOString(),
      ]);

      const sql = `
        INSERT INTO ai_audit_events (
          id, event_type, severity, org_id, user_id, session_id,
          tool_name, parameters, result, reasoning, alternatives, timestamp
        ) VALUES ${values}
      `;

      await query(sql, params);
    } catch (error) {
      console.error('Failed to flush audit events:', error);
      // Re-add events to buffer for retry
      this.buffer.unshift(...events);
    }
  }

  /**
   * Start periodic flush timer
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush().catch(error => {
        console.error('Audit flush failed:', error);
      });
    }, this.flushInterval);
  }

  /**
   * Stop flush timer and flush remaining events
   */
  async shutdown(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }
    await this.flush();
  }

  /**
   * Notify event listeners
   */
  private notifyListeners(event: AuditEvent): void {
    for (const [eventType, listener] of this.eventListeners) {
      if (event.eventType === eventType || eventType === '*') {
        try {
          listener(event);
        } catch (error) {
          console.error('Audit event listener error:', error);
        }
      }
    }
  }
}

// Singleton instance
export const auditLogger = new AuditLogger();

// Graceful shutdown
process.on('SIGTERM', () => auditLogger.shutdown());
process.on('SIGINT', () => auditLogger.shutdown());