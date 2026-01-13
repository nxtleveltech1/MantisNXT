/**
 * Xero Integration Error Classes
 * 
 * Custom error types for Xero API operations
 */

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
  // Handle axios/fetch errors with response
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { status?: number; data?: unknown; headers?: Record<string, string> } }).response;
    
    if (response?.status === 401) {
      return new XeroAuthError(
        'Xero authentication failed. Please reconnect to Xero.',
        'UNAUTHORIZED',
        error
      );
    }
    
    if (response?.status === 403) {
      return new XeroAuthError(
        'Access denied. The connected Xero user may not have permission for this operation.',
        'FORBIDDEN',
        error
      );
    }
    
    if (response?.status === 404) {
      return new XeroNotFoundError('Entity', 'unknown', error);
    }
    
    if (response?.status === 429) {
      const retryAfter = parseInt(response.headers?.['retry-after'] || '60', 10);
      return new XeroRateLimitError(retryAfter, error);
    }
    
    if (response?.status === 400 && response.data) {
      const data = response.data as { Message?: string; Elements?: Array<{ ValidationErrors?: Array<{ Message: string }> }> };
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
  }
  
  // Generic error
  if (error instanceof Error) {
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
