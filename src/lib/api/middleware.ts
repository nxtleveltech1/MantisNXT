// @ts-nocheck
/**
 * Comprehensive API middleware for authentication, authorization, and request validation
 */

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'
import { z } from 'zod'
import type { SecurityConfig, SecurityContext } from '@/lib/security/middleware';
import { SecurityMiddleware } from '@/lib/security/middleware'

// Rate limiting configuration
const RATE_LIMITS = {
  default: { requests: 100, window: 60000 }, // 100 requests per minute
  auth: { requests: 5, window: 60000 }, // 5 auth requests per minute
  upload: { requests: 10, window: 60000 }, // 10 uploads per minute
  bulk: { requests: 5, window: 300000 }, // 5 bulk operations per 5 minutes
  aiGenerate: { requests: 40, window: 60000 }, // AI text generation quotas
  aiAnalyze: { requests: 8, window: 600000 }, // Analysis workloads are heavier
}

// Mock user data - in production this would come from database
const mockUsers = new Map([
  ['admin@company.com', {
    id: 'user_001',
    email: 'admin@company.com',
    name: 'System Administrator',
    role: 'admin',
    permissions: ['read', 'write', 'delete', 'admin', 'bulk_operations', 'user_management'],
    organizationId: 'org_001',
    isActive: true,
    lastLogin: new Date(),
    apiKey: 'sk_test_admin_12345'
  }],
  ['manager@company.com', {
    id: 'user_002',
    email: 'manager@company.com',
    name: 'Inventory Manager',
    role: 'manager',
    permissions: ['read', 'write', 'bulk_operations'],
    organizationId: 'org_001',
    isActive: true,
    lastLogin: new Date(),
    apiKey: 'sk_test_manager_67890'
  }],
  ['user@company.com', {
    id: 'user_003',
    email: 'user@company.com',
    name: 'Regular User',
    role: 'user',
    permissions: ['read'],
    organizationId: 'org_001',
    isActive: true,
    lastLogin: new Date(),
    apiKey: 'sk_test_user_11111'
  }]
])

export interface AuthenticatedUser {
  id: string
  email: string
  name: string
  role: string
  permissions: string[]
  organizationId: string
  isActive: boolean
  lastLogin: Date
}

export interface RequestContext {
  user?: AuthenticatedUser
  ipAddress: string
  userAgent: string
  isAuthenticated: boolean
  rateLimit: {
    endpoint: string
    limit: number
    remaining: number
    resetTime: Date
  }
}

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  details?: unknown
  message?: string
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
  meta?: {
    timestamp: string
    requestId: string
    version: string
    processingTime: number
  }
}

// Enhanced security configuration
const securityConfig: SecurityConfig = {
  enableRateLimit: true,
  rateLimitRequests: 100,
  rateLimitWindow: 60000,
  enableIPWhitelist: false,
  whitelistedIPs: [],
  enableSecurityHeaders: true,
  enableCSRFProtection: true,
  sessionTimeout: 3600000, // 1 hour
}

const securityMiddleware = new SecurityMiddleware(securityConfig)

export class ApiMiddleware {
  private static requestCounter = 0

