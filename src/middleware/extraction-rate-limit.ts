/**
 * Extraction Rate Limiting Middleware
 *
 * Apply rate limiting to extraction API endpoints
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRateLimitMiddleware, RateLimitPreset } from '@/lib/services/RateLimiter';

/**
 * Extract organization ID from request
 */
function extractOrgId(request: NextRequest): string | null {
  // Try to get from header
  const orgId = request.headers.get('x-organization-id');
  if (orgId) {
    return `org:${orgId}`;
  }

  // Try to get from auth token (if using JWT)
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      // Simple JWT decode (without verification for middleware)
      const token = authHeader.substring(7);
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      if (payload.org_id) {
        return `org:${payload.org_id}`;
      }
    } catch {
      // Invalid token format, ignore
    }
  }

  // Try to get user ID as fallback
  const userId = request.headers.get('x-user-id');
  if (userId) {
    return `user:${userId}`;
  }

  // Fall back to IP address
  const ip =
    request.headers.get('x-forwarded-for') ||
    request.headers.get('x-real-ip') ||
    request.ip ||
    'unknown';
  return `ip:${ip}`;
}

/**
 * Create middleware for specific endpoints
 */
export const uploadRateLimit = createRateLimitMiddleware(RateLimitPreset.UPLOAD, extractOrgId);

export const extractRateLimit = createRateLimitMiddleware(RateLimitPreset.EXTRACT, extractOrgId);

export const previewRateLimit = createRateLimitMiddleware(RateLimitPreset.PREVIEW, extractOrgId);

export const importRateLimit = createRateLimitMiddleware(RateLimitPreset.IMPORT, extractOrgId);

export const apiRateLimit = createRateLimitMiddleware(RateLimitPreset.API, extractOrgId);

/**
 * Apply rate limiting based on path
 */
export async function extractionRateLimitMiddleware(
  request: NextRequest
): Promise<NextResponse | null> {
  const path = request.nextUrl.pathname;

  // Apply different rate limits based on endpoint
  if (path.includes('/upload')) {
    return await uploadRateLimit(request);
  } else if (path.includes('/extract')) {
    return await extractRateLimit(request);
  } else if (path.includes('/preview')) {
    return await previewRateLimit(request);
  } else if (path.includes('/import')) {
    return await importRateLimit(request);
  } else {
    // Default API rate limit for other endpoints
    return await apiRateLimit(request);
  }
}
