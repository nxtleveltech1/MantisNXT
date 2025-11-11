/**
 * Comprehensive Error Management System for Pricelist Upload
 * Provides structured error handling, user feedback, and recovery mechanisms
 */


// Error severity levels
export enum ErrorSeverity {
  CRITICAL = 'critical',
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info'
}

// Error categories for better classification
export enum ErrorCategory {
  VALIDATION = 'validation',
  DATABASE = 'database',
  FILE_PROCESSING = 'file_processing',
  BUSINESS_LOGIC = 'business_logic',
  NETWORK = 'network',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  SYSTEM = 'system'
}

// Error context for detailed tracking
export interface ErrorContext {
  userId?: string
  sessionId?: string
  supplierId?: string
  rowNumber?: number
  fieldName?: string
  originalValue?: unknown
  expectedType?: string
  stackTrace?: string
  timestamp: Date
  userAgent?: string
  correlationId?: string
}

// Structured error object
export interface UploadError {
  id: string
  code: string
  message: string
  severity: ErrorSeverity
  category: ErrorCategory
  context: ErrorContext
  suggestion?: string
  recoveryActions?: RecoveryAction[]
  userMessage: string
  technicalDetails?: Record<string, unknown>
}

// Recovery action interface
export interface RecoveryAction {
  id: string
  label: string
  description: string
  action: 'retry' | 'skip' | 'fix_data' | 'contact_support' | 'rollback'
  parameters?: Record<string, unknown>
  automated?: boolean
}

// Error statistics for reporting
export interface ErrorStatistics {
  totalErrors: number
  errorsBySeverity: Record<ErrorSeverity, number>
  errorsByCategory: Record<ErrorCategory, number>
  mostCommonErrors: { code: string; count: number; message: string }[]
  affectedRows: number[]
  recoveryRate: number
}

// User feedback message structure
export interface UserFeedback {
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
  details?: string[]
  actions?: {
    label: string
    action: string
    variant?: 'primary' | 'secondary' | 'destructive'
  }[]
  dismissible?: boolean
  persistent?: boolean
  correlationId?: string
}

/**
 * Central error management class for upload operations
 */
export class UploadErrorManager {
  private errors: Map<string, UploadError> = new Map()
  private errorCounts: Map<string, number> = new Map()
  private correlationId: string
  private sessionId: string

  constructor(sessionId: string, correlationId?: string) {
    this.sessionId = sessionId
    this.correlationId = correlationId || this.generateCorrelationId()
  }

  /**
   * Record a new error with comprehensive context
   */
  recordError(
    code: string,
    message: string,
    severity: ErrorSeverity,
    category: ErrorCategory,
    context: Partial<ErrorContext> = {},
    suggestion?: string
  ): UploadError {
    const errorId = this.generateErrorId()
    const fullContext: ErrorContext = {
      ...context,
      sessionId: this.sessionId,
      timestamp: new Date(),
      correlationId: this.correlationId
    }

    const error: UploadError = {
      id: errorId,
      code,
      message,
      severity,
      category,
      context: fullContext,
      suggestion,
      recoveryActions: this.generateRecoveryActions(code, category),
      userMessage: this.generateUserMessage(code, message, severity),
      technicalDetails: this.generateTechnicalDetails(context)
    }

    this.errors.set(errorId, error)
    this.incrementErrorCount(code)

    return error
  }

  /**
   * Record validation error with field-specific context
   */
  recordValidationError(
    rowNumber: number,
    fieldName: string,
    originalValue: unknown,
    expectedType: string,
    message: string,
    suggestion?: string
  ): UploadError {
    return this.recordError(
      `VALIDATION_${fieldName.toUpperCase()}_INVALID`,
      message,
      ErrorSeverity.ERROR,
      ErrorCategory.VALIDATION,
      { rowNumber, fieldName, originalValue, expectedType },
      suggestion
    )
  }

  /**
   * Record database operation error
   */
  recordDatabaseError(
    operation: string,
    tableName: string,
    error: Error,
    context: Partial<ErrorContext> = {}
  ): UploadError {
    return this.recordError(
      `DATABASE_${operation.toUpperCase()}_FAILED`,
      `Database ${operation} failed: ${error.message}`,
      ErrorSeverity.CRITICAL,
      ErrorCategory.DATABASE,
      { ...context, stackTrace: error.stack },
      'Check database connectivity and try again'
    )
  }

