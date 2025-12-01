// @ts-nocheck

/**
 * Error Reporting and Analytics Utility
 * Provides comprehensive error tracking, reporting, and analytics for upload operations
 */

import type { UploadError, ErrorStatistics } from '@/lib/error-handling/upload-error-manager';
import { ErrorCategory, ErrorSeverity } from '@/lib/error-handling/upload-error-manager';

export interface ErrorReport {
  sessionId: string;
  correlationId: string;
  timestamp: Date;
  summary: ErrorReportSummary;
  detailedErrors: DetailedErrorEntry[];
  recommendations: string[];
  technicalDiagnostics: TechnicalDiagnostics;
  userActions: UserActionItem[];
}

export interface ErrorReportSummary {
  totalErrors: number;
  criticalErrors: number;
  recoverableErrors: number;
  affectedRowsCount: number;
  affectedRowsPercentage: number;
  estimatedFixTime: string;
  successRate: number;
  categoryBreakdown: Record<string, number>;
  severityBreakdown: Record<string, number>;
}

export interface DetailedErrorEntry {
  id: string;
  rowNumber?: number;
  fieldName?: string;
  errorCode: string;
  message: string;
  userMessage: string;
  severity: ErrorSeverity;
  category: ErrorCategory;
  originalValue?: unknown;
  expectedValue?: unknown;
  suggestion?: string;
  autoFixPossible: boolean;
  relatedErrors: string[];
  timestamp: Date;
}

export interface TechnicalDiagnostics {
  sessionDuration: number;
  fileSize: number;
  totalRows: number;
  processingRate: number;
  memoryUsage?: number;
  performanceMetrics: {
    parseTime: number;
    validationTime: number;
    importTime: number;
    totalTime: number;
  };
  systemInfo: {
    userAgent?: string;
    timestamp: Date;
    correlationId: string;
  };
}

export interface UserActionItem {
  priority: 'high' | 'medium' | 'low';
  action: string;
  description: string;
  estimatedTime: string;
  impact: string;
  requirements: string[];
  automated: boolean;
}

/**
 * Error Report Generator
 * Converts error manager data into comprehensive reports for different audiences
 */
export class ErrorReportGenerator {
  /**
   * Generate a comprehensive error report
   */
  static generateReport(
    sessionId: string,
    correlationId: string,
    errors: UploadError[],
    statistics: ErrorStatistics,
    sessionMetadata: {
      fileSize: number;
      totalRows: number;
      startTime: Date;
      endTime?: Date;
    }
  ): ErrorReport {
    const summary = this.generateSummary(errors, statistics, sessionMetadata);
    const detailedErrors = this.generateDetailedErrors(errors);
    const recommendations = this.generateRecommendations(errors, statistics);
    const diagnostics = this.generateTechnicalDiagnostics(sessionMetadata, correlationId);
    const userActions = this.generateUserActions(errors, statistics);

    return {
      sessionId,
      correlationId,
      timestamp: new Date(),
      summary,
      detailedErrors,
      recommendations,
      technicalDiagnostics: diagnostics,
      userActions,
    };
  }

  /**
   * Generate executive summary
   */
  private static generateSummary(
    errors: UploadError[],
    statistics: ErrorStatistics,
    sessionMetadata: unknown
  ): ErrorReportSummary {
    const criticalErrors = errors.filter(e => e.severity === ErrorSeverity.CRITICAL).length;
    const recoverableErrors = errors.filter(
      e => e.severity === ErrorSeverity.ERROR || e.severity === ErrorSeverity.WARNING
    ).length;

    const affectedRowsCount = statistics.affectedRows.length;
    const affectedRowsPercentage =
      sessionMetadata.totalRows > 0 ? (affectedRowsCount / sessionMetadata.totalRows) * 100 : 0;

    const successRate =
      sessionMetadata.totalRows > 0
        ? ((sessionMetadata.totalRows - affectedRowsCount) / sessionMetadata.totalRows) * 100
        : 0;

    const estimatedFixTime = this.estimateFixTime(errors, statistics);

    return {
      totalErrors: statistics.totalErrors,
      criticalErrors,
      recoverableErrors,
      affectedRowsCount,
      affectedRowsPercentage: Math.round(affectedRowsPercentage * 100) / 100,
      estimatedFixTime,
      successRate: Math.round(successRate * 100) / 100,
      categoryBreakdown: statistics.errorsByCategory,
      severityBreakdown: statistics.errorsBySeverity,
    };
  }

