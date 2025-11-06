/**
 * Authentication & Authorization Middleware
 *
 * Provides authentication and authorization utilities for API routes
 *
 * @author Claude Code
 * @date 2025-11-02
 */

import { NextRequest, NextResponse } from 'next/server';
import * as jwt from 'jsonwebtoken';

const FALLBACK_ORG_ID = '00000000-0000-0000-0000-000000000000';
const DEFAULT_ORG_ID = process.env.DEFAULT_ORG_ID ?? FALLBACK_ORG_ID;

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

export interface AuthUser {
  userId: string;
  email: string;
  name: string;
  role: string;
  permissions: string[];
  organizationId: string;
}

export class AuthError extends Error {
  constructor(
    message: string,
    public statusCode: number = 401,
    public code: string = 'AUTH_ERROR'
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export class ServiceError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = 'SERVICE_ERROR'
  ) {
    super(message);
    this.name = 'ServiceError';
  }
}

/**
 * Extract and verify JWT token from request
 */
export async function authenticateRequest(request: NextRequest): Promise<AuthUser> {
  // Development mode bypass - return mock user
  if (process.env.NODE_ENV === 'development' && process.env.DISABLE_AUTH === 'true') {
    return {
      userId: '11111111-1111-1111-1111-111111111111',
      email: 'dev@mantisnxt.com',
      name: 'Development User',
      role: 'admin',
      permissions: ['admin'],
      organizationId: DEFAULT_ORG_ID,
    };
  }

  const token = request.headers.get('authorization')?.replace('Bearer ', '');

  if (!token) {
    throw new AuthError('No authentication token provided', 401, 'NO_TOKEN');
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    return decoded;
  } catch (error) {
    throw new AuthError('Invalid or expired token', 401, 'INVALID_TOKEN');
  }
}

/**
 * Check if user has required permission
 */
export async function authorizeUser(
  user: AuthUser,
  requiredPermission: string
): Promise<void> {
  if (!user.permissions.includes(requiredPermission) && !user.permissions.includes('admin')) {
    throw new AuthError(
      `Missing required permission: ${requiredPermission}`,
      403,
      'FORBIDDEN'
    );
  }
}

/**
 * Check if user has admin role
 */
export async function requireAdmin(user: AuthUser): Promise<void> {
  if (user.role !== 'admin' && user.role !== 'manager') {
    throw new AuthError('Admin access required', 403, 'ADMIN_REQUIRED');
  }
}

/**
 * Check if user can access customer data
 */
export async function authorizeCustomerAccess(
  user: AuthUser,
  customerId: string
): Promise<void> {
  // In a real implementation, this would check if the customer belongs to the user's organization
  // For now, we'll just verify the user is authenticated
  if (!user.organizationId) {
    throw new AuthError('Invalid user organization', 403, 'INVALID_ORG');
  }
}

/**
 * Standard error handler for API routes
 */
export function handleError(error: unknown): NextResponse {
  console.error('API Error:', error);

  if (error instanceof AuthError) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        code: error.code,
      },
      { status: error.statusCode }
    );
  }

  if (error instanceof ServiceError) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        code: error.code,
      },
      { status: error.statusCode }
    );
  }

  return NextResponse.json(
    {
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    },
    { status: 500 }
  );
}

/**
 * Extract pagination parameters from request
 */
export function getPaginationParams(searchParams: URLSearchParams): {
  page: number;
  limit: number;
  offset: number;
} {
  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

/**
 * Format pagination response
 */
export function formatPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
) {
  return {
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    },
  };
}
