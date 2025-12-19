import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { createErrorResponse } from '@/lib/utils/neon-error-handler';
import { DartAiClient } from '@/services/dartai/dartai-client';
import { requirePmDartAiToken } from '@/lib/project-management/dartai-auth';

const TaskIdSchema = z.string().regex(/^[a-zA-Z0-9]{12}$/);

const TaskUpdateSchema = z.object({
  item: z.object({
    id: z.string().regex(/^[a-zA-Z0-9]{12}$/),
    title: z.string().optional(),
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

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const taskId = TaskIdSchema.parse(id);
    const { token } = await requirePmDartAiToken(request);
    const client = new DartAiClient();

    const result = await client.getTask({ token, id: taskId });

    if (!result.ok) {
      return NextResponse.json(
        { data: null, error: { code: 'DARTAI_ERROR', message: 'Failed to get task' } },
        { status: result.status }
      );
    }

    return NextResponse.json({ data: result.data, error: null });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { data: null, error: { code: 'VALIDATION_ERROR', message: 'Invalid task ID' } },
        { status: 400 }
      );
    }
    return createErrorResponse(error, 500);
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const taskId = TaskIdSchema.parse(id);
    const { token } = await requirePmDartAiToken(request);
    const client = new DartAiClient();

    const body = TaskUpdateSchema.parse(await request.json());
    if (body.item.id !== taskId) {
      return NextResponse.json(
        { data: null, error: { code: 'VALIDATION_ERROR', message: 'Task ID mismatch' } },
        { status: 400 }
      );
    }

    const result = await client.updateTask({ token, id: taskId, body });

    if (!result.ok) {
      return NextResponse.json(
        { data: null, error: { code: 'DARTAI_ERROR', message: 'Failed to update task' } },
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

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const taskId = TaskIdSchema.parse(id);
    const { token } = await requirePmDartAiToken(request);
    const client = new DartAiClient();

    const result = await client.deleteTask({ token, id: taskId });

    if (!result.ok) {
      return NextResponse.json(
        { data: null, error: { code: 'DARTAI_ERROR', message: 'Failed to delete task' } },
        { status: result.status }
      );
    }

    return NextResponse.json({ data: result.data, error: null });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { data: null, error: { code: 'VALIDATION_ERROR', message: 'Invalid task ID' } },
        { status: 400 }
      );
    }
    return createErrorResponse(error, 500);
  }
}






