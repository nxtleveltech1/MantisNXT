/**
 * Xero Integration Error Classes
 * 
 * Custom error types for Xero API operations
 */

import { NextResponse } from 'next/server';

/**
 * Base error class for Xero integration errors
 */
export class XeroError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'XeroError';
    
    // Maintain proper stack trace in V8 environments
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, XeroError);
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
    };
  }
}

/**
 * Authentication/Authorization errors
 */
export class XeroAuthError extends XeroError {
  constructor(
    message: string,
    code: string = 'AUTH_ERROR',
    originalError?: unknown
  ) {
    super(message, code, originalError);
    this.name = 'XeroAuthError';
  }
}

/**
 * Rate limit exceeded error
 */
export class XeroRateLimitError extends XeroError {
  constructor(
    public retryAfterSeconds: number,
    originalError?: unknown
  ) {
    super(
      `Xero rate limit exceeded. Retry after ${retryAfterSeconds} seconds.`,
      'RATE_LIMIT_EXCEEDED',
      originalError
    );
    this.name = 'XeroRateLimitError';
  }
}

/**
 * Data synchronization error
 */
export class XeroSyncError extends XeroError {
  constructor(
    message: string,
    public entityType: string,
    public nxtEntityId: string,
    code: string = 'SYNC_ERROR',
    originalError?: unknown
  ) {
    super(message, code, originalError);
    this.name = 'XeroSyncError';
  }

  toJSON() {
    return {
      ...super.toJSON(),
      entityType: this.entityType,
      nxtEntityId: this.nxtEntityId,
    };
  }
}

/**
 * Validation error for data being sent to Xero
 */
export class XeroValidationError extends XeroError {
  constructor(
    message: string,
    public validationErrors: Array<{ field: string; message: string }>,
    originalError?: unknown
  ) {
    super(message, 'VALIDATION_ERROR', originalError);
    this.name = 'XeroValidationError';
  }

  toJSON() {
    return {
      ...super.toJSON(),
      validationErrors: this.validationErrors,
    };
  }
}

/**
 * Entity not found in Xero
 */
export class XeroNotFoundError extends XeroError {
  constructor(
    public entityType: string,
    public entityId: string,
    originalError?: unknown
  ) {
    super(
      `${entityType} with ID ${entityId} not found in Xero.`,
      'NOT_FOUND',
      originalError
    );
    this.name = 'XeroNotFoundError';
  }
}

/**
 * Webhook signature validation error
 */
export class XeroWebhookError extends XeroError {
  constructor(
    message: string,
    code: string = 'WEBHOOK_ERROR',
    originalError?: unknown
  ) {
    super(message, code, originalError);
    this.name = 'XeroWebhookError';
  }
}

/**
 * Configuration error (missing env vars, etc.)
 */
export class XeroConfigError extends XeroError {
  constructor(
    message: string,
    originalError?: unknown
  ) {
    super(message, 'CONFIG_ERROR', originalError);
    this.name = 'XeroConfigError';
  }
}

/**
 * Parse Xero API error response
 */
export function parseXeroApiError(error: unknown): XeroError {
  console.error('[Xero Error] Parsing error:', error);

  // Log full error object for debugging
  if (error && typeof error === 'object') {
    try {
      console.error('[Xero Error] Full error object:', JSON.stringify(error, null, 2));
    } catch (jsonError) {
      console.error('[Xero Error] Could not stringify error object:', error);
    }
  }

  // Handle axios/fetch errors with response
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { status?: number; data?: unknown; headers?: Record<string, string>; statusText?: string } }).response;

    console.error('[Xero Error] Response details:', {
      status: response?.status,
      statusText: response?.statusText,
      headers: response?.headers,
    });

    if (response?.status === 401) {
      console.error('[Xero Error] Authentication failed (401)');
      return new XeroAuthError(
        'Xero authentication failed. Please reconnect to Xero.',
        'UNAUTHORIZED',
        error
      );
    }

    if (response?.status === 403) {
      console.error('[Xero Error] Access denied (403)');
      return new XeroAuthError(
        'Access denied. The connected Xero user may not have permission for this operation.',
        'FORBIDDEN',
        error
      );
    }

    if (response?.status === 404) {
      console.error('[Xero Error] Entity not found (404)');
      return new XeroNotFoundError('Entity', 'unknown', error);
    }

    if (response?.status === 429) {
      const retryAfter = parseInt(response.headers?.['retry-after'] || '60', 10);
      console.error(`[Xero Error] Rate limit exceeded (429), retry after ${retryAfter}s`);
      return new XeroRateLimitError(retryAfter, error);
    }

    if (response?.status === 400 && response.data) {
      console.error('[Xero Error] Validation error (400)');
      const data = response.data as { Message?: string; Elements?: Array<{ ValidationErrors?: Array<{ Message: string }> }> };

      console.error('[Xero Error] Validation error data:', data);

      const validationErrors = data.Elements?.[0]?.ValidationErrors?.map(ve => ({
        field: 'unknown',
        message: ve.Message,
      })) || [];

      return new XeroValidationError(
        data.Message || 'Validation failed',
        validationErrors,
        error
      );
    }

    // Handle other HTTP status codes
    if (response?.status) {
      console.error(`[Xero Error] HTTP ${response.status} error:`, response.statusText);
      return new XeroError(
        `Xero API error: ${response.status} ${response.statusText}`,
        `HTTP_${response.status}`,
        error
      );
    }
  }

  // Check for network errors
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code: string }).code;
    console.error('[Xero Error] Network error with code:', code);
    if (code === 'ECONNREFUSED' || code === 'ENOTFOUND') {
      return new XeroSyncError('Network connectivity error - unable to reach Xero API', 'NETWORK_ERROR', 'unknown', 'NETWORK_ERROR', error);
    }
    if (code === 'ETIMEDOUT' || code === 'ESOCKETTIMEDOUT') {
      return new XeroSyncError('Request timeout - Xero API took too long to respond', 'TIMEOUT_ERROR', 'unknown', 'TIMEOUT_ERROR', error);
    }
  }

  // Generic error
  if (error instanceof Error) {
    console.error('[Xero Error] Generic error:', error.message);
    return new XeroError(error.message, 'UNKNOWN_ERROR', error);
  }
  
  return new XeroError('An unknown error occurred', 'UNKNOWN_ERROR', error);
}

