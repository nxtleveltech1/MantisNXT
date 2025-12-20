import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { createErrorResponse } from '@/lib/utils/neon-error-handler';
import { DartAiClient } from '@/services/dartai/dartai-client';
import { requirePmDartAiToken } from '@/lib/project-management/dartai-auth';

const DocCreateSchema = z.object({
  item: z.object({
    title: z.string().min(1),
    text: z.string().optional(),
    folder: z.string().optional(),
    folderId: z.string().optional(),
  }),
});

export async function GET(request: NextRequest) {
  try {
    const { token } = await requirePmDartAiToken(request);
    const client = new DartAiClient();

    const searchParams = request.nextUrl.searchParams;
    const query: Record<string, string | undefined> = {};
    for (const [key, value] of searchParams.entries()) {
      query[key] = value || undefined;
    }
    if (!('limit' in query)) query.limit = '100';
    if (!('no_defaults' in query)) query.no_defaults = 'true';

    const result = await client.listDocs({ token, query });

    if (!result.ok) {
      console.error('[Dart-AI Docs] Failed to list docs:', {
        status: result.status,
        body: result.body,
      });
      return NextResponse.json(
        {
          data: null,
          error: {
            code: 'DARTAI_ERROR',
            message: `Failed to list docs: ${result.status}`,
            details: result.body,
          },
        },
        { status: result.status >= 400 && result.status < 500 ? result.status : 500 }
      );
    }

    // Normalize response - check for results array
    let docs: unknown[] = [];
    const data = result.data;
    
    if (Array.isArray(data)) {
      docs = data;
    } else if (data && typeof data === 'object') {
      if ('results' in data && Array.isArray((data as { results?: unknown }).results)) {
        docs = (data as { results: unknown[] }).results;
      } else if ('items' in data && Array.isArray(data.items)) {
        docs = data.items;
      } else if ('item' in data) {
        docs = Array.isArray(data.item) ? data.item : [data.item];
      } else if ('docs' in data && Array.isArray(data.docs)) {
        docs = data.docs;
      } else if ('data' in data && Array.isArray(data.data)) {
        docs = data.data;
      }
    }

    console.log('[Dart-AI Docs] Successfully fetched docs:', { count: docs.length });

    return NextResponse.json({ data: docs, error: null });
  } catch (error: unknown) {
    console.error('[Dart-AI Docs] Unexpected error:', error);
    return createErrorResponse(error, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { token } = await requirePmDartAiToken(request);
    const client = new DartAiClient();

    const body = DocCreateSchema.parse(await request.json());
    const result = await client.createDoc({ token, body });

    if (!result.ok) {
      return NextResponse.json(
        { data: null, error: { code: 'DARTAI_ERROR', message: 'Failed to create doc' } },
        { status: result.status }
      );
    }

    return NextResponse.json({ data: result.data, error: null }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { data: null, error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: error.errors } },
        { status: 400 }
      );
    }
    return createErrorResponse(error, 500);
  }
}



