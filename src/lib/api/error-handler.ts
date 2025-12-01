/**
 * API Error Handling Middleware
 * Standardized error handling for all API routes
 * Ensures SQL errors and sensitive data are NEVER exposed to users
 */

import { NextResponse } from 'next/server';
import {
  classifyError,
  getUserFriendlyError,
  sanitizeError,
  ErrorType,
} from '@/lib/errors/error-messages';

export interface ApiError {
  success: false;
  error: {
    type: ErrorType;
    title: string;
    message: string;
    userAction: string;
    errorId: string;
    timestamp: string;
  };
  meta?: {
    retryable: boolean;
    severity: string;
  };
}

export interface ApiSuccess<T = unknown> {
  success: true;
  data: T;
  meta?: {
    timestamp?: string;
    count?: number;
    page?: number;
    totalPages?: number;
  };
}

/**
 * Generate unique error ID for tracking
 */
function generateErrorId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  return `err_${timestamp}_${random}`;
}

/**
 * Log error to console and external service (production)
 */
async function logError(
  error: Error,
  context: {
    endpoint: string;
    method: string;
    errorId: string;
    userId?: string;
  }
) {
  const sanitized = sanitizeError(error);

  // Always log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error('🚨 API Error:', {
      ...context,
      ...sanitized,
      stack: error.stack,
    });
  } else {
    // Production: Log without stack trace to console
    console.error('API Error:', {
      ...context,
      type: sanitized.type,
      severity: sanitized.severity,
    });
  }

  // Send to error tracking service in production
  if (process.env.NODE_ENV === 'production') {
    try {
      // Example: Send to error tracking service
      // await errorTrackingService.capture(error, context);
      // For now, we'll just log internally
      // In production, replace this with actual error tracking service
    } catch (loggingError) {
      // Silently fail if logging fails
      console.error('Failed to log error:', loggingError);
    }
  }
}

/**
 * Handle API errors and return user-friendly responses
 */
export async function handleApiError(
  error: Error | unknown,
  context: {
    endpoint: string;
    method: string;
    userId?: string;
  }
): Promise<NextResponse<ApiError>> {
  const actualError = error instanceof Error ? error : new Error(String(error));
  const errorId = generateErrorId();

  // Log the error internally
  await logError(actualError, { ...context, errorId });

  // Get user-friendly error message
  const userFriendlyError = getUserFriendlyError(actualError);
  const errorType = classifyError(actualError);

  // Determine HTTP status code
  const statusCode = getHttpStatusCode(errorType);

  // Build error response (NEVER include sensitive data)
  const errorResponse: ApiError = {
    success: false,
    error: {
      type: errorType,
      title: userFriendlyError.title,
      message: userFriendlyError.description,
      userAction: userFriendlyError.userAction,
      errorId,
      timestamp: new Date().toISOString(),
    },
    meta: {
      retryable: userFriendlyError.retryable,
      severity: userFriendlyError.severity,
    },
  };

  return NextResponse.json(errorResponse, { status: statusCode });
}

/**
 * Get appropriate HTTP status code for error type
 */
function getHttpStatusCode(errorType: ErrorType): number {
  const statusMap: Record<ErrorType, number> = {
    [ErrorType.DATABASE_CONNECTION]: 503,
    [ErrorType.DATABASE_QUERY]: 500,
    [ErrorType.DATABASE_TIMEOUT]: 504,
    [ErrorType.COLUMN_NOT_FOUND]: 500,
    [ErrorType.TABLE_NOT_FOUND]: 500,
    [ErrorType.CONSTRAINT_VIOLATION]: 400,
    [ErrorType.DATA_TYPE_MISMATCH]: 400,
    [ErrorType.API_NETWORK]: 503,
    [ErrorType.API_TIMEOUT]: 504,
    [ErrorType.API_UNAUTHORIZED]: 401,
    [ErrorType.API_FORBIDDEN]: 403,
    [ErrorType.API_NOT_FOUND]: 404,
    [ErrorType.API_SERVER_ERROR]: 500,
    [ErrorType.EMPTY_RESULT]: 404,
    [ErrorType.INVALID_DATA]: 400,
    [ErrorType.PARSING_ERROR]: 400,
    [ErrorType.VALIDATION_ERROR]: 400,
    [ErrorType.TIMESTAMP_ERROR]: 500,
    [ErrorType.DATE_FORMAT_ERROR]: 400,
    [ErrorType.UNKNOWN_ERROR]: 500,
    [ErrorType.RATE_LIMIT]: 429,
  };

  return statusMap[errorType] || 500;
}

/**
 * Wrap API route handler with error handling
 */
export function withErrorHandler<T = unknown>(
  handler: (request: Request) => Promise<NextResponse<ApiSuccess<T>>>,
  endpoint: string
) {
  return async (request: Request): Promise<NextResponse<ApiSuccess<T> | ApiError>> => {
    try {
      return await handler(request);
    } catch (error) {
      return handleApiError(error, {
        endpoint,
        method: request.method,
      });
    }
  };
}

/**
 * Create success response
 */
export function createSuccessResponse<T = unknown>(
  data: T,
  meta?: {
    timestamp?: string;
    count?: number;
    page?: number;
    totalPages?: number;
  }
): NextResponse<ApiSuccess<T>> {
  const response: ApiSuccess<T> = {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
  };

  return NextResponse.json(response);
}

/**
 * Validate request parameters
 */
export function validateParams(params: Record<string, unknown>, required: string[]): void {
  const missing = required.filter(key => !params[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required parameters: ${missing.join(', ')}`);
  }
}

/**
 * Check if error is a database error
 */
export function isDatabaseError(error: Error): boolean {
  const message = error.message.toLowerCase();
  return (
    message.includes('database') ||
    message.includes('query') ||
    message.includes('sql') ||
    message.includes('postgres') ||
    message.includes('pg_') ||
    message.includes('relation') ||
    message.includes('column') ||
    message.includes('table')
  );
}

/**
 * Check if error is a timeout error
 */
export function isTimeoutError(error: Error): boolean {
  const message = error.message.toLowerCase();
  return (
    message.includes('timeout') || message.includes('timed out') || message.includes('ETIMEDOUT')
  );
}

/**
 * Check if error is a connection error
 */
export function isConnectionError(error: Error): boolean {
  const message = error.message.toLowerCase();
  return (
    message.includes('connection') ||
    message.includes('ECONNREFUSED') ||
    message.includes('ENOTFOUND') ||
    message.includes('network')
  );
}

/**
 * Extract error code from PostgreSQL error
 */
export function extractPgErrorCode(error: unknown): string | undefined {
  return error?.code || error?.pgCode || undefined;
}

/**
 * Check if PostgreSQL error is retryable
 */
export function isPgRetryableError(error: unknown): boolean {
  const code = extractPgErrorCode(error);

  // PostgreSQL error codes that are typically retryable
  const retryableCodes = [
    '40001', // serialization_failure
    '40P01', // deadlock_detected
    '08000', // connection_exception
    '08003', // connection_does_not_exist
    '08006', // connection_failure
    '53300', // too_many_connections
    '57P03', // cannot_connect_now
  ];

  return code ? retryableCodes.includes(code) : false;
}
