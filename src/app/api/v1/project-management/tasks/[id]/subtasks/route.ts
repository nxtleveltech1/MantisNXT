import { NextRequest, NextResponse } from 'next/server';
import { TaskService } from '@/lib/services/project-management/task-service';
import { requirePmAuth } from '@/lib/project-management/pm-auth';
import { handlePmError } from '@/lib/project-management/pm-api';

function isAdmin(user: { roles: Array<{ slug: string; level: number }> }) {
  return user.roles.some(role => role.slug === 'admin' || role.slug === 'super_admin' || role.level >= 90);
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, orgId, userId } = await requirePmAuth(request);
    const subtasks = await TaskService.list({
      orgId,
      parentTaskId: params.id,
      userId,
      isAdmin: isAdmin(user),
    });
    return NextResponse.json({ data: subtasks, error: null });
  } catch (error) {
    return handlePmError(error);
  }
}
