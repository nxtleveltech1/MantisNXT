import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ProjectService } from '@/lib/services/project-management/project-service';
import { requirePmAuth, assertProjectAccess } from '@/lib/project-management/pm-auth';
import { handlePmError } from '@/lib/project-management/pm-api';

const AddMemberSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['owner', 'admin', 'member', 'viewer']),
});

function isAdmin(user: { roles: Array<{ slug: string; level: number }> }) {
  return user.roles.some(role => role.slug === 'admin' || role.slug === 'super_admin' || role.level >= 90);
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, orgId } = await requirePmAuth(request);
    await assertProjectAccess({ orgId, user, projectId: params.id });

    const members = await ProjectService.listMembers(orgId, params.id);
    return NextResponse.json({ data: members, error: null });
  } catch (error) {
    return handlePmError(error);
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, orgId, userId } = await requirePmAuth(request);
    const project = await assertProjectAccess({ orgId, user, projectId: params.id });

    if (!isAdmin(user) && project.ownerId !== userId) {
      return NextResponse.json(
        { data: null, error: { code: 'FORBIDDEN', message: 'Only project owners or admins can add members' } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const payload = AddMemberSchema.parse(body);

    const member = await ProjectService.addMember({
      projectId: params.id,
      userId: payload.userId,
      role: payload.role,
      addedBy: userId,
    });

    return NextResponse.json({ data: member, error: null }, { status: 201 });
  } catch (error) {
    return handlePmError(error);
  }
}
