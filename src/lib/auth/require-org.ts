/**
 * Strict Org Resolution for Pricing & Analytics
 *
 * No fallback UUIDs. No database guessing.
 * If org context is missing, we reject the request.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { authenticateRequest, type AuthUser, AuthError } from './middleware';

/**
 * Extract authenticated user and org_id from request.
 * Throws AuthError if auth fails or org is missing.
 */
export async function requireAuthOrg(
  request: NextRequest
): Promise<{ user: AuthUser; orgId: string }> {
  const user = await authenticateRequest(request);
  const orgId = user.organizationId;

  if (!orgId || orgId === '00000000-0000-0000-0000-000000000000') {
    throw new AuthError('Organization context required', 403, 'ORG_REQUIRED');
  }

  return { user, orgId };
}

/**
 * Convenience: extract just the orgId from an already-authenticated user.
 * Use when you've already called authenticateRequest yourself.
 */
export function getOrgIdFromUser(user: AuthUser): string {
  const orgId = user.organizationId;
  if (!orgId || orgId === '00000000-0000-0000-0000-000000000000') {
    throw new AuthError('Organization context required', 403, 'ORG_REQUIRED');
  }
  return orgId;
}

/**
 * Standard 401/403 JSON response for missing auth/org.
 */
export function unauthorizedResponse(message = 'Authentication required'): NextResponse {
  return NextResponse.json(
    { success: false, error: message, code: 'UNAUTHORIZED' },
    { status: 401 }
  );
}

export function forbiddenResponse(message = 'Organization context required'): NextResponse {
  return NextResponse.json(
    { success: false, error: message, code: 'ORG_REQUIRED' },
    { status: 403 }
  );
}
