import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

export const XERO_ORG_MISSING_MESSAGE =
  'No organization selected. Use the org switcher or add ?org_id= to the URL.';
export const XERO_ORG_MISMATCH_MESSAGE =
  'The selected app organization does not match your active authenticated organization. Switch to the same organization and try again.';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function normalizeOrgId(value: string | null): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function isValidXeroOrgId(value: string | null): boolean {
  return typeof value === 'string' && UUID_REGEX.test(value);
}

export function getExplicitXeroOrgId(request: NextRequest): string | null {
  return (
    normalizeOrgId(request.nextUrl.searchParams.get('org_id')) ??
    normalizeOrgId(request.headers.get('x-org-id')) ??
    null
  );
}

export function appendOrgId(url: URL, orgId: string | null | undefined): URL {
  if (orgId) {
    url.searchParams.set('org_id', orgId);
  }
  return url;
}

export interface ResolveXeroRequestContextOptions {
  requireUser?: boolean;
  requireOrg?: boolean;
  allowExplicitClerkMismatch?: boolean;
}

export interface XeroRequestContext {
  userId: string;
  resolvedOrgId: string | null;
  orgId: string;
  clerkOrgId: string | null;
  explicitOrgId: string | null;
  hasMismatch: boolean;
  error?: NextResponse;
}

export async function resolveXeroRequestContext(
  request: NextRequest,
  options: ResolveXeroRequestContextOptions = {}
): Promise<XeroRequestContext> {
  const {
    requireUser = true,
    requireOrg = true,
    allowExplicitClerkMismatch = true,
  } = options;

  const { userId, orgId: clerkOrgRaw } = await auth();
  const explicitOrgId = getExplicitXeroOrgId(request);
  const normalizedClerkOrgId = normalizeOrgId(clerkOrgRaw);
  const clerkOrgId = isValidXeroOrgId(normalizedClerkOrgId) ? normalizedClerkOrgId : null;

  if (explicitOrgId && !isValidXeroOrgId(explicitOrgId)) {
    return {
      userId: userId ?? '',
      resolvedOrgId: null,
      orgId: '',
      clerkOrgId,
      explicitOrgId,
      hasMismatch: false,
      error: NextResponse.json(
        { error: 'invalid_org_id', message: XERO_ORG_INVALID_MESSAGE },
        { status: 400 }
      ),
    };
  }

  if (requireUser && !userId) {
    return {
      userId: '',
      resolvedOrgId: null,
      orgId: '',
      clerkOrgId,
      explicitOrgId,
      hasMismatch: false,
      error: NextResponse.json(
        { error: 'unauthorized', message: 'Unauthorized. Please sign in.' },
        { status: 401 }
      ),
    };
  }

  const resolvedOrgId = explicitOrgId ?? clerkOrgId ?? null;
  const hasMismatch = Boolean(explicitOrgId && clerkOrgId && explicitOrgId !== clerkOrgId);

  if (hasMismatch && !allowExplicitClerkMismatch) {
    return {
      userId: userId ?? '',
      resolvedOrgId,
      orgId: resolvedOrgId ?? '',
      clerkOrgId,
      explicitOrgId,
      hasMismatch,
      error: NextResponse.json(
        {
          error: 'org_context_mismatch',
          message: XERO_ORG_MISMATCH_MESSAGE,
          details: {
            explicitOrgId,
            clerkOrgId,
          },
        },
        { status: 409 }
      ),
    };
  }

  if (requireOrg && !resolvedOrgId) {
    return {
      userId: userId ?? '',
      resolvedOrgId: null,
      orgId: '',
      clerkOrgId,
      explicitOrgId,
      hasMismatch,
      error: NextResponse.json(
        { error: 'missing_org', message: XERO_ORG_MISSING_MESSAGE },
        { status: 400 }
      ),
    };
  }

  return {
    userId: userId ?? '',
    resolvedOrgId,
    orgId: resolvedOrgId ?? '',
    clerkOrgId,
    explicitOrgId,
    hasMismatch,
  };
}