  /**
   * Generate detailed error entries
   */
  private static generateDetailedErrors(errors: UploadError[]): DetailedErrorEntry[] {
    return errors.map(error => ({
      id: error.id,
      rowNumber: error.context.rowNumber,
      fieldName: error.context.fieldName,
      errorCode: error.code,
      message: error.message,
      userMessage: error.userMessage,
      severity: error.severity,
      category: error.category,
      originalValue: error.context.originalValue,
      expectedValue: error.context.expectedType,
      suggestion: error.suggestion,
      autoFixPossible: this.isAutoFixPossible(error),
      relatedErrors: this.findRelatedErrors(error, errors),
      timestamp: error.context.timestamp,
    }));
  }

  /**
   * Generate actionable recommendations
   */
  private static generateRecommendations(
    errors: UploadError[],
    statistics: ErrorStatistics
  ): string[] {
    const recommendations: string[] = [];

    // Critical error recommendations
    const criticalErrors = errors.filter(e => e.severity === ErrorSeverity.CRITICAL);
    if (criticalErrors.length > 0) {
      recommendations.push(
        `🚨 Immediate Action Required: ${criticalErrors.length} critical error(s) need immediate attention before proceeding.`
      );
    }

    // Validation error patterns
    const validationErrors = errors.filter(e => e.category === ErrorCategory.VALIDATION);
    if (validationErrors.length > 5) {
      recommendations.push(
        `📋 Data Quality Issue: ${validationErrors.length} validation errors suggest systematic data quality problems. Consider reviewing data source and preparation process.`
      );
    }

    // Most common errors
    if (statistics.mostCommonErrors.length > 0) {
      const topError = statistics.mostCommonErrors[0];
      if (topError.count > statistics.totalErrors * 0.3) {
        recommendations.push(
          `🔁 Pattern Detected: "${topError.message}" accounts for ${topError.count} errors (${Math.round((topError.count / statistics.totalErrors) * 100)}% of total). Focus on fixing this pattern first for maximum impact.`
        );
      }
    }

    // Recovery rate assessment
    if (statistics.recoveryRate < 0.5) {
      recommendations.push(
        `⚠️ Low Recovery Rate: Only ${Math.round(statistics.recoveryRate * 100)}% of errors can be automatically recovered. Manual data correction may be required.`
      );
    }

    // Field-specific recommendations
    const fieldErrors = this.analyzeFieldErrors(errors);
    Object.entries(fieldErrors).forEach(([field, count]) => {
      if (count > 3) {
        recommendations.push(
          `📊 Field Issue: "${field}" has ${count} errors. Review data format and validation rules for this field.`
        );
      }
    });

    // File size and performance recommendations
    if (statistics.affectedRows.length > 100) {
      recommendations.push(
        `📁 Large Dataset: With ${statistics.affectedRows.length} affected rows, consider processing data in smaller batches for better error management.`
      );
    }

    return recommendations;
  }

  /**
   * Generate technical diagnostics
   */
  private static generateTechnicalDiagnostics(
    sessionMetadata: unknown,
    correlationId: string
  ): TechnicalDiagnostics {
    const sessionDuration = sessionMetadata.endTime
      ? sessionMetadata.endTime.getTime() - sessionMetadata.startTime.getTime()
      : Date.now() - sessionMetadata.startTime.getTime();

    const processingRate =
      sessionMetadata.totalRows > 0
        ? Math.round((sessionMetadata.totalRows / (sessionDuration / 1000)) * 100) / 100
        : 0;

    return {
      sessionDuration,
      fileSize: sessionMetadata.fileSize,
      totalRows: sessionMetadata.totalRows,
      processingRate,
      performanceMetrics: {
        parseTime: 0, // Would be populated from actual timing data
        validationTime: 0,
        importTime: 0,
        totalTime: sessionDuration,
      },
      systemInfo: {
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
        timestamp: new Date(),
        correlationId,
      },
    };
  }

