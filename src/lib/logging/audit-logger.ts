/**
 * Secure Audit Logger for WooCommerce Integration
 * Provides comprehensive audit logging with tenant isolation
 */

import { query } from '@/lib/database';

export interface AuditLogEntry {
  id?: string;
  timestamp: Date;
  org_id: string;
  user_id?: string;
  action: string;
  resource: string;
  details: Record<string, any>;
  status: 'success' | 'failure' | 'warning' | 'info';
  ip_address?: string;
  user_agent?: string;
  request_id?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DatabaseQueryLog {
  id?: string;
  timestamp: Date;
  org_id?: string;
  user_id?: string;
  action: string;
  query: string;
  row_count: number;
  duration: number;
  success: boolean;
  error?: string;
  request_id?: string;
}

export interface SecurityEventLog {
  id?: string;
  timestamp: Date;
  org_id?: string;
  user_id?: string;
  event_type: string;
  description: string;
  ip_address?: string;
  user_agent?: string;
  details: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
  resolved: boolean;
  request_id?: string;
}

/**
 * Audit Logger for tracking all WooCommerce operations
 */
export const auditLogger = {
  /**
   * Log general security events
   */
  async logSecurityEvent(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void> {
    try {
      await query(
        `INSERT INTO audit_logs (
           org_id, user_id, action, resource, details, status, ip_address, user_agent, request_id, severity, timestamp
         ) VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9, $10, NOW())`,
        [
          entry.org_id,
          entry.user_id,
          entry.action,
          entry.resource,
          JSON.stringify(entry.details),
          entry.status,
          entry.ip_address,
          entry.user_agent,
          entry.request_id,
          entry.severity
        ]
      );
    } catch (error) {
      console.error('Failed to log audit event:', error);
      // Don't throw error to avoid breaking application
    }
  },

  /**
   * Log database queries with tenant isolation
   */
  async logDatabaseQuery(log: Omit<DatabaseQueryLog, 'id' | 'timestamp'>): Promise<void> {
    try {
      await query(
        `INSERT INTO audit_database_queries (
           org_id, user_id, action, query, row_count, duration, success, error, request_id, timestamp
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
        [
          log.org_id,
          log.user_id,
          log.action,
          log.query,
          log.row_count,
          log.duration,
          log.success,
          log.error || null,
          log.request_id
        ]
      );
    } catch (error) {
      console.error('Failed to log database query:', error);
    }
  },

  /**
   * Log WooCommerce-specific operations
   */
  async logWooCommerceOperation(
    orgId: string,
    operation: string,
    entityType: string,
    details: Record<string, any>,
    userId?: string,
    requestId?: string
  ): Promise<void> {
    await this.logSecurityEvent({
      org_id: orgId,
      user_id: userId,
      action: `WOOCOMMERCE_${operation.toUpperCase()}`,
      resource: `woocommerce:${entityType}`,
      details,
      status: 'success',
      severity: this.getSeverityForOperation(operation),
      request_id: requestId
    });
  },

  /**
   * Log sync operations with detailed tracking
   */
  async logSyncOperation(
    orgId: string,
    entityType: string,
    status: 'started' | 'completed' | 'failed' | 'progress',
    details: Record<string, any>,
    userId?: string,
    requestId?: string
  ): Promise<void> {
    await this.logSecurityEvent({
      org_id: orgId,
      user_id: userId,
      action: `SYNC_${status.toUpperCase()}`,
      resource: `woocommerce:sync:${entityType}`,
      details,
      status: status === 'failed' ? 'failure' : 'success',
      severity: status === 'failed' ? 'high' : 'medium',
      request_id: requestId
    });
  },

  /**
   * Log authentication events
   */
  async logAuthEvent(
    orgId: string,
    event: 'login' | 'logout' | 'failed_login' | 'token_refresh',
    success: boolean,
    details: Record<string, any>,
    userId?: string,
    requestId?: string
  ): Promise<void> {
    await this.logSecurityEvent({
      org_id: orgId,
      user_id: userId,
      action: `AUTH_${event.toUpperCase()}`,
      resource: 'authentication',
      details,
      status: success ? 'success' : 'failure',
      severity: event === 'failed_login' && !success ? 'high' : 'medium',
      request_id: requestId
    });
  },

  /**
   * Log configuration changes
   */
  async logConfigChange(
    orgId: string,
    configType: string,
    changes: Record<string, any>,
    userId?: string,
    requestId?: string
  ): Promise<void> {
    await this.logSecurityEvent({
      org_id: orgId,
      user_id: userId,
      action: 'CONFIG_UPDATE',
      resource: `woocommerce:config:${configType}`,
      details: { changes },
      status: 'success',
      severity: 'medium',
      request_id: requestId
    });
  },

  /**
   * Determine severity based on operation type
   */
  private getSeverityForOperation(operation: string): 'low' | 'medium' | 'high' | 'critical' {
    const criticalOperations = ['DELETE', 'CONFIG_UPDATE', 'AUTH'];
    const highOperations = ['CREATE', 'UPDATE', 'SYNC'];
    const mediumOperations = ['READ', 'LIST'];

    const upperOp = operation.toUpperCase();
    if (criticalOperations.some(op => upperOp.includes(op))) return 'critical';
    if (highOperations.some(op => upperOp.includes(op))) return 'high';
    if (mediumOperations.some(op => upperOp.includes(op))) return 'medium';

    return 'low';
  }
};

/**
 * Security Event Logger for tracking suspicious activities
 */
export const securityLogger = {
  /**
   * Log security errors
   */
  async logSecurityError(context: {
    error: Error | string;
    context: Record<string, any>;
  }): Promise<void> {
    try {
      const errorStr = typeof context.error === 'string' ? context.error : context.error.message;

      await query(
        `INSERT INTO security_events (
           org_id, event_type, description, details, severity, resolved, timestamp
         ) VALUES ($1, $2, $3, $4::jsonb, $5, false, NOW())`,
        [
          context.context.orgId || 'unknown',
          'SECURITY_ERROR',
          `Security error occurred: ${errorStr}`,
          JSON.stringify(context.context),
          'high'
        ]
      );
    } catch (error) {
      console.error('Failed to log security error:', error);
    }
  },

  /**
   * Log suspicious activities
   */
  async logSuspiciousActivity(event: {
    type: string;
    description: string;
    ip?: string;
    userAgent?: string;
    details: Record<string, any>;
  }): Promise<void> {
    try {
      await query(
        `INSERT INTO security_events (
           org_id, event_type, description, ip_address, user_agent, details, severity, resolved, timestamp
         ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, false, NOW())`,
        [
          event.details.orgId || 'unknown',
          event.type,
          event.description,
          event.ip,
          event.userAgent,
          JSON.stringify(event.details),
          'medium'
        ]
      );
    } catch (error) {
      console.error('Failed to log suspicious activity:', error);
    }
  },

  /**
   * Log authentication failures
   */
  async logAuthFailure(
    orgId: string,
    failureType: string,
    ip?: string,
    userAgent?: string,
    requestId?: string
  ): Promise<void> {
    await this.logSuspiciousActivity({
      type: 'AUTH_FAILURE',
      description: `Authentication failure: ${failureType}`,
      ip,
      userAgent,
      details: { orgId, failureType, requestId }
    });
  },

  /**
   * Log potential SQL injection attempts
   */
  async logSQLInjectionAttempt(
    orgId: string,
    query: string,
    ip?: string,
    userAgent?: string,
    requestId?: string
  ): Promise<void> {
    await this.logSuspiciousActivity({
      type: 'SQL_INJECTION_ATTEMPT',
      description: 'Potential SQL injection attempt detected',
      ip,
      userAgent,
      details: { orgId, query, requestId }
    });
  },

  /**
   * Log unauthorized access attempts
   */
  async logUnauthorizedAccess(
    orgId: string,
    resource: string,
    ip?: string,
    userAgent?: string,
    requestId?: string
  ): Promise<void> {
    await this.logSuspiciousActivity({
      type: 'UNAUTHORIZED_ACCESS',
      description: `Unauthorized access attempt to ${resource}`,
      ip,
      userAgent,
      details: { orgId, resource, requestId }
    });
  },

  /**
   * Log CSRF token violations
   */
  async logCSRFViolation(
    orgId: string,
    action: string,
    ip?: string,
    userAgent?: string,
    requestId?: string
  ): Promise<void> {
    await this.logSuspiciousActivity({
      type: 'CSRF_VIOLATION',
      description: `CSRF token violation for action: ${action}`,
      ip,
      userAgent,
      details: { orgId, action, requestId }
    });
  }
};

/**
 * Query helper to retrieve audit logs with tenant isolation
 */
export const auditQueries = {
  /**
   * Get audit logs for organization
   */
  getAuditLogs: async (orgId: string, options: {
    page?: number;
    pageSize?: number;
    startDate?: Date;
    endDate?: Date;
    actionTypes?: string[];
    severity?: string[];
  } = {}) => {
    const { page = 1, pageSize = 50, startDate, endDate, actionTypes, severity } = options;

    let whereClause = 'WHERE org_id = $1';
    const params: any[] = [orgId];
    let paramIndex = 2;

    if (startDate) {
      whereClause += ` AND timestamp >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      whereClause += ` AND timestamp <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    if (actionTypes && actionTypes.length > 0) {
      whereClause += ` AND action = ANY($${paramIndex})`;
      params.push(actionTypes);
      paramIndex++;
    }

    if (severity && severity.length > 0) {
      whereClause += ` AND severity = ANY($${paramIndex})`;
      params.push(severity);
      paramIndex++;
    }

    const offset = (page - 1) * pageSize;

    const queryText = `
      SELECT id, timestamp, org_id, user_id, action, resource, details, status,
             ip_address, user_agent, request_id, severity
      FROM audit_logs
      ${whereClause}
      ORDER BY timestamp DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(pageSize, offset);

    return query(queryText, params);
  },

  /**
   * Get security events for organization
   */
  getSecurityEvents: async (orgId: string, options: {
    page?: number;
    pageSize?: number;
    startDate?: Date;
    endDate?: Date;
    eventTypes?: string[];
    unresolvedOnly?: boolean;
  } = {}) => {
    const { page = 1, pageSize = 50, startDate, endDate, eventTypes, unresolvedOnly = false } = options;

    let whereClause = 'WHERE org_id = $1';
    const params: any[] = [orgId];
    let paramIndex = 2;

    if (startDate) {
      whereClause += ` AND timestamp >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      whereClause += ` AND timestamp <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    if (eventTypes && eventTypes.length > 0) {
      whereClause += ` AND event_type = ANY($${paramIndex})`;
      params.push(eventTypes);
      paramIndex++;
    }

    if (unresolvedOnly) {
      whereClause += ` AND resolved = false`;
    }

    const offset = (page - 1) * pageSize;

    const queryText = `
      SELECT id, timestamp, org_id, user_id, event_type, description,
             ip_address, user_agent, details, severity, resolved, request_id
      FROM security_events
      ${whereClause}
      ORDER BY timestamp DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(pageSize, offset);

    return query(queryText, params);
  },

  /**
   * Get database query logs for organization
   */
  getDatabaseQueryLogs: async (orgId: string, options: {
    page?: number;
    pageSize?: number;
    startDate?: Date;
    endDate?: Date;
    failedOnly?: boolean;
  } = {}) => {
    const { page = 1, pageSize = 50, startDate, endDate, failedOnly = false } = options;

    let whereClause = 'WHERE org_id = $1';
    const params: any[] = [orgId];
    let paramIndex = 2;

    if (startDate) {
      whereClause += ` AND timestamp >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      whereClause += ` AND timestamp <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    if (failedOnly) {
      whereClause += ` AND success = false`;
    }

    const offset = (page - 1) * pageSize;

    const queryText = `
      SELECT id, timestamp, org_id, user_id, action, query, row_count,
             duration, success, error, request_id
      FROM audit_database_queries
      ${whereClause}
      ORDER BY timestamp DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(pageSize, offset);

    return query(queryText, params);
  }
};