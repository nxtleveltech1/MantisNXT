import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { TaskService } from '@/lib/services/project-management/task-service';
import { requirePmAuth } from '@/lib/project-management/pm-auth';
import { handlePmError } from '@/lib/project-management/pm-api';

const TaskUpdateSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional().nullable(),
  status_id: z.string().uuid().optional().nullable(),
  parent_task_id: z.string().uuid().optional().nullable(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  task_type: z.enum(['task', 'bug', 'feature']).optional(),
  estimate_points: z.number().int().optional().nullable(),
  start_date: z.string().optional().nullable(),
  due_date: z.string().optional().nullable(),
  sprint_id: z.string().uuid().optional().nullable(),
  milestone_id: z.string().uuid().optional().nullable(),
  primary_assignee_id: z.string().uuid().optional().nullable(),
  progress_percent: z.number().int().min(0).max(100).optional(),
  metadata: z.record(z.unknown()).optional(),
  assignee_ids: z.array(z.string().uuid()).optional(),
  label_ids: z.array(z.string().uuid()).optional(),
});

function isAdmin(user: { roles: Array<{ slug: string; level: number }> }) {
  return user.roles.some(role => role.slug === 'admin' || role.slug === 'super_admin' || role.level >= 90);
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, orgId, userId } = await requirePmAuth(request);

    const task = await TaskService.list({ orgId, taskId: params.id, userId, isAdmin: isAdmin(user) });
    const record = task[0] || null;

    if (!record) {
      return NextResponse.json(
        { data: null, error: { code: 'NOT_FOUND', message: 'Task not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: record, error: null });
  } catch (error) {
    return handlePmError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, orgId, userId } = await requirePmAuth(request);
    const body = await request.json();
    const patch = TaskUpdateSchema.parse(body);

    const existing = await TaskService.list({ orgId, taskId: params.id, userId, isAdmin: isAdmin(user) });
    if (existing.length === 0) {
      return NextResponse.json(
        { data: null, error: { code: 'NOT_FOUND', message: 'Task not found' } },
        { status: 404 }
      );
    }

    const task = await TaskService.update({
      orgId,
      taskId: params.id,
      patch: patch as Record<string, unknown>,
      actorId: userId,
    });

    return NextResponse.json({ data: task, error: null });
  } catch (error) {
    return handlePmError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, orgId, userId } = await requirePmAuth(request);

    const existing = await TaskService.list({ orgId, taskId: params.id, userId, isAdmin: isAdmin(user) });
    if (existing.length === 0) {
      return NextResponse.json(
        { data: null, error: { code: 'NOT_FOUND', message: 'Task not found' } },
        { status: 404 }
      );
    }

    const removed = await TaskService.remove(orgId, params.id, userId);
    return NextResponse.json({ data: removed, error: null });
  } catch (error) {
    return handlePmError(error);
  }
}
