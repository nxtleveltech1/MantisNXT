/**
 * API Authentication Middleware
 *
 * Provides JWT-based authentication for API routes.
 * Usage: Wrap API route handlers with withAuth()
 */

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

type RouteHandler<TContext extends Record<string, unknown> | undefined = Record<string, unknown>> = (
  request: NextRequest,
  context?: TContext
) => Promise<NextResponse>;

// Public endpoints that don't require authentication
const PUBLIC_ENDPOINTS = [
  '/api/health',
  '/api/health/database',
  '/api/health/database-enterprise',
  // Selection APIs are public for read operations (UI access without auth)
  '/api/core/selections',
  '/api/core/selections/active',
  '/api/core/selections/catalog',
];

// Transitional flag: allow public GETs on selected endpoints
const ALLOW_PUBLIC_GET_ENDPOINTS = (process.env.ALLOW_PUBLIC_GET_ENDPOINTS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

/**
 * Validates JWT token from Authorization header
 *
 * @param token - JWT token string
 * @returns true if valid, false otherwise
 */
const JWT_SECRET = process.env.JWT_SECRET;

function validateToken(token: string): boolean {
  if (!token) return false;
  if (!JWT_SECRET) {
    console.error('JWT_SECRET is not configured. Rejecting token validation.');
    return false;
  }

  try {
    jwt.verify(token, JWT_SECRET);
    return true;
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('JWT verification failed:', error);
    }
    return false;
  }
}

/**
 * Extracts bearer token from Authorization header
 *
 * @param request - NextRequest object
 * @returns token string or null
 */
function extractToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader) {
    return null;
  }

  // Check for Bearer token format
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}

/**
 * Checks if endpoint is public (doesn't require auth)
 *
 * @param pathname - URL pathname
 * @returns true if public, false otherwise
 */
function isPublicEndpoint(pathname: string): boolean {
  if (PUBLIC_ENDPOINTS.some(endpoint => pathname.startsWith(endpoint))) return true;
  if (ALLOW_PUBLIC_GET_ENDPOINTS.length === 0) return false;
  return ALLOW_PUBLIC_GET_ENDPOINTS.some(endpoint => pathname.startsWith(endpoint));
}

/**
 * Higher-order function that wraps API route handlers with authentication
 *
 * @param handler - Original API route handler
 * @returns Wrapped handler with auth check
 *
 * @example
 * ```typescript
 * export const GET = withAuth(async (request: NextRequest) => {
 *   // Your authenticated route logic here
 *   return NextResponse.json({ data: 'protected' });
 * });
 * ```
 */
export function withAuth<TContext extends Record<string, unknown> | undefined = Record<string, unknown>>(
  handler: RouteHandler<TContext>
) {
  return async (request: NextRequest, context?: TContext): Promise<NextResponse> => {
    const pathname = request.nextUrl.pathname;

    // Skip auth for public endpoints
    if (isPublicEndpoint(pathname)) {
      return handler(request, context);
    }

    // Support transitional public GETs via env config
    if (
      request.method === 'GET' &&
      ALLOW_PUBLIC_GET_ENDPOINTS.some((e) => pathname.startsWith(e))
    ) {
      return handler(request, context);
    }

    // Extract and validate token
    const token = extractToken(request);

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Missing authentication token',
          detail: 'Authorization header with Bearer token required',
        },
        { status: 401 }
      );
    }

    const isValid = validateToken(token);

    if (!isValid) {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_TOKEN',
          message: 'Invalid or expired authentication token',
          detail: 'Please provide a valid JWT token',
        },
        { status: 401 }
      );
    }

    // Token is valid, proceed with request
    return handler(request, context);
  };
}

/**
 * Middleware function for Next.js middleware.ts
 * Can be used in src/middleware.ts for global auth
 *
 * @example
 * ```typescript
 * // src/middleware.ts
 * import { authMiddleware } from '@/middleware/api-auth';
 * export default authMiddleware;
 * export const config = { matcher: '/api/:path*' };
 * ```
 */
export function authMiddleware(request: NextRequest): NextResponse | null {
  const pathname = request.nextUrl.pathname;

  // Only apply to API routes
  if (!pathname.startsWith('/api')) {
    return null;
  }

  // Skip public endpoints
  if (isPublicEndpoint(pathname)) {
    return null;
  }

  // Extract and validate token
  const token = extractToken(request);

  if (!token || !validateToken(token)) {
    return NextResponse.json(
      {
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
      { status: 401 }
    );
  }

  // Token valid, continue
  return null;
}

/**
 * API key validation (alternative to JWT)
 * Checks X-API-Key header against environment variable
 *
 * @param request - NextRequest object
 * @returns true if valid API key, false otherwise
 */
export function validateApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get('X-API-Key');
  const validKey = process.env.API_KEY;

  if (!validKey) {
    // No API key configured, skip validation
    return true;
  }

  return apiKey === validKey;
}

/**
 * Simple API key auth wrapper
 * Alternative to JWT for simpler use cases
 *
 * @example
 * ```typescript
 * export const GET = withApiKey(async (request: NextRequest) => {
 *   return NextResponse.json({ data: 'protected' });
 * });
 * ```
 */
export function withApiKey<
  TContext extends Record<string, unknown> | undefined = Record<string, unknown>
>(handler: RouteHandler<TContext>) {
  return async (request: NextRequest, context?: TContext): Promise<NextResponse> => {
    const pathname = request.nextUrl.pathname;

    // Skip auth for public endpoints
    if (isPublicEndpoint(pathname)) {
      return handler(request, context);
    }

    // Transitional public GETs support
    if (
      request.method === 'GET' &&
      ALLOW_PUBLIC_GET_ENDPOINTS.some((e) => pathname.startsWith(e))
    ) {
      return handler(request, context);
    }

    if (!validateApiKey(request)) {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_API_KEY',
          message: 'Invalid or missing API key',
          detail: 'Provide valid X-API-Key header',
        },
        { status: 401 }
      );
    }

    return handler(request, context);
  };
}
