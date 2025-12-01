// @ts-nocheck

import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { withTransaction } from '@/lib/database';
import { getSupplierById as getSsotSupplierById } from '@/services/ssot/supplierService';

export interface ErrorContext {
  operation: string;
  uploadId?: string;
  supplierId?: string;
  fileName?: string;
  rowIndex?: number;
  field?: string;
  additionalData?: Record<string, unknown>;
}

export interface ErrorLog {
  id: string;
  level: 'info' | 'warn' | 'error' | 'critical';
  operation: string;
  message: string;
  errorCode?: string;
  context: ErrorContext;
  stackTrace?: string;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
}

export class UploadErrorHandler {
  /**
   * Handle and log errors with context
   */
  static async handleError(
    error: Error | unknown,
    context: ErrorContext,
    level: ErrorLog['level'] = 'error'
  ): Promise<ErrorLog> {
    const errorLog: ErrorLog = {
      id: randomUUID(),
      level,
      operation: context.operation,
      message: error instanceof Error ? error.message : String(error),
      errorCode: this.getErrorCode(error),
      context,
      stackTrace: error instanceof Error ? error.stack : undefined,
      timestamp: new Date(),
      resolved: false,
    };

    // Log to console (in production, this would go to a proper logging service)
    this.logToConsole(errorLog);

    // Save to database
    await this.saveErrorLog(errorLog);

    // Send alerts for critical errors
    if (level === 'critical') {
      await this.sendCriticalAlert(errorLog);
    }

    return errorLog;
  }

  /**
   * Create standardized API error responses
   */
  static createApiErrorResponse(
    error: Error | unknown,
    context: ErrorContext,
    statusCode: number = 500
  ): NextResponse {
    const errorId = randomUUID();

    // Log the error
    this.handleError(error, context, statusCode >= 500 ? 'error' : 'warn');

    // Determine error message for client
    const clientMessage = this.getClientSafeMessage(error, statusCode);

    return NextResponse.json(
      {
        error: clientMessage,
        errorId,
        timestamp: new Date().toISOString(),
        operation: context.operation,
      },
      { status: statusCode }
    );
  }

