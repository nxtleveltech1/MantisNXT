import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { TaskService } from '@/lib/services/project-management/task-service';
import { requirePmAuth } from '@/lib/project-management/pm-auth';
import { handlePmError } from '@/lib/project-management/pm-api';

const MoveSchema = z.object({
  statusId: z.string().uuid().optional(),
  beforeTaskId: z.string().uuid().optional().nullable(),
  afterTaskId: z.string().uuid().optional().nullable(),
});

function isAdmin(user: { roles: Array<{ slug: string; level: number }> }) {
  return user.roles.some(role => role.slug === 'admin' || role.slug === 'super_admin' || role.level >= 90);
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, orgId, userId } = await requirePmAuth(request);
    const body = await request.json();
    const payload = MoveSchema.parse(body);

    const existing = await TaskService.list({ orgId, taskId: params.id, userId, isAdmin: isAdmin(user) });
    if (existing.length === 0) {
      return NextResponse.json(
        { data: null, error: { code: 'NOT_FOUND', message: 'Task not found' } },
        { status: 404 }
      );
    }

    const task = await TaskService.move({
      orgId,
      taskId: params.id,
      statusId: payload.statusId,
      beforeTaskId: payload.beforeTaskId ?? null,
      afterTaskId: payload.afterTaskId ?? null,
    });

    return NextResponse.json({ data: task, error: null });
  } catch (error) {
    return handlePmError(error);
  }
}
