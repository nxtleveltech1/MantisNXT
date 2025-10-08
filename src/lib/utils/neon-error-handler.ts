/**
 * Neon Error Handler - Standardized error handling for Neon database operations
 *
 * Provides consistent error mapping, validation, and user-friendly messages
 * for all Neon database interactions.
 */

import { DatabaseError } from 'pg';
import { ZodError } from 'zod';
import { NextResponse } from 'next/server';

/**
 * Standard error response structure
 */
export interface ErrorResponse {
  error: string;
  message: string;
  details?: any;
  code?: string;
}

/**
 * Map PostgreSQL error codes to user-friendly messages
 */
const PG_ERROR_MESSAGES: Record<string, string> = {
  '23505': 'A record with this information already exists', // unique_violation
  '23503': 'Referenced record not found', // foreign_key_violation
  '23502': 'Required field is missing', // not_null_violation
  '23514': 'Data validation failed', // check_violation
  '42P01': 'Database table not found', // undefined_table
  '42703': 'Database column not found', // undefined_column
  '22P02': 'Invalid data format', // invalid_text_representation
  '28P01': 'Authentication failed', // invalid_authorization_specification
  '08001': 'Database connection failed', // sqlclient_unable_to_establish_sqlconnection
  '08006': 'Connection failure', // connection_failure
  '57P01': 'Database shutting down', // admin_shutdown
  '57P03': 'Database unavailable', // cannot_connect_now
};

/**
 * Map Neon query errors to user-friendly messages
 */
export function mapNeonQueryError(error: unknown): ErrorResponse {
  // Handle Zod validation errors
  if (error instanceof ZodError) {
    return {
      error: 'Validation Error',
      message: 'Input validation failed',
      details: error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message
      })),
      code: 'VALIDATION_ERROR'
    };
  }

  // Handle PostgreSQL database errors
  if (isDatabaseError(error)) {
    const pgError = error as DatabaseError;
    const code = pgError.code || 'UNKNOWN';
    const userMessage = PG_ERROR_MESSAGES[code] || pgError.message || 'Database operation failed';

    return {
      error: 'Database Error',
      message: userMessage,
      details: {
        constraint: pgError.constraint,
        table: pgError.table,
        column: pgError.column,
        dataType: pgError.dataType,
        detail: pgError.detail
      },
      code
    };
  }

  // Handle standard errors
  if (error instanceof Error) {
    return {
      error: 'Operation Failed',
      message: error.message,
      code: 'OPERATION_ERROR'
    };
  }

  // Handle unknown errors
  return {
    error: 'Unknown Error',
    message: 'An unexpected error occurred',
    code: 'UNKNOWN_ERROR'
  };
}

/**
 * Type guard for DatabaseError
 */
function isDatabaseError(error: unknown): error is DatabaseError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'severity' in error
  );
}

/**
 * Validate upload data before insert
 */
export function validateUploadData(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.supplier_id) {
    errors.push('Supplier ID is required');
  }

  if (!data.filename || data.filename.trim() === '') {
    errors.push('Filename is required');
  }

  if (!data.currency || data.currency.length !== 3) {
    errors.push('Valid currency code (3 letters) is required');
  }

  if (!data.valid_from) {
    errors.push('Valid from date is required');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate selection operation
 */
export function validateSelectionOperation(operation: {
  action: string;
  selection_id?: string;
  supplier_product_ids: string[];
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!['select', 'deselect', 'approve'].includes(operation.action)) {
    errors.push('Invalid action. Must be select, deselect, or approve');
  }

  if (!operation.supplier_product_ids || operation.supplier_product_ids.length === 0) {
    errors.push('At least one product ID is required');
  }

  if (operation.action !== 'approve' && !operation.selection_id) {
    errors.push('Selection ID is required for this action');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Create a standardized error response for API routes
 */
export function createErrorResponse(
  error: unknown,
  statusCode: number = 500
): NextResponse<ErrorResponse> {
  const errorResponse = mapNeonQueryError(error);

  // Log error for monitoring (production should use proper logging service)
  console.error('API Error:', {
    error: errorResponse,
    statusCode,
    timestamp: new Date().toISOString()
  });

  return NextResponse.json(errorResponse, { status: statusCode });
}

/**
 * Validate and sanitize query parameters
 */
export function validateQueryParams(params: URLSearchParams, schema: {
  [key: string]: 'string' | 'number' | 'boolean' | 'uuid' | 'date' | 'array'
}): { valid: boolean; errors: string[]; parsed: Record<string, any> } {
  const errors: string[] = [];
  const parsed: Record<string, any> = {};

  for (const [key, type] of Object.entries(schema)) {
    const value = params.get(key);

    if (!value) {
      continue;
    }

    switch (type) {
      case 'number':
        const num = parseInt(value, 10);
        if (isNaN(num)) {
          errors.push(`${key} must be a valid number`);
        } else {
          parsed[key] = num;
        }
        break;

      case 'boolean':
        if (value !== 'true' && value !== 'false') {
          errors.push(`${key} must be true or false`);
        } else {
          parsed[key] = value === 'true';
        }
        break;

      case 'uuid':
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(value)) {
          errors.push(`${key} must be a valid UUID`);
        } else {
          parsed[key] = value;
        }
        break;

      case 'date':
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          errors.push(`${key} must be a valid date`);
        } else {
          parsed[key] = date;
        }
        break;

      case 'array':
        parsed[key] = value.split(',').map(v => v.trim());
        break;

      case 'string':
      default:
        parsed[key] = value;
        break;
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    parsed
  };
}

/**
 * Validate request body for required fields
 */
export function validateRequestBody(
  body: any,
  requiredFields: string[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const field of requiredFields) {
    if (!(field in body) || body[field] === null || body[field] === undefined) {
      errors.push(`${field} is required`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
