import { NextRequest, NextResponse } from 'next/server';
import { ProjectService } from '@/lib/services/project-management/project-service';
import { requirePmAuth, assertProjectAccess } from '@/lib/project-management/pm-auth';
import { handlePmError } from '@/lib/project-management/pm-api';

function isAdmin(user: { roles: Array<{ slug: string; level: number }> }) {
  return user.roles.some(role => role.slug === 'admin' || role.slug === 'super_admin' || role.level >= 90);
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string; userId: string } }) {
  try {
    const { user, orgId, userId } = await requirePmAuth(request);
    const project = await assertProjectAccess({ orgId, user, projectId: params.id });

    if (!isAdmin(user) && project.ownerId !== userId) {
      return NextResponse.json(
        { data: null, error: { code: 'FORBIDDEN', message: 'Only project owners or admins can remove members' } },
        { status: 403 }
      );
    }

    await ProjectService.removeMember(params.id, params.userId);
    return NextResponse.json({ data: { removed: true }, error: null });
  } catch (error) {
    return handlePmError(error);
  }
}
