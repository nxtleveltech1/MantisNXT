import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { TaskService } from '@/lib/services/project-management/task-service';
import { requirePmAuth } from '@/lib/project-management/pm-auth';
import { handlePmError } from '@/lib/project-management/pm-api';

const DependencySchema = z.object({
  dependsOnTaskId: z.string().uuid(),
  dependencyType: z.enum(['blocks', 'relates']).optional(),
});

function isAdmin(user: { roles: Array<{ slug: string; level: number }> }) {
  return user.roles.some(role => role.slug === 'admin' || role.slug === 'super_admin' || role.level >= 90);
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, orgId, userId } = await requirePmAuth(request);
    const existing = await TaskService.list({ orgId, taskId: params.id, userId, isAdmin: isAdmin(user) });
    if (existing.length === 0) {
      return NextResponse.json(
        { data: null, error: { code: 'NOT_FOUND', message: 'Task not found' } },
        { status: 404 }
      );
    }
    const deps = await TaskService.listDependencies(orgId, params.id);
    return NextResponse.json({ data: deps, error: null });
  } catch (error) {
    return handlePmError(error);
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, orgId, userId } = await requirePmAuth(request);
    const existing = await TaskService.list({ orgId, taskId: params.id, userId, isAdmin: isAdmin(user) });
    if (existing.length === 0) {
      return NextResponse.json(
        { data: null, error: { code: 'NOT_FOUND', message: 'Task not found' } },
        { status: 404 }
      );
    }
    const body = await request.json();
    const payload = DependencySchema.parse(body);

    const dep = await TaskService.addDependency({
      taskId: params.id,
      dependsOnTaskId: payload.dependsOnTaskId,
      dependencyType: payload.dependencyType,
      createdBy: userId,
    });

    return NextResponse.json({ data: dep, error: null }, { status: 201 });
  } catch (error) {
    return handlePmError(error);
  }
}
