import { NextRequest, NextResponse } from 'next/server';
import { TaskService } from '@/lib/services/project-management/task-service';
import { query } from '@/lib/database';
import { requirePmAuth } from '@/lib/project-management/pm-auth';
import { handlePmError } from '@/lib/project-management/pm-api';

export async function DELETE(request: NextRequest, { params }: { params: { id: string; dependencyId: string } }) {
  try {
    const { user, orgId, userId } = await requirePmAuth(request);

    const accessResult = await query(
      `
      SELECT d.dependency_id, t.project_id, p.visibility, p.owner_id
      FROM core.pm_task_dependency d
      JOIN core.pm_task t ON t.task_id = d.task_id
      JOIN core.pm_project p ON p.project_id = t.project_id
      WHERE d.dependency_id = $1 AND p.org_id = $2
      `,
      [params.dependencyId, orgId]
    );

    if (accessResult.rows.length === 0) {
      return NextResponse.json(
        { data: null, error: { code: 'NOT_FOUND', message: 'Dependency not found' } },
        { status: 404 }
      );
    }

    const project = accessResult.rows[0];
    const isAdmin = user.roles.some(role => role.slug === 'admin' || role.slug === 'super_admin' || role.level >= 90);
    if (project.visibility === 'private' && !isAdmin && project.owner_id !== userId) {
      const membership = await query(
        `SELECT 1 FROM core.pm_project_member WHERE project_id = $1 AND user_id = $2 AND is_active = true`,
        [project.project_id, userId]
      );
      if (membership.rows.length === 0) {
        return NextResponse.json(
          { data: null, error: { code: 'FORBIDDEN', message: 'Access denied' } },
          { status: 403 }
        );
      }
    }

    await TaskService.removeDependency(params.dependencyId);
    return NextResponse.json({ data: { removed: true }, error: null });
  } catch (error) {
    return handlePmError(error);
  }
}
