/**
 * API Helper Utilities for MantisNXT
 * Provides standardized error handling, data transformation, and timestamp serialization
 */

import { NextResponse } from 'next/server'
import type { z } from 'zod'

/**
 * Standard error response interface
 */
export interface ApiError {
  success: false
  error: string
  details?: unknown
  timestamp?: string
  code?: string
}

/**
 * Standard success response interface
 */
export interface ApiSuccess<T = unknown> {
  success: true
  data: T
  message?: string
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
  timestamp?: string
}

/**
 * Safely converts database timestamp to ISO string
 * Handles null, undefined, and invalid dates
 */
export function serializeTimestamp(timestamp: unknown): string | null {
  if (!timestamp) return null

  try {
    const date = new Date(timestamp)
    if (isNaN(date.getTime())) {
      console.warn('Invalid timestamp provided:', timestamp)
      return null
    }
    return date.toISOString()
  } catch (error) {
    console.warn('Error serializing timestamp:', timestamp, error)
    return null
  }
}

/**
 * Safely converts multiple timestamps in an object
 */
export function serializeTimestamps<T extends Record<string, unknown>>(
  obj: T,
  timestampFields: (keyof T)[]
): T {
  const result = { ...obj }

  for (const field of timestampFields) {
    if (result[field]) {
      result[field] = serializeTimestamp(result[field]) as T[keyof T]
    }
  }

  return result
}

/**
 * Transform database row to API response format with proper timestamp handling
 */
export function transformDatabaseRow<T extends Record<string, unknown>>(
  row: T,
  timestampFields: (keyof T)[] = ['created_at', 'updated_at']
): T {
  return serializeTimestamps(row, timestampFields)
}

/**
 * Transform array of database rows
 */
export function transformDatabaseRows<T extends Record<string, unknown>>(
  rows: T[],
  timestampFields: (keyof T)[] = ['created_at', 'updated_at']
): T[] {
  return rows.map(row => transformDatabaseRow(row, timestampFields))
}

/**
 * Creates standardized error response
 */
export function createErrorResponse(
  error: string,
  details?: unknown,
  status: number = 500,
  code?: string
): NextResponse {
  const response: ApiError = {
    success: false,
    error,
    details,
    timestamp: new Date().toISOString(),
    ...(code && { code })
  }

  console.error('API Error:', { error, details, status, code })

  return NextResponse.json(response, { status })
}

/**
 * Creates standardized success response
 */
export function createSuccessResponse<T>(
  data: T,
  message?: string,
  pagination?: ApiSuccess<T>['pagination']
): NextResponse {
  const response: ApiSuccess<T> = {
    success: true,
    data,
    timestamp: new Date().toISOString(),
    ...(message && { message }),
    ...(pagination && { pagination })
  }

  return NextResponse.json(response)
}

/**
 * Handle Zod validation errors
 */
export function handleValidationError(error: z.ZodError): NextResponse {
  const details = error.issues.map(e => ({
    field: e.path.join('.'),
    message: e.message,
    code: e.code
  }))

  return createErrorResponse(
    'Validation failed',
    details,
    400,
    'VALIDATION_ERROR'
  )
}

/**
 * Handle database errors with proper error mapping
 */
export function handleDatabaseError(error: unknown): NextResponse {
  console.error('Database error:', error)

  // Handle specific PostgreSQL errors
  if (error.code) {
    switch (error.code) {
      case '23505': // unique_violation
        return createErrorResponse(
          'Duplicate entry',
          { constraint: error.constraint },
          409,
          'DUPLICATE_ENTRY'
        )
      case '23503': // foreign_key_violation
        return createErrorResponse(
          'Foreign key constraint violated',
          { constraint: error.constraint },
          400,
          'FOREIGN_KEY_VIOLATION'
        )
      case '23502': // not_null_violation
        return createErrorResponse(
          'Required field missing',
          { column: error.column },
          400,
          'NOT_NULL_VIOLATION'
        )
      case '42P01': // undefined_table
        return createErrorResponse(
          'Database table not found',
          { table: error.table },
          500,
          'TABLE_NOT_FOUND'
        )
      default:
        return createErrorResponse(
          'Database error',
          { code: error.code, message: error.message },
          500,
          'DATABASE_ERROR'
        )
    }
  }

  // Handle connection errors
  if (error.message?.includes('connect')) {
    return createErrorResponse(
      'Database connection failed',
      { message: error.message },
      503,
      'CONNECTION_ERROR'
    )
  }

  // Generic database error
  return createErrorResponse(
    'Internal server error',
    { message: error.message },
    500,
    'INTERNAL_ERROR'
  )
}

/**
 * Validate and sanitize pagination parameters
 */
export function validatePagination(searchParams: URLSearchParams) {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
  const offset = (page - 1) * limit

  return { page, limit, offset }
}

/**
 * Calculate pagination metadata
 */
export function calculatePagination(
  page: number,
  limit: number,
  total: number
) {
  const totalPages = Math.ceil(total / limit)

  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1
  }
}

/**
 * Safe JSON serialization with timestamp handling
 */
export function safeJSONSerialize(obj: unknown): unknown {
  return JSON.parse(JSON.stringify(obj, (key, value) => {
    // Handle Date objects
    if (value instanceof Date) {
      return value.toISOString()
    }

    // Handle BigInt
    if (typeof value === 'bigint') {
      return value.toString()
    }

    return value
  }))
}

/**
 * Parse and validate filter arrays from query params
 */
export function parseFilterArray(value: string | null): string[] | undefined {
  if (!value) return undefined
  return value.split(',').filter(Boolean)
}

/**
 * Parse boolean from query params
 */
export function parseBoolean(value: string | null): boolean | undefined {
  if (value === null) return undefined
  return value === 'true'
}

/**
 * Parse number from query params with validation
 */
export function parseNumber(value: string | null, min?: number, max?: number): number | undefined {
  if (!value) return undefined

  const num = parseFloat(value)
  if (isNaN(num)) return undefined

  if (min !== undefined && num < min) return min
  if (max !== undefined && num > max) return max

  return num
}

/**
 * Standardized cache headers for API responses
 */
export function addCacheHeaders(response: NextResponse, maxAge: number = 300): NextResponse {
  response.headers.set('Cache-Control', `public, max-age=${maxAge}`)
  response.headers.set('ETag', `"${Date.now()}"`)
  return response
}

/**
 * Security headers for API responses
 */
export function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  return response
}

/**
 * Comprehensive error logger for debugging
 */
export function logApiError(
  endpoint: string,
  method: string,
  error: unknown,
  context?: Record<string, unknown>
) {
  console.error(`API Error [${method} ${endpoint}]:`, {
    error: error.message || error,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    ...context
  })
}

/**
 * Request rate limiting check (placeholder for future implementation)
 */
export function checkRateLimit(request: Request): boolean {
  // TODO: Implement rate limiting logic
  return true
}