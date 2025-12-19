import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { createErrorResponse } from '@/lib/utils/neon-error-handler';
import { DartAiClient } from '@/services/dartai/dartai-client';
import { requirePmDartAiToken } from '@/lib/project-management/dartai-auth';

const DocUpdateSchema = z.object({
  item: z.object({
    title: z.string().optional(),
    text: z.string().optional(),
    folder: z.string().optional(),
    folderId: z.string().optional(),
  }),
});

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { token } = await requirePmDartAiToken(request);
    const client = new DartAiClient();

    const result = await client.getDoc({ token, id: params.id });

    if (!result.ok) {
      return NextResponse.json(
        { data: null, error: { code: 'DARTAI_ERROR', message: 'Failed to get doc' } },
        { status: result.status }
      );
    }

    return NextResponse.json({ data: result.data, error: null });
  } catch (error: unknown) {
    return createErrorResponse(error, 500);
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { token } = await requirePmDartAiToken(request);
    const client = new DartAiClient();

    const body = DocUpdateSchema.parse(await request.json());
    const result = await client.updateDoc({ token, id: params.id, body });

    if (!result.ok) {
      return NextResponse.json(
        { data: null, error: { code: 'DARTAI_ERROR', message: 'Failed to update doc' } },
        { status: result.status }
      );
    }

    return NextResponse.json({ data: result.data, error: null });
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

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { token } = await requirePmDartAiToken(request);
    const client = new DartAiClient();

    const result = await client.deleteDoc({ token, id: params.id });

    if (!result.ok) {
      return NextResponse.json(
        { data: null, error: { code: 'DARTAI_ERROR', message: 'Failed to delete doc' } },
        { status: result.status }
      );
    }

    return NextResponse.json({ data: result.data, error: null });
  } catch (error: unknown) {
    return createErrorResponse(error, 500);
  }
}