  /**
   * Main middleware function that handles authentication, authorization, and security
   */
  static withAuth(
    handler: (request: NextRequest, context: RequestContext) => Promise<NextResponse>,
    options: {
      requiredPermissions?: string[]
      requiredRole?: string
      allowAnonymous?: boolean
      rateLimitType?: keyof typeof RATE_LIMITS
    } = {}
  ) {
    return async (request: NextRequest): Promise<NextResponse> => {
      const startTime = Date.now()
      const requestId = `req_${Date.now()}_${++this.requestCounter}`

      try {
        // Extract request information
        const ipAddress = this.getClientIP(request)
        const userAgent = request.headers.get('user-agent') || ''

        // Security validation
        const securityContext: SecurityContext = {
          ipAddress,
          userAgent,
          isAuthenticated: false,
          permissions: []
        }

        const securityResult = securityMiddleware.validateRequest(
          {
            path: request.nextUrl.pathname,
            method: request.method,
            headers: Object.fromEntries(request.headers.entries()),
            body: request.method !== 'GET' ? await this.safeReadBody(request) : undefined
          },
          securityContext
        )

        if (!securityResult.allowed) {
          return this.createErrorResponse(
            securityResult.reason || 'Request blocked for security reasons',
            429,
            { riskScore: securityResult.riskScore, requestId }
          )
        }

        // Authentication
        let user: AuthenticatedUser | undefined
        const authResult = await this.authenticateRequest(request)

        if (!authResult.success && !options.allowAnonymous) {
          return this.createErrorResponse(
            authResult.error || 'Authentication required',
            401,
            { requestId }
          )
        }

        user = authResult.user
        securityContext.isAuthenticated = !!user
        securityContext.userId = user?.id
        securityContext.permissions = user?.permissions || []

        // Authorization
        if (user && options.requiredPermissions) {
          const hasPermission = options.requiredPermissions.every(permission =>
            user!.permissions.includes(permission)
          )

          if (!hasPermission) {
            return this.createErrorResponse(
              'Insufficient permissions',
              403,
              {
                required: options.requiredPermissions,
                available: user.permissions,
                requestId
              }
            )
          }
        }

        if (user && options.requiredRole && user.role !== options.requiredRole) {
          return this.createErrorResponse(
            `Role '${options.requiredRole}' required`,
            403,
            { currentRole: user.role, requiredRole: options.requiredRole, requestId }
          )
        }

        // Rate limiting
        const rateLimitResult = this.checkRateLimit(
          ipAddress + (user?.id || ''),
          options.rateLimitType || 'default'
        )

        if (!rateLimitResult.allowed) {
          return this.createErrorResponse(
            'Rate limit exceeded',
            429,
            {
              rateLimit: rateLimitResult,
              requestId
            }
          )
        }

        // Create request context
        const context: RequestContext = {
          user,
          ipAddress,
          userAgent,
          isAuthenticated: !!user,
          rateLimit: rateLimitResult
        }

        // Call the actual handler
        const response = await handler(request, context)

        // Add security headers
        const securityHeaders = securityMiddleware.generateSecurityHeaders()
        Object.entries(securityHeaders).forEach(([key, value]) => {
          response.headers.set(key, value)
        })

        // Add rate limit headers
        response.headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString())
        response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString())
        response.headers.set('X-RateLimit-Reset', rateLimitResult.resetTime.getTime().toString())

        // Add request metadata
        response.headers.set('X-Request-ID', requestId)
        response.headers.set('X-Processing-Time', `${Date.now() - startTime}ms`)

        return response

      } catch (error) {
        console.error('API Middleware Error:', error)
        return this.createErrorResponse(
          'Internal server error',
          500,
          { requestId, error: error instanceof Error ? error.message : 'Unknown error' }
        )
      }
    }
  }

  /**
   * Validation middleware for request data
   */
  static withValidation<T>(
    schema: z.ZodSchema<T>,
    options: { validateQuery?: boolean; validateBody?: boolean } = { validateBody: true },
    authOptions: { allowAnonymous?: boolean; requiredPermissions?: string[]; requiredRole?: string; rateLimitType?: keyof typeof RATE_LIMITS } = {}
  ) {
    return (
      handler: (request: NextRequest, context: RequestContext, validatedData: T) => Promise<NextResponse>
    ) => {
      return this.withAuth(async (request: NextRequest, context: RequestContext) => {
        try {
          let dataToValidate: unknown = {}

          if (options.validateQuery) {
            const { searchParams } = new URL(request.url)
            dataToValidate = Object.fromEntries(searchParams.entries())
          }

          if (options.validateBody && request.method !== 'GET') {
            const body = await request.json()
            dataToValidate = options.validateQuery ? { ...dataToValidate, ...body } : body
          }

          const validatedData = schema.parse(dataToValidate)
          return await handler(request, context, validatedData)

        } catch (error) {
          if (error instanceof z.ZodError) {
            return this.createErrorResponse(
              'Validation error',
              400,
              {
                validationErrors: error.issues,
                message: 'Request data is invalid'
              }
            )
          }
          throw error
        }
      }, authOptions)
    }
  }

  /**
   * File upload middleware
   */
  static withFileUpload(
    options: {
      maxFileSize?: number // in bytes
      allowedTypes?: string[]
      maxFiles?: number
    } = {}
  ) {
    return (
      handler: (request: NextRequest, context: RequestContext, files: File[]) => Promise<NextResponse>
    ) => {
      return this.withAuth(async (request: NextRequest, context: RequestContext) => {
        try {
          const formData = await request.formData()
          const files: File[] = []

          for (const [key, value] of formData.entries()) {
            if (value instanceof File) {
              // Validate file size
              if (options.maxFileSize && value.size > options.maxFileSize) {
                return this.createErrorResponse(
                  `File ${value.name} exceeds maximum size of ${options.maxFileSize} bytes`,
                  400
                )
              }

              // Validate file type
              if (options.allowedTypes && !options.allowedTypes.includes(value.type)) {
                return this.createErrorResponse(
                  `File type ${value.type} not allowed`,
                  400,
                  { allowedTypes: options.allowedTypes }
                )
              }

              files.push(value)
            }
          }

          // Validate file count
          if (options.maxFiles && files.length > options.maxFiles) {
            return this.createErrorResponse(
              `Too many files. Maximum ${options.maxFiles} allowed`,
              400
            )
          }

          if (files.length === 0) {
            return this.createErrorResponse(
              'No files uploaded',
              400
            )
          }

          return await handler(request, context, files)

        } catch (error) {
          console.error('File upload error:', error)
          return this.createErrorResponse(
            'File upload failed',
            400,
            { error: error instanceof Error ? error.message : 'Unknown error' }
          )
        }
      }, { rateLimitType: 'upload', requiredPermissions: ['write'] })
    }
  }

  /**
   * Bulk operations middleware
   */
  static withBulkOperation() {
    return (
      handler: (request: NextRequest, context: RequestContext) => Promise<NextResponse>
    ) => {
      return this.withAuth(handler, {
        rateLimitType: 'bulk',
        requiredPermissions: ['bulk_operations']
      })
    }
  }

  /**
   * Authentication helper
   */
  private static async authenticateRequest(request: NextRequest): Promise<{
    success: boolean
    user?: AuthenticatedUser
    error?: string
  }> {
    // Try API key authentication first
    const apiKey = request.headers.get('x-api-key')
    if (apiKey) {
      for (const [email, userData] of mockUsers) {
        if (userData.apiKey === apiKey && userData.isActive) {
          return { success: true, user: userData }
        }
      }
      return { success: false, error: 'Invalid API key' }
    }

    // Try Bearer token authentication
    const authorization = request.headers.get('authorization')
    if (authorization?.startsWith('Bearer ')) {
      const token = authorization.substring(7)
      // In production, validate JWT token here
      // For now, we'll check against a simple token format
      const email = this.extractEmailFromToken(token)
      if (email && mockUsers.has(email)) {
        const user = mockUsers.get(email)!
        if (user.isActive) {
          return { success: true, user }
        }
      }
      return { success: false, error: 'Invalid or expired token' }
    }

    // Try session-based authentication (would typically check cookies/session)
    const sessionId = request.headers.get('x-session-id')
    if (sessionId) {
      // In production, validate session from database/cache
      // For now, we'll use a simple mapping
      if (sessionId === 'session_admin_123') {
        const user = mockUsers.get('admin@company.com')!
        return { success: true, user }
      }
    }

    return { success: false, error: 'No valid authentication provided' }
  }

  /**
   * Extract email from JWT token (simplified for demo)
   */
  private static extractEmailFromToken(token: string): string | null {
    try {
      // In production, use proper JWT verification
      const parts = token.split('.')
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]))
        return payload.email || null
      }
    } catch (error) {
      // Invalid token format
    }
    return null
  }

  /**
   * Get client IP address
   */
  private static getClientIP(request: NextRequest): string {
    const xForwardedFor = request.headers.get('x-forwarded-for')
    const xRealIP = request.headers.get('x-real-ip')
    const cfConnectingIP = request.headers.get('cf-connecting-ip')

    return cfConnectingIP ||
           xForwardedFor?.split(',')[0]?.trim() ||
           xRealIP ||
           request.ip ||
           '127.0.0.1'
  }

  /**
   * Rate limiting check
   */
  private static checkRateLimit(
    identifier: string,
    type: keyof typeof RATE_LIMITS
  ): {
    allowed: boolean
    limit: number
    remaining: number
    resetTime: Date
  } {
    const config = RATE_LIMITS[type]
    const now = Date.now()
    const windowStart = now - config.window
    const resetTime = new Date(now + config.window)

    // In production, use Redis or similar for distributed rate limiting
    // For now, we'll use a simple in-memory implementation
    const key = `ratelimit:${type}:${identifier}`

    // This is a simplified implementation
    // In production, implement proper sliding window rate limiting
    return {
      allowed: true, // Simplified for demo
      limit: config.requests,
      remaining: config.requests - 1,
      resetTime
    }
  }

  /**
   * Safe body reading that handles already consumed streams
   */
  private static async safeReadBody(request: NextRequest): Promise<unknown> {
    try {
      const cloned = request.clone()
      return await cloned.json()
    } catch (error) {
      return null
    }
  }

  /**
   * Create standardized error response
   */
  static createErrorResponse(
    message: string,
    status: number,
    details?: unknown
  ): NextResponse {
    const response: ApiResponse = {
      success: false,
      error: message,
      details,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: details?.requestId || `err_${Date.now()}`,
        version: '1.0.0',
        processingTime: 0
      }
    }

    return NextResponse.json(response, { status })
  }

  /**
   * Create standardized success response
   */
  static createSuccessResponse<T>(
    data: T,
    message?: string,
    meta?: Partial<ApiResponse['meta']>,
    pagination?: ApiResponse['pagination']
  ): NextResponse {
    const response: ApiResponse<T> = {
      success: true,
      data,
      message,
      pagination,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: `req_${Date.now()}`,
        version: '1.0.0',
        processingTime: 0,
        ...meta
      }
    }

    return NextResponse.json(response)
  }
}

// Export types for use in API routes
export type { RequestContext, ApiResponse, AuthenticatedUser }
// ApiMiddleware already exported above
