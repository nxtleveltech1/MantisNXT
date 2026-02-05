import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ProjectService } from '@/lib/services/project-management/project-service';
import { requirePmAuth, assertProjectAccess } from '@/lib/project-management/pm-auth';
import { handlePmError } from '@/lib/project-management/pm-api';

const ProjectUpdateSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional().nullable(),
  status: z.enum(['active', 'archived', 'completed']).optional(),
  visibility: z.enum(['org', 'private']).optional(),
  owner_id: z.string().uuid().optional().nullable(),
  start_date: z.string().optional().nullable(),
  target_date: z.string().optional().nullable(),
  completed_at: z.string().optional().nullable(),
  metadata: z.record(z.unknown()).optional(),
});

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, orgId } = await requirePmAuth(request);
    await assertProjectAccess({ orgId, user, projectId: params.id });

    const project = await ProjectService.get(orgId, params.id);
    return NextResponse.json({ data: project, error: null });
  } catch (error) {
    return handlePmError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, orgId } = await requirePmAuth(request);
    await assertProjectAccess({ orgId, user, projectId: params.id });

    const body = await request.json();
    const patch = ProjectUpdateSchema.parse(body);

    const project = await ProjectService.update(orgId, params.id, patch);
    return NextResponse.json({ data: project, error: null });
  } catch (error) {
    return handlePmError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, orgId } = await requirePmAuth(request);
    await assertProjectAccess({ orgId, user, projectId: params.id });

    const project = await ProjectService.archive(orgId, params.id);
    return NextResponse.json({ data: project, error: null });
  } catch (error) {
    return handlePmError(error);
  }
}
