/**
 * Unified API Response Helper
 * Provides standardized response formats for all API endpoints
 */

import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

/**
 * Standard API response format
 */
export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: unknown[];
  metadata?: {
    timestamp: string;
    requestId?: string;
    version?: string;
  };
}

/**
 * Create a successful API response
 * @param data - The response data
 * @param message - Optional success message
 * @param metadata - Optional additional metadata
 */
export function createSuccessResponse<T = unknown>(
  data: T,
  message?: string,
  metadata?: Partial<APIResponse['metadata']>
): NextResponse<APIResponse<T>> {
  const response: APIResponse<T> = {
    success: true,
    data,
    metadata: {
      timestamp: new Date().toISOString(),
      requestId: uuidv4(),
      version: process.env.API_VERSION || '1.0.0',
      ...metadata
    }
  };

  if (message) {
    (response as unknown).message = message;
  }

  return NextResponse.json(response, { status: 200 });
}

/**
 * Create an error API response
 * @param message - Error message
 * @param statusCode - HTTP status code
 * @param errors - Optional array of detailed errors
 */
export function createErrorResponse(
  message: string,
  statusCode: number = 500,
  errors?: unknown[]
): NextResponse<APIResponse> {
  const response: APIResponse = {
    success: false,
    error: message,
    metadata: {
      timestamp: new Date().toISOString(),
      requestId: uuidv4(),
      version: process.env.API_VERSION || '1.0.0'
    }
  };

  if (errors && errors.length > 0) {
    response.errors = errors;
  }

  return NextResponse.json(response, { status: statusCode });
}

/**
 * Handle API errors consistently
 * @param error - The error to handle
 */
export function handleAPIError(error: unknown): NextResponse<APIResponse> {
  console.error('API Error:', error);

  // Handle known error types
  if (error instanceof Error) {
    // Check for specific error types
    if (error.name === 'ValidationError') {
      return createErrorResponse(
        'Validation failed',
        400,
        [(error as unknown).errors || error.message]
      );
    }

    if (error.name === 'UnauthorizedError') {
      return createErrorResponse(
        error.message || 'Unauthorized',
        401
      );
    }

    if (error.name === 'ForbiddenError') {
      return createErrorResponse(
        error.message || 'Forbidden',
        403
      );
    }

    if (error.name === 'NotFoundError') {
      return createErrorResponse(
        error.message || 'Resource not found',
        404
      );
    }

    // Database errors
    if (error.message?.includes('ECONNREFUSED') || error.message?.includes('ENOTFOUND')) {
      return createErrorResponse(
        'Database connection error',
        503
      );
    }

    // Duplicate key errors (PostgreSQL)
    if (error.message?.includes('duplicate key') || error.message?.includes('UNIQUE constraint')) {
      return createErrorResponse(
        'Resource already exists',
        409
      );
    }

    // Foreign key constraint errors
    if (error.message?.includes('foreign key constraint') || error.message?.includes('FOREIGN KEY constraint')) {
      return createErrorResponse(
        'Referenced resource not found or cannot be deleted',
        400
      );
    }

    // Default error response
    return createErrorResponse(
      process.env.NODE_ENV === 'production'
        ? 'An error occurred while processing your request'
        : error.message,
      500
    );
  }

  // Handle non-Error objects
  if (typeof error === 'string') {
    return createErrorResponse(error, 500);
  }

  // Handle objects with statusCode and message
  if (typeof error === 'object' && error !== null) {
    const err = error as unknown;
    if (err.statusCode && err.message) {
      return createErrorResponse(
        err.message,
        err.statusCode,
        err.errors
      );
    }
  }

  // Fallback for unknown error types
  return createErrorResponse(
    'An unexpected error occurred',
    500
  );
}

/**
 * Helper to extract error details for logging
 */
export function extractErrorDetails(error: unknown): {
  message: string;
  stack?: string;
  code?: string;
  details?: unknown;
} {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
      code: (error as unknown).code,
      details: (error as unknown).details
    };
  }

  if (typeof error === 'string') {
    return { message: error };
  }

  if (typeof error === 'object' && error !== null) {
    return {
      message: (error as unknown).message || 'Unknown error',
      code: (error as unknown).code,
      details: error
    };
  }

  return { message: 'Unknown error', details: error };
}

/**
 * Create a paginated success response
 */
export function createPaginatedResponse<T = unknown>(
  data: T[],
  page: number,
  limit: number,
  total: number,
  message?: string
): NextResponse<APIResponse<{ items: T[]; pagination: unknown }>> {
  const totalPages = Math.ceil(total / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  return createSuccessResponse(
    {
      items: data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext,
        hasPrev,
        nextPage: hasNext ? page + 1 : null,
        prevPage: hasPrev ? page - 1 : null
      }
    },
    message
  );
}

/**
 * Type guard to check if response is successful
 */
export function isSuccessResponse<T = unknown>(
  response: APIResponse<T>
): response is APIResponse<T> & { data: T } {
  return response.success === true && response.data !== undefined;
}

/**
 * Type guard to check if response is an error
 */
export function isErrorResponse(
  response: APIResponse
): response is APIResponse & { error: string } {
  return response.success === false && response.error !== undefined;
}