  /**
   * Record business logic violation
   */
  recordBusinessLogicError(
    rule: string,
    rowNumber: number,
    details: Record<string, unknown>,
    message: string
  ): UploadError {
    return this.recordError(
      `BUSINESS_RULE_${rule.toUpperCase()}_VIOLATION`,
      message,
      ErrorSeverity.WARNING,
      ErrorCategory.BUSINESS_LOGIC,
      { rowNumber, ...details },
      'Review data and ensure it meets business requirements'
    )
  }

  /**
   * Generate user-friendly feedback messages
   */
  generateUserFeedback(errors: UploadError[]): UserFeedback[] {
    if (errors.length === 0) {
      return [{
        type: 'success',
        title: 'Upload Successful',
        message: 'All records were processed successfully.',
        dismissible: true
      }]
    }

    const feedback: UserFeedback[] = []
    const groupedErrors = this.groupErrorsByCategory(errors)

    // Critical errors - immediate attention required
    const criticalErrors = errors.filter(e => e.severity === ErrorSeverity.CRITICAL)
    if (criticalErrors.length > 0) {
      feedback.push({
        type: 'error',
        title: 'Critical Errors Detected',
        message: `${criticalErrors.length} critical error(s) prevented upload completion.`,
        details: criticalErrors.map(e => e.userMessage),
        actions: [{
          label: 'View Details',
          action: 'show_error_details',
          variant: 'primary'
        }, {
          label: 'Contact Support',
          action: 'contact_support',
          variant: 'secondary'
        }],
        persistent: true,
        correlationId: this.correlationId
      })
    }

    // Validation errors summary
    const validationErrors = groupedErrors.get(ErrorCategory.VALIDATION) || []
    if (validationErrors.length > 0) {
      const affectedRows = new Set(validationErrors.map(e => e.context.rowNumber).filter(Boolean))
      feedback.push({
        type: 'warning',
        title: 'Data Validation Issues',
        message: `${validationErrors.length} validation error(s) found in ${affectedRows.size} row(s).`,
        details: this.summarizeValidationErrors(validationErrors),
        actions: [{
          label: 'Fix Data',
          action: 'fix_validation_errors',
          variant: 'primary'
        }, {
          label: 'Skip Invalid Rows',
          action: 'skip_invalid_rows',
          variant: 'secondary'
        }],
        dismissible: true
      })
    }

    // Business rule violations
    const businessErrors = groupedErrors.get(ErrorCategory.BUSINESS_LOGIC) || []
    if (businessErrors.length > 0) {
      feedback.push({
        type: 'info',
        title: 'Business Rule Notices',
        message: `${businessErrors.length} record(s) require attention for business rules.`,
        details: businessErrors.map(e => e.userMessage),
        actions: [{
          label: 'Review Rules',
          action: 'review_business_rules',
          variant: 'secondary'
        }],
        dismissible: true
      })
    }

    return feedback
  }

  /**
   * Generate error statistics for reporting
   */
  generateStatistics(): ErrorStatistics {
    const errors = Array.from(this.errors.values())

    const errorsBySeverity = {
      [ErrorSeverity.CRITICAL]: 0,
      [ErrorSeverity.ERROR]: 0,
      [ErrorSeverity.WARNING]: 0,
      [ErrorSeverity.INFO]: 0
    }

    const errorsByCategory = {
      [ErrorCategory.VALIDATION]: 0,
      [ErrorCategory.DATABASE]: 0,
      [ErrorCategory.FILE_PROCESSING]: 0,
      [ErrorCategory.BUSINESS_LOGIC]: 0,
      [ErrorCategory.NETWORK]: 0,
      [ErrorCategory.AUTHENTICATION]: 0,
      [ErrorCategory.AUTHORIZATION]: 0,
      [ErrorCategory.SYSTEM]: 0
    }

    errors.forEach(error => {
      errorsBySeverity[error.severity]++
      errorsByCategory[error.category]++
    })

    const mostCommonErrors = Array.from(this.errorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([code, count]) => {
        const error = errors.find(e => e.code === code)
        return {
          code,
          count,
          message: error?.message || 'Unknown error'
        }
      })

    const affectedRows = [...new Set(
      errors
        .map(e => e.context.rowNumber)
        .filter(Boolean)
        .sort((a, b) => a! - b!)
    )] as number[]

    const totalErrors = errors.length
    const recoveredErrors = errors.filter(e =>
      e.recoveryActions?.some(action => action.automated)
    ).length
    const recoveryRate = totalErrors > 0 ? recoveredErrors / totalErrors : 0

    return {
      totalErrors,
      errorsBySeverity,
      errorsByCategory,
      mostCommonErrors,
      affectedRows,
      recoveryRate
    }
  }

