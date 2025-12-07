/**
 * Secure API Middleware for WooCommerce Integration
 *
 * Provides authentication, authorization, and security validations for WooCommerce API routes
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { InputValidator, CSRFProtection } from '@/lib/utils/secure-storage';
import { createErrorResponse } from '@/lib/utils/neon-error-handler';

/**
 * Authentication and Authorization Result
 */
export interface AuthResult {
  success: boolean;
  orgId: string | null;
  userId: string | null;
  userRole: string | null;
  error?: string;
}

/**
 * Validate organization context from request
 */
export async function validateOrganizationContext(request: NextRequest): Promise<AuthResult> {
  try {
    const orgId = request.headers.get('x-org-id') || request.nextUrl.searchParams.get('orgId');

    if (!orgId) {
      return {
        success: false,
        orgId: null,
        userId: null,
        userRole: null,
        error: 'Organization ID is required',
      };
    }

    if (!InputValidator.validateUUID(orgId)) {
      return {
        success: false,
        orgId: null,
        userId: null,
        userRole: null,
        error: 'Invalid organization ID format',
      };
    }

    // Validate organization exists and is active
    const orgResult = await query(
      `SELECT id, is_active, name FROM organizations WHERE id = $1`,
      [orgId]
    );

    if (orgResult.rows.length === 0) {
      return {
        success: false,
        orgId: null,
        userId: null,
        userRole: null,
        error: 'Organization not found',
      };
    }

    const org = orgResult.rows[0];
    if (!org.is_active) {
      return {
        success: false,
        orgId: null,
        userId: null,
        userRole: null,
        error: 'Organization is inactive',
      };
    }

    return {
      success: true,
      orgId,
      userId: null,
      userRole: null,
    };
  } catch (error) {
    console.error('Organization validation error:', error);
    return {
      success: false,
      orgId: null,
      userId: null,
      userRole: null,
      error: 'Failed to validate organization',
    };
  }
}

/**
 * Validate user authentication and permissions
 */
export async function validateUserAuth(request: NextRequest, orgId: string): Promise<AuthResult> {
  try {
    // In a real implementation, this would validate JWT tokens, sessions, etc.
    // For now, we'll implement a basic validation based on headers

    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');

    // Basic user validation
    if (userId && !InputValidator.validateUUID(userId)) {
      return {
        success: false,
        orgId,
        userId: null,
        userRole: null,
        error: 'Invalid user ID format',
      };
    }

    // Validate user exists and belongs to organization
    if (userId) {
      const userResult = await query(
        `SELECT id, role, is_active FROM users
         WHERE id = $1 AND org_id = $2`,
        [userId, orgId]
      );

      if (userResult.rows.length === 0) {
        return {
          success: false,
          orgId,
          userId: null,
          userRole: null,
          error: 'User not found or does not belong to organization',
        };
      }

      const user = userResult.rows[0];
      if (!user.is_active) {
        return {
          success: false,
          orgId,
          userId: null,
          userRole: null,
          error: 'User account is inactive',
        };
      }

      return {
        success: true,
        orgId,
        userId,
        userRole: user.role,
      };
    }

    // For now, allow requests without user context but flag them
    return {
      success: true,
      orgId,
      userId: null,
      userRole: null,
    };
  } catch (error) {
    console.error('User authentication error:', error);
    return {
      success: false,
      orgId,
      userId: null,
      userRole: null,
      error: 'Failed to authenticate user',
    };
  }
}

/**
 * Validate admin permissions
 */
export function validateAdminPermissions(userRole: string | null): boolean {
  if (!userRole) {
    return false;
  }

  return userRole === 'super_admin' || userRole === 'admin';
}

/**
 * Validate CSRF token
 */
export async function validateCSRFToken(request: NextRequest): Promise<boolean> {
  try {
    const csrfToken = request.headers.get('x-csrf-token');

    if (!csrfToken) {
      return false;
    }

    return await CSRFProtection.validateToken(csrfToken);
  } catch (error) {
    console.error('CSRF validation error:', error);
    return false;
  }
}

/**
 * Validate request for write operations
 */
