import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { createErrorResponse } from '@/lib/utils/neon-error-handler';
import { DartAiClient } from '@/services/dartai/dartai-client';
import { requirePmDartAiToken } from '@/lib/project-management/dartai-auth';

const TaskIdSchema = z.string().regex(/^[a-zA-Z0-9]{12}$/);

const TaskMoveSchema = z.object({
  beforeTaskId: z.string().regex(/^[a-zA-Z0-9]{12}$/).nullable().optional(),
  afterTaskId: z.string().regex(/^[a-zA-Z0-9]{12}$/).nullable().optional(),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const taskId = TaskIdSchema.parse(id);
    const { token } = await requirePmDartAiToken(request);
    const client = new DartAiClient();

    const body = TaskMoveSchema.parse(await request.json());

    if (!body.beforeTaskId && !body.afterTaskId) {
      return NextResponse.json(
        { data: null, error: { code: 'VALIDATION_ERROR', message: 'Either beforeTaskId or afterTaskId must be provided' } },
        { status: 400 }
      );
    }

    const result = await client.moveTask({ token, id: taskId, body });

    if (!result.ok) {
      return NextResponse.json(
        { data: null, error: { code: 'DARTAI_ERROR', message: 'Failed to move task' } },
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