  /**
   * Get errors for specific context
   */
  getErrorsForRow(rowNumber: number): UploadError[] {
    return Array.from(this.errors.values())
      .filter(error => error.context.rowNumber === rowNumber)
  }

  getErrorsByCategory(category: ErrorCategory): UploadError[] {
    return Array.from(this.errors.values())
      .filter(error => error.category === category)
  }

  getErrorsBySeverity(severity: ErrorSeverity): UploadError[] {
    return Array.from(this.errors.values())
      .filter(error => error.severity === severity)
  }

  /**
   * Clear errors for recovery operations
   */
  clearErrors(filter?: (error: UploadError) => boolean): void {
    if (filter) {
      for (const [id, error] of this.errors.entries()) {
        if (filter(error)) {
          this.errors.delete(id)
        }
      }
    } else {
      this.errors.clear()
      this.errorCounts.clear()
    }
  }

  /**
   * Export errors for external systems
   */
  exportErrors(): {
    sessionId: string
    correlationId: string
    timestamp: Date
    statistics: ErrorStatistics
    errors: UploadError[]
  } {
    return {
      sessionId: this.sessionId,
      correlationId: this.correlationId,
      timestamp: new Date(),
      statistics: this.generateStatistics(),
      errors: Array.from(this.errors.values())
    }
  }