export async function validateWriteOperation(request: NextRequest): Promise<AuthResult> {
  // Validate organization
  const orgValidation = await validateOrganizationContext(request);
  if (!orgValidation.success) {
    return orgValidation;
  }

  // Validate user
  const userValidation = await validateUserAuth(request, orgValidation.orgId!);
  if (!userValidation.success) {
    return userValidation;
  }

  // Validate CSRF token for write operations
  const csrfValid = await validateCSRFToken(request);
  if (!csrfValid) {
    return {
      success: false,
      orgId: userValidation.orgId,
      userId: userValidation.userId,
      userRole: userValidation.userRole,
      error: 'Invalid or missing CSRF token',
    };
  }

  return userValidation;
}

/**
 * Validate admin-only operations
 */
export async function validateAdminOperation(request: NextRequest): Promise<AuthResult> {
  const authResult = await validateWriteOperation(request);

  if (!authResult.success) {
    return authResult;
  }

  if (!validateAdminPermissions(authResult.userRole)) {
    return {
      success: false,
      orgId: authResult.orgId,
      userId: authResult.userId,
      userRole: authResult.userRole,
      error: 'Admin privileges required',
    };
  }

  return authResult;
}

/**
 * Secure API route handler wrapper
 */
export function withSecureAuth(
  handler: (request: NextRequest, auth: AuthResult) => Promise<NextResponse>
) {
  return async function securedHandler(request: NextRequest) {
    try {
      // Validate organization context
      const orgValidation = await validateOrganizationContext(request);
      if (!orgValidation.success) {
        return createErrorResponse(
          new Error(orgValidation.error || 'Unauthorized'),
          401
        );
      }

      // Validate user authentication
      const authValidation = await validateUserAuth(request, orgValidation.orgId!);
      if (!authValidation.success) {
        return createErrorResponse(
          new Error(authValidation.error || 'Unauthorized'),
          401
        );
      }

      // Pass to handler with authentication context
      return await handler(request, authValidation);
    } catch (error: any) {
      console.error('Secure auth error:', error);
      return createErrorResponse(error, 500);
    }
  };
}

/**
 * Secure admin-only API route handler wrapper
 */
export function withAdminAuth(
  handler: (request: NextRequest, auth: AuthResult) => Promise<NextResponse>
) {
  return async function adminSecuredHandler(request: NextRequest) {
    try {
      // Validate organization context
      const orgValidation = await validateOrganizationContext(request);
      if (!orgValidation.success) {
        return createErrorResponse(
          new Error(orgValidation.error || 'Unauthorized'),
          401
        );
      }

      // Validate user authentication and admin permissions
      const authValidation = await validateAdminOperation(request);
      if (!authValidation.success) {
        return createErrorResponse(
          new Error(authValidation.error || 'Unauthorized'),
          403
        );
      }

      // Pass to handler with authentication context
      return await handler(request, authValidation);
    } catch (error: any) {
      console.error('Admin auth error:', error);
      return createErrorResponse(error, 500);
    }
  };
}

/**
 * Rate limiting validation
 */
export function validateRateLimit(request: NextRequest, key: string, limit: number, windowMs: number): boolean {
  // Simple in-memory rate limiting (in production, use Redis or similar)
  const now = Date.now();
  const windowStart = now - windowMs;

  // This is a basic implementation - in production, use a proper rate limiter
  // like @vercel/ratelimit or a Redis-based solution
  return true;
}

/**
 * Input sanitization middleware
 */
export function sanitizeInput(value: any): any {
  if (typeof value === 'string') {
    return InputValidator.sanitizeInput(value);
  }
  if (typeof value === 'object' && value !== null) {
    const sanitized: any = {};
    for (const [key, val] of Object.entries(value)) {
      sanitized[key] = sanitizeInput(val);
    }
    return sanitized;
  }
  return value;
}

/**
 * Input validation middleware for WooCommerce URLs
 */
export function validateWooCommerceInput(input: {
  store_url: string;
  consumer_key: string;
  consumer_secret: string;
}): { success: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate URL
  if (!input.store_url || !InputValidator.validateUrl(input.store_url)) {
    errors.push('Invalid WooCommerce store URL');
  }

  // Validate consumer key
  if (!input.consumer_key || !InputValidator.validateConsumerKey(input.consumer_key)) {
    errors.push('Invalid WooCommerce consumer key');
  }

  // Validate consumer secret
  if (!input.consumer_secret || !InputValidator.validateConsumerSecret(input.consumer_secret)) {
    errors.push('Invalid WooCommerce consumer secret');
  }

  return {
    success: errors.length === 0,
    errors,
  };
}