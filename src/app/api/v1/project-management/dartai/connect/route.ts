import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requireAuth } from '@/lib/auth/auth-helper';
import { createErrorResponse } from '@/lib/utils/neon-error-handler';
import { DartAiClient } from '@/services/dartai/dartai-client';
import {
  disconnectDartAiUserToken,
  getDartAiTokenStatus,
  markDartAiTokenValidated,
  upsertDartAiUserToken,
} from '@/services/dartai/dartai-token-store';

const ConnectSchema = z.object({
  token: z.string().min(10),
});

function getRequestMeta(request: NextRequest) {
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

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    if (!user.orgId) {
      return NextResponse.json(
        { data: null, error: { code: 'ORG_REQUIRED', message: 'Organization context required' } },
        { status: 400 }
      );
    }

    // If Clerk user isn’t synced into auth.users_extended yet, we can’t store per-user tokens.
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id)) {
      return NextResponse.json(
        {
          data: { connected: false },
          error: { code: 'USER_NOT_SYNCED', message: 'User record not synced yet' },
        },
        { status: 409 }
      );
    }

    const status = await getDartAiTokenStatus({ orgId: user.orgId, userId: user.id });
    return NextResponse.json({ data: status, error: null });
  } catch (error: unknown) {
    return createErrorResponse(error, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    if (!user.orgId) {
      return NextResponse.json(
        { data: null, error: { code: 'ORG_REQUIRED', message: 'Organization context required' } },
        { status: 400 }
      );
    }

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id)) {
      return NextResponse.json(
        { data: null, error: { code: 'USER_NOT_SYNCED', message: 'User record not synced yet' } },
        { status: 409 }
      );
    }

    const body = ConnectSchema.parse(await request.json());
    const meta = getRequestMeta(request);

    await upsertDartAiUserToken({
      orgId: user.orgId,
      userId: user.id,
      token: body.token,
      ...meta,
    });

    // Validate token immediately by calling /config
    const client = new DartAiClient();
    const validation = await client.getConfig({ token: body.token });

    if (!validation.ok) {
      return NextResponse.json(
        {
          data: { connected: true, validated: false, status: validation.status, response: validation.body },
          error: { code: 'DARTAI_TOKEN_INVALID', message: 'Token validation failed' },
        },
        { status: 400 }
      );
    }

    await markDartAiTokenValidated({ orgId: user.orgId, userId: user.id, ...meta });

    return NextResponse.json({
      data: { connected: true, validated: true, config: validation.data },
      error: null,
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { data: null, error: { code: 'VALIDATION_ERROR', message: 'Invalid request body' } },
        { status: 400 }
      );
    }
    return createErrorResponse(error, 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    if (!user.orgId) {
      return NextResponse.json(
        { data: null, error: { code: 'ORG_REQUIRED', message: 'Organization context required' } },
        { status: 400 }
      );
    }

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id)) {
      return NextResponse.json(
        { data: null, error: { code: 'USER_NOT_SYNCED', message: 'User record not synced yet' } },
        { status: 409 }
      );
    }

    const meta = getRequestMeta(request);
    await disconnectDartAiUserToken({ orgId: user.orgId, userId: user.id, ...meta });

    return NextResponse.json({ data: { connected: false }, error: null });
  } catch (error: unknown) {
    return createErrorResponse(error, 500);
  }
}


