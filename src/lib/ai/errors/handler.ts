import { z } from 'zod';
import { logError } from '../audit';
import {
  AIError,
  AIErrorCode,
  ErrorContext,
  ErrorCodeSeverity,
  ErrorCodeRetryable,
  ToolError,
  ProviderError,
  AccessError,
  SessionError,
  ValidationError,
} from './types';

// Error mapping from common sources
const ErrorMappings = {
  // Zod validation errors
  ZodError: (error: z.ZodError) => {
    const issues = error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join(', ');
    return new ValidationError(
      `Validation failed: ${issues}`,
      { metadata: { zodIssues: error.issues } }
    );
  },

  // Database errors
  PostgresError: (error: any) => {
    const code = error.code;
    let aiErrorCode = AIErrorCode.DATABASE_ERROR;

    if (code === '23505') aiErrorCode = AIErrorCode.VALIDATION_FAILED; // unique_violation
    if (code === '23503') aiErrorCode = AIErrorCode.RESOURCE_NOT_FOUND; // foreign_key_violation
    if (code === '23502') aiErrorCode = AIErrorCode.VALIDATION_FAILED; // not_null_violation

    return new AIError(
      aiErrorCode,
      `Database error: ${error.message}`,
      ErrorCodeSeverity[aiErrorCode],
      { metadata: { dbCode: code, detail: error.detail } },
      ErrorCodeRetryable[aiErrorCode],
      'Check database connection and data integrity'
    );
  },

  // Network errors
  FetchError: (error: any) => {
    return new AIError(
      AIErrorCode.NETWORK_ERROR,
      `Network request failed: ${error.message}`,
      'transient',
      { metadata: { url: error.url, status: error.status } },
      true,
      'Check network connectivity and try again'
    );
  },

  // Timeout errors
  TimeoutError: (error: any) => {
    return new AIError(
      AIErrorCode.TOOL_TIMEOUT,
      `Operation timed out: ${error.message}`,
      'transient',
      { metadata: { timeout: error.timeout } },
      true,
      'Increase timeout or try again'
    );
  },
};

/**
 * ErrorHandler - Centralized error handling and normalization
 * Converts various error types to standardized AIError instances
 */
export class ErrorHandler {
  private static instance: ErrorHandler;

  private constructor() {}

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Normalize any error to an AIError
   */
  handle(error: Error | any, context?: ErrorContext): AIError {
    // Already an AIError
    if (error instanceof AIError) {
      return error;
    }

    // Map known error types
    const errorType = error.constructor.name;
    const mapper = ErrorMappings[errorType as keyof typeof ErrorMappings];

    if (mapper) {
      const aiError = mapper(error);
      if (context) {
        aiError.context = { ...aiError.context, ...context };
      }
      return aiError;
    }

    // Generic error handling
    const message = error.message || 'An unexpected error occurred';
    const aiError = new AIError(
      AIErrorCode.INTERNAL_ERROR,
      message,
      'fatal',
      context,
      false,
      'Contact support if this persists'
    );

    return aiError;
  }

  /**
   * Check if an error is retryable
   */
  isRetryable(error: AIError): boolean {
    return error.retryable;
  }

  /**
   * Calculate exponential backoff delay
   */
  getRetryDelay(error: AIError, attempt: number): number {
    if (!this.isRetryable(error)) {
      return 0;
    }

    const baseDelay = 1000; // 1 second
    const maxDelay = 30000; // 30 seconds
    const backoffMultiplier = 2;
    const jitter = Math.random() * 0.1; // 10% jitter

    const delay = Math.min(baseDelay * Math.pow(backoffMultiplier, attempt - 1), maxDelay);
    return Math.floor(delay * (1 + jitter));
  }

  /**
   * Log error to audit system
   */
  async logError(error: AIError): Promise<void> {
    try {
      await logError(error, {
        orgId: error.context.orgId,
        userId: error.context.userId,
        sessionId: error.context.sessionId,
        metadata: {
          code: error.code,
          severity: error.severity,
          retryable: error.retryable,
          suggestedAction: error.suggestedAction,
          ...error.context.metadata,
        },
      });
    } catch (logError) {
      // Don't let logging errors break the main flow
      console.error('Failed to log error to audit system:', logError);
    }
  }