  // Private helper methods
  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateCorrelationId(): string {
    return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private incrementErrorCount(code: string): void {
    this.errorCounts.set(code, (this.errorCounts.get(code) || 0) + 1)
  }

  private generateRecoveryActions(code: string, category: ErrorCategory): RecoveryAction[] {
    const actions: RecoveryAction[] = []

    // Common recovery actions based on category
    switch (category) {
      case ErrorCategory.VALIDATION:
        actions.push({
          id: 'fix_data',
          label: 'Fix Data',
          description: 'Correct the invalid data and retry',
          action: 'fix_data'
        })
        actions.push({
          id: 'skip_row',
          label: 'Skip Row',
          description: 'Skip this row and continue processing',
          action: 'skip'
        })
        break

      case ErrorCategory.DATABASE:
        actions.push({
          id: 'retry',
          label: 'Retry',
          description: 'Retry the database operation',
          action: 'retry',
          automated: true
        })
        actions.push({
          id: 'rollback',
          label: 'Rollback',
          description: 'Rollback changes and start over',
          action: 'rollback'
        })
        break

      case ErrorCategory.BUSINESS_LOGIC:
        actions.push({
          id: 'review_rules',
          label: 'Review Rules',
          description: 'Review business rules and data',
          action: 'fix_data'
        })
        break

      default:
        actions.push({
          id: 'contact_support',
          label: 'Contact Support',
          description: 'Contact technical support for assistance',
          action: 'contact_support'
        })
    }

    return actions
  }

  private generateUserMessage(code: string, message: string, severity: ErrorSeverity): string {
    // Convert technical messages to user-friendly ones
    const userFriendlyMessages: Record<string, string> = {
      'VALIDATION_SKU_INVALID': 'Product SKU is invalid or missing',
      'VALIDATION_PRICE_INVALID': 'Price value is not a valid number',
      'VALIDATION_CATEGORY_INVALID': 'Product category is not recognized',
      'DATABASE_INSERT_FAILED': 'Failed to save product data',
      'DATABASE_UPDATE_FAILED': 'Failed to update existing product',
      'BUSINESS_RULE_DUPLICATE_SKU_VIOLATION': 'Product SKU already exists',
      'BUSINESS_RULE_PRICE_VARIANCE_VIOLATION': 'Price change exceeds allowed variance'
    }

    return userFriendlyMessages[code] || message
  }

  private generateTechnicalDetails(context: Partial<ErrorContext>): Record<string, unknown> {
    return {
      rowNumber: context.rowNumber,
      fieldName: context.fieldName,
      originalValue: context.originalValue,
      expectedType: context.expectedType,
      stackTrace: context.stackTrace,
      correlationId: this.correlationId
    }
  }

  private groupErrorsByCategory(errors: UploadError[]): Map<ErrorCategory, UploadError[]> {
    const grouped = new Map<ErrorCategory, UploadError[]>()

    errors.forEach(error => {
      const existing = grouped.get(error.category) || []
      existing.push(error)
      grouped.set(error.category, existing)
    })

    return grouped
  }

  private summarizeValidationErrors(errors: UploadError[]): string[] {
    const fieldErrors = new Map<string, number>()

    errors.forEach(error => {
      const field = error.context.fieldName || 'unknown'
      fieldErrors.set(field, (fieldErrors.get(field) || 0) + 1)
    })

    return Array.from(fieldErrors.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([field, count]) => `${field}: ${count} error(s)`)
  }
}

/**
 * Error code registry for consistent error handling
 */
export const ERROR_CODES = {
  // Validation errors
  VALIDATION_REQUIRED_FIELD_MISSING: 'VALIDATION_REQUIRED_FIELD_MISSING',
  VALIDATION_INVALID_DATA_TYPE: 'VALIDATION_INVALID_DATA_TYPE',
  VALIDATION_VALUE_OUT_OF_RANGE: 'VALIDATION_VALUE_OUT_OF_RANGE',
  VALIDATION_INVALID_FORMAT: 'VALIDATION_INVALID_FORMAT',

  // Database errors
  DATABASE_CONNECTION_FAILED: 'DATABASE_CONNECTION_FAILED',
  DATABASE_OPERATION_FAILED: 'DATABASE_OPERATION_FAILED',
  DATABASE_CONSTRAINT_VIOLATION: 'DATABASE_CONSTRAINT_VIOLATION',
  DATABASE_TIMEOUT: 'DATABASE_TIMEOUT',

  // Business logic errors
  BUSINESS_DUPLICATE_SKU: 'BUSINESS_DUPLICATE_SKU',
  BUSINESS_PRICE_VARIANCE: 'BUSINESS_PRICE_VARIANCE',
  BUSINESS_INVALID_SUPPLIER: 'BUSINESS_INVALID_SUPPLIER',
  BUSINESS_CATEGORY_MISMATCH: 'BUSINESS_CATEGORY_MISMATCH',

  // File processing errors
  FILE_INVALID_FORMAT: 'FILE_INVALID_FORMAT',
  FILE_CORRUPTED: 'FILE_CORRUPTED',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  FILE_EMPTY: 'FILE_EMPTY',

  // System errors
  SYSTEM_MEMORY_EXHAUSTED: 'SYSTEM_MEMORY_EXHAUSTED',
  SYSTEM_TIMEOUT: 'SYSTEM_TIMEOUT',
  SYSTEM_UNAVAILABLE: 'SYSTEM_UNAVAILABLE'
} as const

/**
 * Helper function to create standardized error responses
 */
export function createErrorResponse(
  errorManager: UploadErrorManager,
  errors: UploadError[],
  statusCode: number = 400
): Response {
  const statistics = errorManager.generateStatistics()
  const feedback = errorManager.generateUserFeedback(errors)

  return Response.json({
    success: false,
    errors: errors.map(e => ({
      id: e.id,
      code: e.code,
      message: e.userMessage,
      severity: e.severity,
      rowNumber: e.context.rowNumber,
      fieldName: e.context.fieldName,
      suggestion: e.suggestion,
      recoveryActions: e.recoveryActions
    })),
    statistics,
    feedback,
    correlationId: errors[0]?.context.correlationId
  }, { status: statusCode })
}

/**
 * Helper function to create success response with optional warnings
 */
export function createSuccessResponse(
  data: unknown,
  errorManager?: UploadErrorManager,
  warnings: UploadError[] = []
): Response {
  const response: unknown = {
    success: true,
    data
  }

  if (errorManager && warnings.length > 0) {
    response.warnings = warnings.map(w => ({
      id: w.id,
      code: w.code,
      message: w.userMessage,
      severity: w.severity,
      rowNumber: w.context.rowNumber,
      suggestion: w.suggestion
    }))
    response.feedback = errorManager.generateUserFeedback(warnings)
  }

  return Response.json(response)
}