  /**
   * Validate upload file and return appropriate errors
   */
  static validateUploadFile(file: File): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // File size validation
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      errors.push(
        `File size (${this.formatFileSize(file.size)}) exceeds maximum allowed size (50MB)`
      );
    }

    if (file.size === 0) {
      errors.push('File is empty');
    }

    // File type validation
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/json',
    ];

    if (!allowedTypes.includes(file.type)) {
      errors.push(
        `File type "${file.type}" is not supported. Please upload CSV, Excel (.xlsx, .xls), or JSON files.`
      );
    }

    // File name validation
    if (file.name.length > 255) {
      errors.push('File name is too long (maximum 255 characters)');
    }

    const invalidChars = /[<>:"|?*]/;
    if (invalidChars.test(file.name)) {
      errors.push('File name contains invalid characters');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate supplier ID
   */
  static async validateSupplier(supplierId: string): Promise<{ valid: boolean; error?: string }> {
    if (!supplierId || typeof supplierId !== 'string') {
      return { valid: false, error: 'Supplier ID is required' };
    }

    if (supplierId.length < 1 || supplierId.length > 50) {
      return { valid: false, error: 'Invalid supplier ID format' };
    }

    try {
      const supplier = await getSsotSupplierById(supplierId);
      if (!supplier || supplier.status !== 'active') {
        return { valid: false, error: 'Supplier not found or inactive' };
      }

      return { valid: true };
    } catch (error) {
      await this.handleError(error, {
        operation: 'validate_supplier',
        supplierId,
      });

      return { valid: false, error: 'Failed to validate supplier' };
    }
  }

  /**
   * Handle upload processing errors with recovery suggestions
   */
  static handleUploadProcessingError(
    error: Error | unknown,
    context: ErrorContext
  ): { error: string; suggestions: string[]; recoverable: boolean } {
    const suggestions: string[] = [];
    let recoverable = true;
    let errorMessage = 'An error occurred during upload processing';

    if (error instanceof Error) {
      errorMessage = error.message;

      // Parse error and provide specific suggestions
      if (errorMessage.includes('ENOENT') || errorMessage.includes('file not found')) {
        suggestions.push('Ensure the uploaded file exists and is accessible');
        suggestions.push('Try uploading the file again');
        recoverable = true;
      }

      if (errorMessage.includes('Invalid JSON') || errorMessage.includes('JSON.parse')) {
        suggestions.push('Check that your JSON file is properly formatted');
        suggestions.push('Validate your JSON structure using an online validator');
        recoverable = true;
      }

      if (errorMessage.includes('CSV') || errorMessage.includes('delimiter')) {
        suggestions.push('Ensure your CSV file uses proper delimiters (comma, semicolon, or tab)');
        suggestions.push('Check that your CSV file has a header row');
        recoverable = true;
      }

      if (errorMessage.includes('Excel') || errorMessage.includes('XLSX')) {
        suggestions.push('Ensure your Excel file is not corrupted');
        suggestions.push('Try saving as CSV and uploading again');
        suggestions.push('Check that the Excel file contains data in the first sheet');
        recoverable = true;
      }

      if (errorMessage.includes('memory') || errorMessage.includes('heap')) {
        suggestions.push('Your file may be too large - try splitting it into smaller files');
        suggestions.push('Remove unnecessary columns to reduce file size');
        recoverable = true;
      }

      if (errorMessage.includes('database') || errorMessage.includes('connection')) {
        suggestions.push('Database connection issue - please try again in a few moments');
        recoverable = true;
      }

      if (errorMessage.includes('timeout')) {
        suggestions.push('Processing took too long - try uploading a smaller file');
        suggestions.push('Check your network connection');
        recoverable = true;
      }

      if (errorMessage.includes('permission') || errorMessage.includes('access denied')) {
        suggestions.push('You may not have permission to perform this operation');
        recoverable = false;
      }

      if (errorMessage.includes('constraint') || errorMessage.includes('unique')) {
        suggestions.push('Data conflicts with existing records');
        suggestions.push('Check for duplicate SKUs or part numbers');
        recoverable = true;
      }

      // Add generic suggestions if none specific
      if (suggestions.length === 0) {
        suggestions.push('Check your file format and data structure');
        suggestions.push('Try uploading a smaller sample file first');
        suggestions.push('Contact support if the problem persists');
      }
    }

    // Log the error
    this.handleError(error, context, 'error');

    return {
      error: errorMessage,
      suggestions,
      recoverable,
    };
  }

  /**
   * Get error metrics for monitoring
   */
  static async getErrorMetrics(timeRange: 'hour' | 'day' | 'week' = 'day'): Promise<{
    totalErrors: number;
    errorsByLevel: Record<string, number>;
    errorsByOperation: Record<string, number>;
    topErrors: Array<{ message: string; count: number }>;
    resolvedRate: number;
  }> {
    try {
      return await withTransaction(async client => {
        let interval = '1 day';
        if (timeRange === 'hour') interval = '1 hour';
        if (timeRange === 'week') interval = '7 days';

        // Get total errors
        const totalResult = await client.query(`
          SELECT COUNT(*) as total
          FROM error_logs
          WHERE timestamp >= NOW() - INTERVAL '${interval}'
        `);

        const totalErrors = parseInt(totalResult.rows[0]?.total || '0');

        if (totalErrors === 0) {
          return {
            totalErrors: 0,
            errorsByLevel: {},
            errorsByOperation: {},
            topErrors: [],
            resolvedRate: 100,
          };
        }

        // Get errors by level
        const levelResult = await client.query(`
          SELECT level, COUNT(*) as count
          FROM error_logs
          WHERE timestamp >= NOW() - INTERVAL '${interval}'
          GROUP BY level
        `);

        const errorsByLevel = levelResult.rows.reduce(
          (acc, row) => {
            acc[row.level] = parseInt(row.count);
            return acc;
          },
          {} as Record<string, number>
        );

        // Get errors by operation
        const operationResult = await client.query(`
          SELECT operation, COUNT(*) as count
          FROM error_logs
          WHERE timestamp >= NOW() - INTERVAL '${interval}'
          GROUP BY operation
          ORDER BY count DESC
          LIMIT 10
        `);

        const errorsByOperation = operationResult.rows.reduce(
          (acc, row) => {
            acc[row.operation] = parseInt(row.count);
            return acc;
          },
          {} as Record<string, number>
        );

        // Get top error messages
        const topErrorsResult = await client.query(`
          SELECT message, COUNT(*) as count
          FROM error_logs
          WHERE timestamp >= NOW() - INTERVAL '${interval}'
          GROUP BY message
          ORDER BY count DESC
          LIMIT 5
        `);

        const topErrors = topErrorsResult.rows.map(row => ({
          message: row.message,
          count: parseInt(row.count),
        }));

        // Get resolved rate
        const resolvedResult = await client.query(`
          SELECT
            COUNT(*) FILTER (WHERE resolved = true) as resolved,
            COUNT(*) as total
          FROM error_logs
          WHERE timestamp >= NOW() - INTERVAL '${interval}'
        `);

        const resolved = parseInt(resolvedResult.rows[0]?.resolved || '0');
        const total = parseInt(resolvedResult.rows[0]?.total || '1');
        const resolvedRate = Math.round((resolved / total) * 100);

        return {
          totalErrors,
          errorsByLevel,
          errorsByOperation,
          topErrors,
          resolvedRate,
        };
      });
    } catch (error) {
      console.error('Failed to get error metrics:', error);
      return {
        totalErrors: 0,
        errorsByLevel: {},
        errorsByOperation: {},
        topErrors: [],
        resolvedRate: 0,
      };
    }
  }

  /**
   * Private helper methods
   */
  private static getErrorCode(error: Error | unknown): string | undefined {
    if (error instanceof Error) {
      // Extract error codes from known error types
      if ('code' in error) {
        return error.code as string;
      }

      // Parse common error patterns
      if (error.message.includes('ENOENT')) return 'FILE_NOT_FOUND';
      if (error.message.includes('EACCES')) return 'ACCESS_DENIED';
      if (error.message.includes('timeout')) return 'TIMEOUT';
      if (error.message.includes('connection')) return 'CONNECTION_ERROR';
      if (error.message.includes('JSON')) return 'INVALID_JSON';
      if (error.message.includes('CSV')) return 'INVALID_CSV';
      if (error.message.includes('Excel') || error.message.includes('XLSX')) return 'INVALID_EXCEL';
    }

    return undefined;
  }

  private static getClientSafeMessage(error: Error | unknown, statusCode: number): string {
    // Never expose sensitive information to the client
    if (statusCode >= 500) {
      return 'An internal server error occurred. Please try again later.';
    }

    if (error instanceof Error) {
      // Filter out sensitive information
      const message = error.message;
      if (message.includes('password') || message.includes('secret') || message.includes('key')) {
        return 'A configuration error occurred. Please contact support.';
      }

      // Return sanitized client-safe messages
      return message;
    }

    return 'An error occurred while processing your request.';
  }

  private static logToConsole(errorLog: ErrorLog): void {
    const prefix = `[${errorLog.level.toUpperCase()}] ${errorLog.operation}:`;

    switch (errorLog.level) {
      case 'critical':
        console.error(`🚨 ${prefix}`, errorLog.message, errorLog.context);
        break;
      case 'error':
        console.error(`❌ ${prefix}`, errorLog.message, errorLog.context);
        break;
      case 'warn':
        console.warn(`⚠️ ${prefix}`, errorLog.message, errorLog.context);
        break;
      case 'info':
        console.info(`ℹ️ ${prefix}`, errorLog.message, errorLog.context);
        break;
    }

    if (errorLog.stackTrace && errorLog.level !== 'info') {
      console.error('Stack trace:', errorLog.stackTrace);
    }
  }

  private static async saveErrorLog(errorLog: ErrorLog): Promise<void> {
    try {
      await withTransaction(async client => {
        await client.query(
          `
          INSERT INTO error_logs (
            id, level, operation, message, error_code, context,
            stack_trace, timestamp, resolved
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `,
          [
            errorLog.id,
            errorLog.level,
            errorLog.operation,
            errorLog.message,
            errorLog.errorCode,
            JSON.stringify(errorLog.context),
            errorLog.stackTrace,
            errorLog.timestamp,
            errorLog.resolved,
          ]
        );
      });
    } catch (dbError) {
      // If we can't save to database, at least log to console
      console.error('Failed to save error log to database:', dbError);
    }
  }

  private static async sendCriticalAlert(errorLog: ErrorLog): Promise<void> {
    // In a production environment, this would send alerts via:
    // - Email notifications
    // - Slack/Teams webhooks
    // - SMS alerts
    // - Monitoring services (DataDog, New Relic, etc.)

    console.error('🚨 CRITICAL ALERT:', {
      operation: errorLog.operation,
      message: errorLog.message,
      context: errorLog.context,
      timestamp: errorLog.timestamp,
    });

    // TODO: Implement actual alerting mechanism
  }

  private static formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${Math.round(size * 100) / 100} ${units[unitIndex]}`;
  }
}
