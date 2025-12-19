import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { createErrorResponse } from '@/lib/utils/neon-error-handler';
import { DartAiClient } from '@/services/dartai/dartai-client';
import { requirePmDartAiToken } from '@/lib/project-management/dartai-auth';

/**
 * GET /api/v1/project-management/dartai/dartboards/[id]
 * Retrieves a specific dartboard (project) by ID
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { token } = await requirePmDartAiToken(request);
    const client = new DartAiClient();

    const result = await client.getDartboard({ token, id });

    if (!result.ok) {
      console.error('[Dart-AI Dartboard] Failed to get dartboard:', {
        id,
        status: result.status,
        body: result.body,
      });
      return NextResponse.json(
        {
          data: null,
          error: {
            code: 'DARTAI_ERROR',
            message: `Failed to get dartboard: ${result.status}`,
            details: result.body,
          },
        },
        { status: result.status >= 400 && result.status < 500 ? result.status : 500 }
      );
    }

    return NextResponse.json({ data: result.data, error: null });
  } catch (error: unknown) {
    console.error('[Dart-AI Dartboard] Unexpected error:', error);
    return createErrorResponse(error, 500);
  }
}

