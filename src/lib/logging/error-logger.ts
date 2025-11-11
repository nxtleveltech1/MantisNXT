/**
 * Error Logging System
 * Logs errors internally WITHOUT exposing sensitive data to users
 */

import { sanitizeError } from '@/lib/errors/error-messages';

export interface ErrorLogEntry {
  id: string;
  timestamp: string;
  level: 'error' | 'warning' | 'info';
  message: string;
  error?: {
    name: string;
    message: string;
    type: string;
    severity: string;
  };
  context?: {
    endpoint?: string;
    method?: string;
    userId?: string;
    userAgent?: string;
    url?: string;
    component?: string;
  };
  metadata?: Record<string, unknown>;
}

class ErrorLogger {
  private logs: ErrorLogEntry[] = [];
  private maxLogs = 1000; // Keep last 1000 logs in memory
  private isProduction = process.env.NODE_ENV === 'production';

  /**
   * Log an error
   */
  logError(
    error: Error,
    context?: {
      endpoint?: string;
      method?: string;
      userId?: string;
      component?: string;
    },
    metadata?: Record<string, unknown>
  ): string {
    const id = this.generateLogId();
    const sanitized = sanitizeError(error);

    const logEntry: ErrorLogEntry = {
      id,
      timestamp: new Date().toISOString(),
      level: 'error',
      message: error.message,
      error: sanitized,
      context: this.sanitizeContext(context),
      metadata: this.sanitizeMetadata(metadata)
    };

    this.addLog(logEntry);
    this.sendToLoggingService(logEntry);

    return id;
  }

  /**
   * Log a warning
   */
  logWarning(
    message: string,
    context?: {
      endpoint?: string;
      component?: string;
    },
    metadata?: Record<string, unknown>
  ): string {
    const id = this.generateLogId();

    const logEntry: ErrorLogEntry = {
      id,
      timestamp: new Date().toISOString(),
      level: 'warning',
      message,
      context: this.sanitizeContext(context),
      metadata: this.sanitizeMetadata(metadata)
    };

    this.addLog(logEntry);

    // Only send warnings to service in production
    if (this.isProduction) {
      this.sendToLoggingService(logEntry);
    }

    return id;
  }

  /**
   * Log info
   */
  logInfo(
    message: string,
    metadata?: Record<string, unknown>
  ): string {
    const id = this.generateLogId();

    const logEntry: ErrorLogEntry = {
      id,
      timestamp: new Date().toISOString(),
      level: 'info',
      message,
      metadata: this.sanitizeMetadata(metadata)
    };

    // Only add to memory logs, don't send info to external service
    this.addLog(logEntry);

    return id;
  }

  /**
   * Get logs by level
   */
  getLogs(level?: 'error' | 'warning' | 'info', limit = 100): ErrorLogEntry[] {
    let filtered = this.logs;

    if (level) {
      filtered = filtered.filter(log => log.level === level);
    }

    return filtered.slice(-limit);
  }

  /**
   * Get log by ID
   */
  getLogById(id: string): ErrorLogEntry | undefined {
    return this.logs.find(log => log.id === id);
  }

  /**
   * Clear logs
   */
  clearLogs(level?: 'error' | 'warning' | 'info'): void {
    if (level) {
      this.logs = this.logs.filter(log => log.level !== level);
    } else {
      this.logs = [];
    }
  }

  /**
   * Get error statistics
   */
  getStats(): {
    total: number;
    errors: number;
    warnings: number;
    info: number;
    recentErrors: number;
  } {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;

    return {
      total: this.logs.length,
      errors: this.logs.filter(log => log.level === 'error').length,
      warnings: this.logs.filter(log => log.level === 'warning').length,
      info: this.logs.filter(log => log.level === 'info').length,
      recentErrors: this.logs.filter(
        log => log.level === 'error' && new Date(log.timestamp).getTime() > oneHourAgo
      ).length
    };
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private generateLogId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 9);
    return `log_${timestamp}_${random}`;
  }

  private addLog(logEntry: ErrorLogEntry): void {
    this.logs.push(logEntry);

    // Keep only last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Log to console in development
    if (!this.isProduction) {
      this.logToConsole(logEntry);
    }
  }

  private logToConsole(logEntry: ErrorLogEntry): void {
    const emoji = {
      error: '🚨',
      warning: '⚠️',
      info: 'ℹ️'
    }[logEntry.level];

    const style = {
      error: 'color: #ef4444; font-weight: bold',
      warning: 'color: #f59e0b; font-weight: bold',
      info: 'color: #3b82f6'
    }[logEntry.level];

    console.log(
      `%c${emoji} [${logEntry.level.toUpperCase()}] ${logEntry.message}`,
      style,
      {
        id: logEntry.id,
        timestamp: logEntry.timestamp,
        error: logEntry.error,
        context: logEntry.context,
        metadata: logEntry.metadata
      }
    );
  }

  private async sendToLoggingService(logEntry: ErrorLogEntry): Promise<void> {
    if (!this.isProduction) {
      return; // Don't send to external service in development
    }

    try {
      // Send to error tracking service (e.g., Sentry, LogRocket, DataDog)
      // Example implementation:
      /*
      await fetch('/api/errors/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logEntry)
      });
      */

      // For now, we'll just log that we would send it
      console.log('Would send to logging service:', logEntry.id);
    } catch (error) {
      // Silently fail if logging service fails
      // Don't want logging failures to break the app
      console.error('Failed to send log to service:', error);
    }
  }

  private sanitizeContext(context?: Record<string, unknown>): Record<string, unknown> | undefined {
    if (!context) return undefined;

    // Remove sensitive data from context
    const sanitized = { ...context };

    // Remove password, token, secret, etc.
    Object.keys(sanitized).forEach(key => {
      const lowerKey = key.toLowerCase();
      if (
        lowerKey.includes('password') ||
        lowerKey.includes('token') ||
        lowerKey.includes('secret') ||
        lowerKey.includes('key') ||
        lowerKey.includes('auth')
      ) {
        sanitized[key] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  private sanitizeMetadata(metadata?: Record<string, unknown>): Record<string, unknown> | undefined {
    if (!metadata) return undefined;

    // Remove sensitive data from metadata
    return this.sanitizeContext(metadata);
  }
}

// Export singleton instance
export const errorLogger = new ErrorLogger();

// Export convenience functions
export const logError = errorLogger.logError.bind(errorLogger);
export const logWarning = errorLogger.logWarning.bind(errorLogger);
export const logInfo = errorLogger.logInfo.bind(errorLogger);
export const getErrorLogs = errorLogger.getLogs.bind(errorLogger);
export const getErrorStats = errorLogger.getStats.bind(errorLogger);