  /**
   * Notify about critical errors (could integrate with alerting system)
   */
  async notifyIfCritical(error: AIError): Promise<void> {
    if (error.severity === 'fatal') {
      // In a real system, this would send alerts to monitoring systems
      console.error('CRITICAL ERROR:', {
        code: error.code,
        message: error.message,
        context: error.context,
        timestamp: error.timestamp,
      });
    }
  }

  /**
   * Format error for user display (safe, non-technical)
   */
  formatForUser(error: AIError): string {
    // User-friendly messages based on error code
    const userMessages: Record<AIErrorCode, string> = {
      [AIErrorCode.TOOL_EXECUTION_FAILED]: 'The requested operation could not be completed. Please try again.',
      [AIErrorCode.TOOL_NOT_FOUND]: 'The requested tool is not available.',
      [AIErrorCode.TOOL_TIMEOUT]: 'The operation is taking longer than expected. Please try again.',

      [AIErrorCode.PROVIDER_UNAVAILABLE]: 'The AI service is temporarily unavailable. Please try again in a moment.',
      [AIErrorCode.PROVIDER_RATE_LIMITED]: 'Too many requests. Please wait a moment before trying again.',
      [AIErrorCode.PROVIDER_AUTH_FAILED]: 'Authentication issue with the AI service. Please contact support.',

      [AIErrorCode.ACCESS_DENIED]: 'You do not have permission to perform this action.',
      [AIErrorCode.PERMISSION_INSUFFICIENT]: 'You do not have sufficient permissions for this action.',
      [AIErrorCode.RESOURCE_NOT_FOUND]: 'The requested resource could not be found.',

      [AIErrorCode.SESSION_EXPIRED]: 'Your session has expired. Please refresh and try again.',
      [AIErrorCode.SESSION_INVALID]: 'Your session is invalid. Please log in again.',
      [AIErrorCode.CONTEXT_OVERFLOW]: 'The conversation is too long. Please start a new session.',

      [AIErrorCode.VALIDATION_FAILED]: 'The provided information is not valid. Please check and try again.',
      [AIErrorCode.SCHEMA_MISMATCH]: 'The data format is incorrect. Please check your input.',
      [AIErrorCode.INVALID_INPUT]: 'The provided input is not valid. Please check and try again.',

      [AIErrorCode.INTERNAL_ERROR]: 'An unexpected error occurred. Please try again or contact support.',
      [AIErrorCode.DATABASE_ERROR]: 'A data storage issue occurred. Please try again.',
      [AIErrorCode.NETWORK_ERROR]: 'Network connection issue. Please check your connection and try again.',
    };

    return userMessages[error.code] || error.suggestedAction || 'An error occurred. Please try again.';
  }

  /**
   * Format error for developer debugging (detailed technical info)
   */
  formatForDeveloper(error: AIError): string {
    const parts = [
      `Error: ${error.code}`,
      `Message: ${error.message}`,
      `Severity: ${error.severity}`,
      `Retryable: ${error.retryable}`,
      `Timestamp: ${error.timestamp.toISOString()}`,
      `Suggested Action: ${error.suggestedAction}`,
    ];

    if (error.context.sessionId) parts.push(`Session: ${error.context.sessionId}`);
    if (error.context.userId) parts.push(`User: ${error.context.userId}`);
    if (error.context.orgId) parts.push(`Org: ${error.context.orgId}`);
    if (error.context.toolName) parts.push(`Tool: ${error.context.toolName}`);
    if (error.context.operation) parts.push(`Operation: ${error.context.operation}`);

    if (error.context.metadata && Object.keys(error.context.metadata).length > 0) {
      parts.push(`Metadata: ${JSON.stringify(error.context.metadata, null, 2)}`);
    }

    if (error.stack) {
      parts.push(`Stack: ${error.stack}`);
    }

    return parts.join('\n');
  }

  /**
   * Process error with full handling pipeline
   */
  async processError(error: Error | any, context?: ErrorContext): Promise<AIError> {
    const aiError = this.handle(error, context);

    // Log the error
    await this.logError(aiError);

    // Notify if critical
    await this.notifyIfCritical(aiError);

    return aiError;
  }
}

// Singleton instance
export const errorHandler = ErrorHandler.getInstance();