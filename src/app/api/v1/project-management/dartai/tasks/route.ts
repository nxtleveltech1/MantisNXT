import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { createErrorResponse } from '@/lib/utils/neon-error-handler';
import { DartAiClient } from '@/services/dartai/dartai-client';
import { requirePmDartAiToken } from '@/lib/project-management/dartai-auth';

const TaskCreateSchema = z.object({
  item: z.object({
    title: z.string().min(1),
    parentId: z.string().regex(/^[a-zA-Z0-9]{12}$/).nullable().optional(),
    dartboard: z.string().optional(),
    type: z.string().optional(),
    status: z.string().optional(),
    description: z.string().optional(),
    assignees: z.array(z.string()).nullable().optional(),
    assignee: z.string().nullable().optional(),
    tags: z.array(z.string()).optional(),
    priority: z.string().nullable().optional(),
    startAt: z.string().nullable().optional(),
    dueAt: z.string().nullable().optional(),
    size: z.union([z.string(), z.number()]).nullable().optional(),
    customProperties: z.record(z.unknown()).nullable().optional(),
    taskRelationships: z
      .object({
        subtaskIds: z.array(z.string()).optional(),
        blockerIds: z.array(z.string()).optional(),
        blockingIds: z.array(z.string()).optional(),
        duplicateIds: z.array(z.string()).optional(),
        relatedIds: z.array(z.string()).optional(),
      })
      .nullable()
      .optional(),
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

    const result = await client.listTasks({ token, query });

    if (!result.ok) {
      return NextResponse.json(
        { data: null, error: { code: 'DARTAI_ERROR', message: 'Failed to list tasks' } },
        { status: result.status }
      );
    }

    return NextResponse.json({ data: result.data, error: null });
  } catch (error: unknown) {
    return createErrorResponse(error, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { token } = await requirePmDartAiToken(request);
    const client = new DartAiClient();

    const body = TaskCreateSchema.parse(await request.json());
    const result = await client.createTask({ token, body });

    if (!result.ok) {
      return NextResponse.json(
        { data: null, error: { code: 'DARTAI_ERROR', message: 'Failed to create task' } },
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





