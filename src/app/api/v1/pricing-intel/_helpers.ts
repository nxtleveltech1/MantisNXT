import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireAuthOrg } from '@/lib/auth/require-org';
import { type AuthUser, handleError } from '@/lib/auth/middleware';

/**
 * Strict org resolution for pricing-intel routes.
 * No fallback UUIDs. Requires authenticated org context.
 */
export async function getPricingIntelAuth(
  request: NextRequest
): Promise<{ user: AuthUser; orgId: string }> {
  return requireAuthOrg(request);
}

/**
 * @deprecated Use getPricingIntelAuth instead.
 * Kept for backward-compat during migration -- delegates to strict version.
 */
export async function getOrgId(
  request: NextRequest,
  _body?: Record<string, unknown>
): Promise<string> {
  const { orgId } = await requireAuthOrg(request);
  return orgId;
}

/**
 * Standard error handler for pricing-intel routes.
 * Delegates to auth middleware handleError for proper status codes.
 */
export { handleError as handlePricingIntelError } from '@/lib/auth/middleware';
export function handleApiError(error: unknown): NextResponse {
  return handleError(error);
}
