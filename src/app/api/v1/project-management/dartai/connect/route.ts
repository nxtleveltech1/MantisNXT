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

    // Core property validation
    if (!user.orgId) {
      return NextResponse.json(
        { data: null, error: { code: 'ORG_REQUIRED', message: 'Organization context required' } },
        { status: 400 }
      );
    }

    // UUID format validation for database safety
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(user.orgId)) {
      return NextResponse.json(
        { data: null, error: { code: 'INVALID_ORG_ID', message: 'Organization ID must be a valid UUID' } },
        { status: 400 }
      );
    }

    if (!uuidRegex.test(user.id)) {
      return NextResponse.json(
        {
          data: { connected: false },
          error: { code: 'USER_NOT_SYNCED', message: 'User record not synced yet (UUID required)' },
        },
        { status: 409 }
      );
    }

    try {
      const status = await getDartAiTokenStatus({ orgId: user.orgId, userId: user.id });
      return NextResponse.json({ data: status, error: null });
    } catch (dbError: unknown) {
      const errorMessage = dbError instanceof Error ? dbError.message : String(dbError);

      // Handle missing encryption key
      if (errorMessage.includes('DARTAI_TOKEN_ENCRYPTION_KEY')) {
        return NextResponse.json(
          {
            data: null,
            error: {
              code: 'CONFIG_MISSING',
              message: 'Server configuration incomplete. DARTAI_TOKEN_ENCRYPTION_KEY env var is required.',
            },
          },
          { status: 503 }
        );
      }

      // Handle database errors (e.g., table doesn't exist yet)
      if (errorMessage.includes('does not exist')) {
        return NextResponse.json(
          {
            data: { connected: false },
            error: {
              code: 'MIGRATION_REQUIRED',
              message: 'Database migration required. Please run migrations to set up Dart-AI integration.',
            },
          },
          { status: 503 }
        );
      }
      throw dbError;
    }
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { data: null, error: { code: 'AUTH_REQUIRED', message: 'Authentication required' } },
        { status: 401 }
      );
    }
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

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(user.orgId)) {
      return NextResponse.json(
        { data: null, error: { code: 'INVALID_ORG_ID', message: 'Organization ID must be a valid UUID' } },
        { status: 400 }
      );
    }

    if (!uuidRegex.test(user.id)) {
      return NextResponse.json(
        { data: null, error: { code: 'USER_NOT_SYNCED', message: 'User record not synced yet (UUID required)' } },
        { status: 409 }
      );
    }

    const body = ConnectSchema.parse(await request.json());
    const meta = getRequestMeta(request);

    try {
      await upsertDartAiUserToken({
        orgId: user.orgId,
        userId: user.id,
        token: body.token,
        ...meta,
      });
    } catch (dbError: unknown) {
      const errorMessage = dbError instanceof Error ? dbError.message : String(dbError);

      // Handle missing encryption key
      if (errorMessage.includes('DARTAI_TOKEN_ENCRYPTION_KEY')) {
        return NextResponse.json(
          {
            data: null,
            error: {
              code: 'CONFIG_MISSING',
              message: 'Server configuration incomplete. DARTAI_TOKEN_ENCRYPTION_KEY env var is required.',
            },
          },
          { status: 503 }
        );
      }
      // Handle database errors (e.g., table doesn't exist yet)
      if (errorMessage.includes('does not exist')) {
        return NextResponse.json(
          {
            data: null,
            error: {
              code: 'MIGRATION_REQUIRED',
              message: 'Database migration required. Please run migrations to set up Dart-AI integration.',
            },
          },
          { status: 503 }
        );
      }
      throw dbError;
    }

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

    try {
      await markDartAiTokenValidated({ orgId: user.orgId, userId: user.id, ...meta });
    } catch (dbError: unknown) {
      // Log but don't fail if validation marking fails
      console.error('Failed to mark token as validated:', dbError);
    }

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
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { data: null, error: { code: 'AUTH_REQUIRED', message: 'Authentication required' } },
        { status: 401 }
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

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(user.orgId)) {
      return NextResponse.json(
        { data: null, error: { code: 'INVALID_ORG_ID', message: 'Organization ID must be a valid UUID' } },
        { status: 400 }
      );
    }

    if (!uuidRegex.test(user.id)) {
      return NextResponse.json(
        { data: null, error: { code: 'USER_NOT_SYNCED', message: 'User record not synced yet (UUID required)' } },
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
