import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { createErrorResponse } from '@/lib/utils/neon-error-handler';
import { DartAiClient } from '@/services/dartai/dartai-client';
import { requirePmDartAiToken } from '@/lib/project-management/dartai-auth';

/**
 * GET /api/v1/project-management/dartai/dartboards
 * Lists all dartboards (projects) by extracting unique dartboard titles from tasks
 */
export async function GET(request: NextRequest) {
  try {
    const { token } = await requirePmDartAiToken(request);
    const client = new DartAiClient();

    const searchParams = request.nextUrl.searchParams;
    const query: Record<string, string | undefined> = {};
    for (const [key, value] of searchParams.entries()) {
      query[key] = value || undefined;
    }

    const result = await client.listDartboards({ token, query });

    if (!result.ok) {
      console.error('[Dart-AI Dartboards] Failed to list dartboards:', {
        status: result.status,
        body: result.body,
      });
      return NextResponse.json(
        {
          data: null,
          error: {
            code: 'DARTAI_ERROR',
            message: `Failed to list dartboards: ${result.status}`,
            details: result.body,
          },
        },
        { status: result.status >= 400 && result.status < 500 ? result.status : 500 }
      );
    }

    console.log('[Dart-AI Dartboards] Successfully fetched dartboards:', {
      count: Array.isArray(result.data) ? result.data.length : 0,
    });

    return NextResponse.json({ data: result.data, error: null });
  } catch (error: unknown) {
    console.error('[Dart-AI Dartboards] Unexpected error:', error);
    return createErrorResponse(error, 500);
  }
}