  /**
   * Generate user action items
   */
  private static generateUserActions(
    errors: UploadError[],
    statistics: ErrorStatistics
  ): UserActionItem[] {
    const actions: UserActionItem[] = [];

    // Critical errors require immediate action
    const criticalErrors = errors.filter(e => e.severity === ErrorSeverity.CRITICAL);
    if (criticalErrors.length > 0) {
      actions.push({
        priority: 'high',
        action: 'Fix Critical Errors',
        description: `Address ${criticalErrors.length} critical error(s) that prevent upload completion`,
        estimatedTime: `${criticalErrors.length * 5} minutes`,
        impact: 'Unblocks upload process',
        requirements: ['Review error details', 'Fix data or system issues'],
        automated: false,
      });
    }

    // Data validation fixes
    const validationErrors = errors.filter(e => e.category === ErrorCategory.VALIDATION);
    if (validationErrors.length > 0) {
      actions.push({
        priority: 'high',
        action: 'Correct Data Validation Issues',
        description: `Fix ${validationErrors.length} data validation error(s)`,
        estimatedTime: `${Math.ceil(validationErrors.length / 5)} hours`,
        impact: 'Improves data quality and import success rate',
        requirements: ['Access to source data', 'Data editing tools'],
        automated: this.canAutoFixValidation(validationErrors),
      });
    }

    // Business rule violations
    const businessErrors = errors.filter(e => e.category === ErrorCategory.BUSINESS_LOGIC);
    if (businessErrors.length > 0) {
      actions.push({
        priority: 'medium',
        action: 'Review Business Rules',
        description: `Address ${businessErrors.length} business rule violation(s)`,
        estimatedTime: '30 minutes',
        impact: 'Ensures compliance with business requirements',
        requirements: ['Business rule documentation', 'Admin permissions'],
        automated: false,
      });
    }

    // Recovery actions
    if (statistics.recoveryRate > 0.7) {
      actions.push({
        priority: 'low',
        action: 'Auto-Fix Recoverable Errors',
        description: 'Apply automatic fixes for recoverable errors',
        estimatedTime: '5 minutes',
        impact: 'Reduces manual work and improves success rate',
        requirements: ['Confirmation of auto-fix rules'],
        automated: true,
      });
    }

    return actions.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Export report in different formats
   */
  static exportToCsv(report: ErrorReport): string {
    const csvRows = [
      ['Row Number', 'Field', 'Error Code', 'Message', 'Severity', 'Original Value', 'Suggestion'],
    ];

    report.detailedErrors.forEach(error => {
      csvRows.push([
        error.rowNumber?.toString() || '',
        error.fieldName || '',
        error.errorCode,
        error.message,
        error.severity,
        error.originalValue?.toString() || '',
        error.suggestion || '',
      ]);
    });

    return csvRows
      .map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
      .join('\n');
  }

  static exportToJson(report: ErrorReport): string {
    return JSON.stringify(report, null, 2);
  }

  static exportToHtml(report: ErrorReport): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Upload Error Report - ${report.sessionId}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .summary { background: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .error { margin: 10px 0; padding: 10px; border-left: 4px solid #e74c3c; background: #fdf2f2; }
        .warning { border-left-color: #f39c12; background: #fef9e7; }
        .critical { border-left-color: #c0392b; background: #fdedec; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <h1>Upload Error Report</h1>
    <div class="summary">
        <h2>Summary</h2>
        <p><strong>Session ID:</strong> ${report.sessionId}</p>
        <p><strong>Total Errors:</strong> ${report.summary.totalErrors}</p>
        <p><strong>Success Rate:</strong> ${report.summary.successRate}%</p>
        <p><strong>Affected Rows:</strong> ${report.summary.affectedRowsCount} (${report.summary.affectedRowsPercentage}%)</p>
    </div>

    <h2>Recommendations</h2>
    <ul>
        ${report.recommendations.map(rec => `<li>${rec}</li>`).join('')}
    </ul>

    <h2>Detailed Errors</h2>
    <table>
        <thead>
            <tr>
                <th>Row</th>
                <th>Field</th>
                <th>Error</th>
                <th>Severity</th>
                <th>Suggestion</th>
            </tr>
        </thead>
        <tbody>
            ${report.detailedErrors
              .map(
                error => `
                <tr class="${error.severity}">
                    <td>${error.rowNumber || ''}</td>
                    <td>${error.fieldName || ''}</td>
                    <td>${error.userMessage}</td>
                    <td>${error.severity}</td>
                    <td>${error.suggestion || ''}</td>
                </tr>
            `
              )
              .join('')}
        </tbody>
    </table>
</body>
</html>
    `;
  }

  // Helper methods
  private static estimateFixTime(errors: UploadError[], statistics: ErrorStatistics): string {
    const criticalCount = errors.filter(e => e.severity === ErrorSeverity.CRITICAL).length;
    const errorCount = errors.filter(e => e.severity === ErrorSeverity.ERROR).length;
    const warningCount = errors.filter(e => e.severity === ErrorSeverity.WARNING).length;

    const estimatedMinutes = criticalCount * 10 + errorCount * 5 + warningCount * 2;

    if (estimatedMinutes < 60) {
      return `${estimatedMinutes} minutes`;
    } else if (estimatedMinutes < 1440) {
      return `${Math.ceil(estimatedMinutes / 60)} hours`;
    } else {
      return `${Math.ceil(estimatedMinutes / 1440)} days`;
    }
  }

  private static isAutoFixPossible(error: UploadError): boolean {
    // Auto-fix is possible for certain validation errors
    const autoFixableCodes = ['VALIDATION_INVALID_FORMAT', 'VALIDATION_VALUE_OUT_OF_RANGE'];
    return autoFixableCodes.includes(error.code);
  }

  private static findRelatedErrors(error: UploadError, allErrors: UploadError[]): string[] {
    return allErrors
      .filter(
        e =>
          e.id !== error.id &&
          (e.context.rowNumber === error.context.rowNumber ||
            e.context.fieldName === error.context.fieldName)
      )
      .map(e => e.id);
  }

  private static analyzeFieldErrors(errors: UploadError[]): Record<string, number> {
    const fieldErrors: Record<string, number> = {};

    errors.forEach(error => {
      if (error.context.fieldName) {
        fieldErrors[error.context.fieldName] = (fieldErrors[error.context.fieldName] || 0) + 1;
      }
    });

    return fieldErrors;
  }

  private static canAutoFixValidation(validationErrors: UploadError[]): boolean {
    return validationErrors.some(error => this.isAutoFixPossible(error));
  }
}

/**
 * Error Analytics for trend analysis and improvement insights
 */
export class ErrorAnalytics {
  /**
   * Analyze error trends across multiple sessions
   */
  static analyzeTrends(reports: ErrorReport[]): {
    commonPatterns: { pattern: string; frequency: number; impact: string }[];
    improvementAreas: string[];
    successRateTrend: { date: Date; rate: number }[];
    categoryTrends: Record<string, number[]>;
  } {
    // Implementation would analyze patterns across multiple reports
    // This is a placeholder for demonstration
    return {
      commonPatterns: [],
      improvementAreas: [],
      successRateTrend: [],
      categoryTrends: {},
    };
  }

  /**
   * Generate improvement recommendations based on historical data
   */
  static generateImprovementPlan(reports: ErrorReport[]): {
    priority: 'high' | 'medium' | 'low';
    area: string;
    recommendation: string;
    expectedImpact: string;
    effort: string;
  }[] {
    // Implementation would analyze historical patterns
    // This is a placeholder for demonstration
    return [];
  }
}
