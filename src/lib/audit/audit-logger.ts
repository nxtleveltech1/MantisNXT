/**
 * Audit logging system for tracking user actions and system events
 */

export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  userId?: string;
  userEmail?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: Record<string, any>;
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

    // In production, this would also save to database
    console.log('Audit Log:', auditEntry);

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
      changes?: Record<string, any>;
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
      data?: Record<string, any>;
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
      data?: Record<string, any>;
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
  }

  /**
   * Query audit logs
   */
  async queryLogs(query: AuditLogQuery): Promise<AuditLogEntry[]> {
    let filteredLogs = this.logs;

    if (query.userId) {
      filteredLogs = filteredLogs.filter(log => log.userId === query.userId);
    }

    if (query.action) {
      filteredLogs = filteredLogs.filter(log => log.action.includes(query.action));
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

