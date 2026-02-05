import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { SprintService } from '@/lib/services/project-management/sprint-service';
import { requirePmAuth, assertProjectAccess } from '@/lib/project-management/pm-auth';
import { handlePmError } from '@/lib/project-management/pm-api';

const SprintUpdateSchema = z.object({
  name: z.string().optional(),
  goal: z.string().optional().nullable(),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  status: z.enum(['planned', 'active', 'closed']).optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: { id: string; sprintId: string } }) {
  try {
    const { user, orgId } = await requirePmAuth(request);
    await assertProjectAccess({ orgId, user, projectId: params.id });

    const body = await request.json();
    const patch = SprintUpdateSchema.parse(body);

    const sprint = await SprintService.update(orgId, params.sprintId, patch);
    return NextResponse.json({ data: sprint, error: null });
  } catch (error) {
    return handlePmError(error);
  }
}
