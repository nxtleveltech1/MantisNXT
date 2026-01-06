/**
 * Audit logging system for tracking user actions and system events
 * Enhanced with database persistence and security alert integration
 */

import { db } from '@/lib/database';

export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  userId?: string;
  userEmail?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  status: 'success' | 'failure' | 'error';
  severity: 'low' | 'medium' | 'high' | 'critical';
  organizationId?: string;
  sessionId?: string;
}

export interface AuditLogQuery {
  userId?: string;
  action?: string;
  resource?: string;
  status?: string;
  severity?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

class AuditLogger {
  private logs: AuditLogEntry[] = [];
  private maxLogs = 10000; // Maximum number of logs to keep in memory
  private dbEnabled = true;

  /**
   * Log an audit event
   */
  async log(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void> {
    const auditEntry: AuditLogEntry = {
      id: this.generateId(),
      timestamp: new Date(),
      ...entry,
    };

    // Add to in-memory logs
    this.logs.unshift(auditEntry);

    // Keep only the most recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    // Persist to database
    if (this.dbEnabled) {
      try {
        await this.persistToDatabase(auditEntry);
      } catch (error) {
        console.error('Failed to persist audit log to database:', error);
        // Don't throw - audit logging should not break the application
      }
    }

    // Send to external logging service if configured
    if (process.env.AUDIT_LOG_ENDPOINT) {
      try {
        await this.sendToExternalService(auditEntry);
      } catch (error) {
        console.error('Failed to send audit log to external service:', error);
      }
    }
  }

  /**
   * Persist audit log to database
   */
  private async persistToDatabase(entry: AuditLogEntry): Promise<void> {
    try {
      await db.query(`
        INSERT INTO auth.audit_events (
          id,
          event_type,
          action,
          resource,
          resource_id,
          user_id,
          details,
          severity,
          status,
          ip_address,
          user_agent,
          org_id,
          session_id,
          created_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
        )
      `, [
        entry.id,
        entry.action.split('.')[0], // event_type from action prefix
        entry.action,
        entry.resource,
        entry.resourceId || null,
        entry.userId || null,
        JSON.stringify(entry.details),
        entry.severity,
        entry.status,
        entry.ipAddress || null,
        entry.userAgent || null,
        entry.organizationId || null,
        entry.sessionId || null,
        entry.timestamp,
      ]);
    } catch (error) {
      // If table doesn't exist, disable DB logging to avoid repeated errors
      if (error instanceof Error && error.message.includes('does not exist')) {
        console.warn('Audit events table does not exist, using in-memory only');
        this.dbEnabled = false;
      }
      throw error;
    }
  }

  /**
   * Log user authentication events
   */
  async logAuth(
    action: 'login' | 'logout' | 'login_failed' | 'password_change',
    details: {
      userId?: string;
      userEmail?: string;
      ipAddress?: string;
      userAgent?: string;
      success: boolean;
      reason?: string;
    }
  ): Promise<void> {
    await this.log({
      action: `auth.${action}`,
      resource: 'authentication',
      userId: details.userId,
      userEmail: details.userEmail,
      details: {
        success: details.success,
        reason: details.reason,
      },
      ipAddress: details.ipAddress,
      userAgent: details.userAgent,
      status: details.success ? 'success' : 'failure',
      severity: action === 'login_failed' ? 'medium' : 'low',
    });

    // Create security alert for failed logins
    if (action === 'login_failed' && details.ipAddress) {
      await this.createSecurityAlert({
        alertType: 'failed_login',
        userEmail: details.userEmail,
        ipAddress: details.ipAddress,
        userAgent: details.userAgent,
        userId: details.userId,
      });
    }
  }

  /**
   * Create a security alert
   */
  private async createSecurityAlert(params: {
    alertType: string;
    userEmail?: string;
    ipAddress?: string;
    userAgent?: string;
    userId?: string;
  }): Promise<void> {
    try {
      // Use the database function if it exists
      await db.query(`
        SELECT auth.create_failed_login_alert($1, $2::inet, $3, $4)
      `, [
        params.userEmail || 'unknown',
        params.ipAddress || '0.0.0.0',
        params.userAgent || null,
        params.userId || null,
      ]);
    } catch (error) {
      // If function doesn't exist, try direct insert
      try {
        await db.query(`
          INSERT INTO auth.security_alerts (
            alert_type,
            severity,
            ip_address,
            user_agent,
            user_id,
            user_email,
            title,
            description
          ) VALUES ($1, $2, $3::inet, $4, $5, $6, $7, $8)
        `, [
          params.alertType,
          'low',
          params.ipAddress || null,
          params.userAgent || null,
          params.userId || null,
          params.userEmail || null,
          'Failed login attempt',
          `Failed login attempt for ${params.userEmail || 'unknown user'}`,
        ]);
      } catch {
        // Security alerts table might not exist yet
        console.warn('Could not create security alert - table may not exist');
      }
    }
  }

  /**
   * Log data access events
   */
  async logDataAccess(
    action: 'read' | 'create' | 'update' | 'delete',
    details: {
      userId?: string;
      userEmail?: string;
      resource: string;
      resourceId?: string;
      ipAddress?: string;
      userAgent?: string;
      success: boolean;
      changes?: Record<string, unknown>;
    }
  ): Promise<void> {
    await this.log({
      action: `data.${action}`,
      resource: details.resource,
      resourceId: details.resourceId,
      userId: details.userId,
      userEmail: details.userEmail,
      details: {
        success: details.success,
        changes: details.changes,
      },
      ipAddress: details.ipAddress,
      userAgent: details.userAgent,
      status: details.success ? 'success' : 'failure',
      severity: action === 'delete' ? 'high' : 'medium',
    });
  }

  /**
   * Log system events
   */
  async logSystemEvent(
    event: string,
    details: {
      severity: 'low' | 'medium' | 'high' | 'critical';
      message: string;
      data?: Record<string, unknown>;
    }
  ): Promise<void> {
    await this.log({
      action: `system.${event}`,
      resource: 'system',
      details: {
        message: details.message,
        ...details.data,
      },
      status: 'success',
      severity: details.severity,
    });
  }

  /**
   * Log security events
   */
  async logSecurityEvent(
    event: string,
    details: {
      userId?: string;
      userEmail?: string;
      ipAddress?: string;
      userAgent?: string;
      severity: 'medium' | 'high' | 'critical';
      message: string;
      data?: Record<string, unknown>;
    }
  ): Promise<void> {
    await this.log({
      action: `security.${event}`,
      resource: 'security',
      userId: details.userId,
      userEmail: details.userEmail,
      details: {
        message: details.message,
        ...details.data,
      },
      ipAddress: details.ipAddress,
      userAgent: details.userAgent,
      status: 'success',
      severity: details.severity,
    });

    // Create security alert for high/critical events
    if (details.severity === 'high' || details.severity === 'critical') {
      try {
        await db.query(`
          INSERT INTO auth.security_alerts (
            alert_type,
            severity,
            ip_address,
            user_agent,
            user_id,
            user_email,
            title,
            description,
            details
          ) VALUES ($1, $2, $3::inet, $4, $5, $6, $7, $8, $9)
        `, [
          'suspicious_activity',
          details.severity,
          details.ipAddress || null,
          details.userAgent || null,
          details.userId || null,
          details.userEmail || null,
          `Security: ${event}`,
          details.message,
          JSON.stringify(details.data || {}),
        ]);
      } catch {
        // Security alerts table might not exist
      }
    }
  }

  /**
   * Query audit logs - from database first, fallback to in-memory
   */
  async queryLogs(query: AuditLogQuery): Promise<AuditLogEntry[]> {
    // Try database first
    try {
      const params: unknown[] = [];
      let paramIndex = 1;
      let sql = `
        SELECT 
          id,
          action,
          resource,
          resource_id,
          user_id,
          details,
          severity,
          status,
          ip_address,
          user_agent,
          org_id,
          session_id,
          created_at
        FROM auth.audit_events
        WHERE 1=1
      `;

      if (query.userId) {
        sql += ` AND user_id = $${paramIndex}`;
        params.push(query.userId);
        paramIndex++;
      }

      if (query.action) {
        sql += ` AND action ILIKE $${paramIndex}`;
        params.push(`%${query.action}%`);
        paramIndex++;
      }

      if (query.resource) {
        sql += ` AND resource = $${paramIndex}`;
        params.push(query.resource);
        paramIndex++;
      }

      if (query.status) {
        sql += ` AND status = $${paramIndex}`;
        params.push(query.status);
        paramIndex++;
      }

      if (query.severity) {
        sql += ` AND severity = $${paramIndex}`;
        params.push(query.severity);
        paramIndex++;
      }

      if (query.startDate) {
        sql += ` AND created_at >= $${paramIndex}`;
        params.push(query.startDate);
        paramIndex++;
      }

      if (query.endDate) {
        sql += ` AND created_at <= $${paramIndex}`;
        params.push(query.endDate);
        paramIndex++;
      }

      sql += ` ORDER BY created_at DESC`;
      sql += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(query.limit || 100, query.offset || 0);

      const result = await db.query(sql, params);

      return result.rows.map(row => ({
        id: row.id,
        timestamp: row.created_at,
        action: row.action,
        resource: row.resource,
        resourceId: row.resource_id,
        userId: row.user_id,
        details: typeof row.details === 'string' ? JSON.parse(row.details) : row.details,
        severity: row.severity,
        status: row.status,
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        organizationId: row.org_id,
        sessionId: row.session_id,
      }));
    } catch {
      // Fallback to in-memory
    }

    // In-memory fallback
    let filteredLogs = this.logs;

    if (query.userId) {
      filteredLogs = filteredLogs.filter(log => log.userId === query.userId);
    }

    if (query.action) {
      filteredLogs = filteredLogs.filter(log => log.action.includes(query.action!));
    }

    if (query.resource) {
      filteredLogs = filteredLogs.filter(log => log.resource === query.resource);
    }

    if (query.status) {
      filteredLogs = filteredLogs.filter(log => log.status === query.status);
    }

    if (query.severity) {
      filteredLogs = filteredLogs.filter(log => log.severity === query.severity);
    }

    if (query.startDate) {
      filteredLogs = filteredLogs.filter(log => log.timestamp >= query.startDate!);
    }

    if (query.endDate) {
      filteredLogs = filteredLogs.filter(log => log.timestamp <= query.endDate!);
    }

    // Sort by timestamp (newest first)
    filteredLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply pagination
    const offset = query.offset || 0;
    const limit = query.limit || 100;

    return filteredLogs.slice(offset, offset + limit);
  }

  /**
   * Get audit statistics
   */
  async getStatistics(): Promise<{
    totalLogs: number;
    logsByStatus: Record<string, number>;
    logsBySeverity: Record<string, number>;
    logsByAction: Record<string, number>;
    recentActivity: number;
  }> {
    // Try database first
    try {
      const result = await db.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '1 hour') as recent
        FROM auth.audit_events
      `);

      const statusResult = await db.query(`
        SELECT status, COUNT(*) as count
        FROM auth.audit_events
        GROUP BY status
      `);

      const severityResult = await db.query(`
        SELECT severity, COUNT(*) as count
        FROM auth.audit_events
        GROUP BY severity
      `);

      const actionResult = await db.query(`
        SELECT SPLIT_PART(action, '.', 1) as action_type, COUNT(*) as count
        FROM auth.audit_events
        GROUP BY SPLIT_PART(action, '.', 1)
      `);

      return {
        totalLogs: parseInt(result.rows[0]?.total || '0'),
        logsByStatus: statusResult.rows.reduce((acc, row) => {
          acc[row.status] = parseInt(row.count);
          return acc;
        }, {} as Record<string, number>),
        logsBySeverity: severityResult.rows.reduce((acc, row) => {
          acc[row.severity] = parseInt(row.count);
          return acc;
        }, {} as Record<string, number>),
        logsByAction: actionResult.rows.reduce((acc, row) => {
          acc[row.action_type] = parseInt(row.count);
          return acc;
        }, {} as Record<string, number>),
        recentActivity: parseInt(result.rows[0]?.recent || '0'),
      };
    } catch {
      // Fallback to in-memory
    }

    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const logsByStatus = this.logs.reduce(
      (acc, log) => {
        acc[log.status] = (acc[log.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const logsBySeverity = this.logs.reduce(
      (acc, log) => {
        acc[log.severity] = (acc[log.severity] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const logsByAction = this.logs.reduce(
      (acc, log) => {
        const actionType = log.action.split('.')[0];
        acc[actionType] = (acc[actionType] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const recentActivity = this.logs.filter(log => log.timestamp >= oneHourAgo).length;

    return {
      totalLogs: this.logs.length,
      logsByStatus,
      logsBySeverity,
      logsByAction,
      recentActivity,
    };
  }

  /**
   * Clear old logs
   */
  async clearOldLogs(olderThanDays: number = 30): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    this.logs = this.logs.filter(log => log.timestamp >= cutoffDate);

    // Also clean database
    try {
      await db.query(`
        DELETE FROM auth.audit_events
        WHERE created_at < $1
      `, [cutoffDate]);
    } catch {
      // Table might not exist
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Send audit log to external service
   */
  private async sendToExternalService(log: AuditLogEntry): Promise<void> {
    if (!process.env.AUDIT_LOG_ENDPOINT) return;

    const response = await fetch(process.env.AUDIT_LOG_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.AUDIT_LOG_TOKEN}`,
      },
      body: JSON.stringify(log),
    });

    if (!response.ok) {
      throw new Error(`Failed to send audit log: ${response.statusText}`);
    }
  }
}

// Export singleton instance
export const auditLogger = new AuditLogger();

// Export convenience functions
export const logAuth = auditLogger.logAuth.bind(auditLogger);
export const logDataAccess = auditLogger.logDataAccess.bind(auditLogger);
export const logSystemEvent = auditLogger.logSystemEvent.bind(auditLogger);
export const logSecurityEvent = auditLogger.logSecurityEvent.bind(auditLogger);
export const queryAuditLogs = auditLogger.queryLogs.bind(auditLogger);
export const getAuditStatistics = auditLogger.getStatistics.bind(auditLogger);