/**
 * Check if error is a Xero rate limit error
 */
export function isRateLimitError(error: unknown): error is XeroRateLimitError {
  return error instanceof XeroRateLimitError;
}

/**
 * Check if error is a Xero auth error requiring reconnection
 */
export function isAuthError(error: unknown): error is XeroAuthError {
  return error instanceof XeroAuthError;
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyMessage(error: unknown): string {
  if (error instanceof XeroRateLimitError) {
    return `Too many requests to Xero. Please wait ${error.retryAfterSeconds} seconds and try again.`;
  }
  
  if (error instanceof XeroAuthError) {
    if (error.code === 'NO_CONNECTION') {
      return 'Please connect your Xero account first.';
    }
    if (error.code === 'REFRESH_FAILED') {
      return 'Your Xero connection has expired. Please reconnect.';
    }
    return 'There was an authentication problem with Xero. Please try reconnecting.';
  }
  
  if (error instanceof XeroValidationError) {
    const errorList = error.validationErrors.map(e => e.message).join(', ');
    return `Validation failed: ${errorList}`;
  }
  
  if (error instanceof XeroSyncError) {
    return `Failed to sync ${error.entityType}: ${error.message}`;
  }
  
  if (error instanceof XeroError) {
    return error.message;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'An unexpected error occurred while communicating with Xero.';
}

/**
 * Handle API errors and return appropriate NextResponse
 * 
 * This helper function standardizes error responses across all Xero API routes.
 * It maps Xero error types to appropriate HTTP status codes and formats.
 * 
 * @param error - The error to handle
 * @param logContext - Optional context for logging (e.g., operation name)
 * @returns NextResponse with appropriate status code and error message
 */
export function handleApiError(
  error: unknown,
  logContext?: string
): import('next/server').NextResponse {
  const context = logContext ? `[${logContext}] ` : '';
  
  // Parse the error to get a XeroError instance
  const xeroError = error instanceof XeroError 
    ? error 
    : parseXeroApiError(error);
  
  // Log the error with context
  console.error(`${context}Error:`, {
    name: xeroError.name,
    code: xeroError.code,
    message: xeroError.message,
    originalError: xeroError.originalError,
  });
  
  // Map error types to HTTP status codes
  let statusCode = 500;
  let errorMessage = getUserFriendlyMessage(xeroError);
  
  if (xeroError instanceof XeroAuthError) {
    if (xeroError.code === 'NO_CONNECTION') {
      statusCode = 404; // Not found - connection doesn't exist
    } else if (xeroError.code === 'UNAUTHORIZED' || xeroError.code === 'FORBIDDEN') {
      statusCode = 401; // Unauthorized
    } else {
      statusCode = 401; // Default auth errors to 401
    }
  } else if (xeroError instanceof XeroRateLimitError) {
    statusCode = 429; // Too Many Requests
    errorMessage = `Rate limit exceeded. Retry after ${xeroError.retryAfterSeconds} seconds.`;
  } else if (xeroError instanceof XeroValidationError) {
    statusCode = 400; // Bad Request
  } else if (xeroError instanceof XeroNotFoundError) {
    statusCode = 404; // Not Found
  } else if (xeroError instanceof XeroConfigError) {
    statusCode = 500; // Internal Server Error
  } else if (xeroError instanceof XeroWebhookError) {
    statusCode = 401; // Unauthorized (for signature validation)
  } else if (xeroError instanceof XeroSyncError) {
    statusCode = 500; // Internal Server Error
  }
  
  // Return JSON response with error details
  return NextResponse.json(
    {
      error: errorMessage,
      code: xeroError.code,
      type: xeroError.name,
    },
    {
      status: statusCode,
    }
  );
}
