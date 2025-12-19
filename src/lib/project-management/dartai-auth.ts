import type { NextRequest } from 'next/server';

import { requireAuth } from '@/lib/auth/auth-helper';
import { DartAiNotConnectedError, getDartAiUserToken } from '@/services/dartai/dartai-token-store';

export class PmAuthError extends Error {
  constructor(
    public code:
      | 'ORG_REQUIRED'
      | 'USER_NOT_SYNCED'
      | 'DARTAI_NOT_CONNECTED',
    message: string
  ) {
    super(message);
    this.name = 'PmAuthError';
  }
}

export function getRequestMeta(request: NextRequest) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    request.ip ||
    undefined;

  return {
    ipAddress: ip,
    userAgent: request.headers.get('user-agent') || undefined,
  };
}

export async function requirePmAuth(request: NextRequest): Promise<{ orgId: string; userId: string }> {
  const user = await requireAuth(request);

  if (!user.orgId) {
    throw new PmAuthError('ORG_REQUIRED', 'Organization context required');
  }

  // The PM module stores tokens keyed by auth.users_extended.id (UUID).
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id)) {
    throw new PmAuthError('USER_NOT_SYNCED', 'User record not synced yet');
  }

  return { orgId: user.orgId, userId: user.id };
}

export async function requirePmDartAiToken(request: NextRequest): Promise<{
  orgId: string;
  userId: string;
  token: string;
}> {
  const { orgId, userId } = await requirePmAuth(request);
  const meta = getRequestMeta(request);

  try {
    const token = await getDartAiUserToken({ orgId, userId, ...meta });
    return { orgId, userId, token };
  } catch (err) {
    if (err instanceof DartAiNotConnectedError) {
      throw new PmAuthError('DARTAI_NOT_CONNECTED', 'Dart-AI is not connected for this user');
    }
    throw err;
  }
}






