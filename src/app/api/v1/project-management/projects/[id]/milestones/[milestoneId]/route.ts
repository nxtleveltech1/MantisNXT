import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { MilestoneService } from '@/lib/services/project-management/milestone-service';
import { requirePmAuth, assertProjectAccess } from '@/lib/project-management/pm-auth';
import { handlePmError } from '@/lib/project-management/pm-api';

const MilestoneUpdateSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  status: z.enum(['planned', 'achieved', 'missed']).optional(),
  completedAt: z.string().optional().nullable(),
});

export async function PATCH(request: NextRequest, { params }: { params: { id: string; milestoneId: string } }) {
  try {
    const { user, orgId, userId } = await requirePmAuth(request);
    await assertProjectAccess({ orgId, user, projectId: params.id });

    const body = await request.json();
    const payload = MilestoneUpdateSchema.parse(body);

    const milestone = await MilestoneService.update(orgId, params.milestoneId, { ...payload, actorId: userId });
    return NextResponse.json({ data: milestone, error: null });
  } catch (error) {
    return handlePmError(error);
  }
}
