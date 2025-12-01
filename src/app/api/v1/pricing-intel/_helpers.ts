import type { NextRequest } from 'next/server';
import { query } from '@/lib/database';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Get organization ID from request with fallback
 * Tries: body -> header -> query -> env -> database -> default
 */
export async function getOrgId(
  request: NextRequest,
  body?: Record<string, unknown>
): Promise<string> {
  // 1. Check request body
  if (body) {
    const bodyOrg =
      typeof body.orgId === 'string'
        ? body.orgId
        : typeof body.org_id === 'string'
          ? (body.org_id as string)
          : null;
    if (bodyOrg && UUID_REGEX.test(bodyOrg)) {
      return bodyOrg;
    }
  }

  // 2. Check headers
  const headerOrg = request.headers.get('x-org-id') ?? request.headers.get('x-organization-id');
  if (headerOrg && UUID_REGEX.test(headerOrg)) {
    return headerOrg;
  }

  // 3. Check query params
  const urlOrg = new URL(request.url).searchParams.get('orgId');
  if (urlOrg && UUID_REGEX.test(urlOrg)) {
    return urlOrg;
  }

  // 4. Check environment variable
  const envOrgId = process.env.DEFAULT_ORG_ID;
  if (envOrgId && UUID_REGEX.test(envOrgId)) {
    return envOrgId;
  }

  // 5. Try database
  try {
    const result = await query<{ id: string }>(
      'SELECT id FROM public.organization ORDER BY created_at LIMIT 1'
    );
    if (result.rows && result.rows.length > 0) {
      return result.rows[0].id;
    }
  } catch (error) {
    console.warn('Failed to fetch organization from database:', error);
  }

  // 6. Fallback to known default
  return 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
}
