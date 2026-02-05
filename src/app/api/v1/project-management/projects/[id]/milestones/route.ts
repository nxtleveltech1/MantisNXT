import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { MilestoneService } from '@/lib/services/project-management/milestone-service';
import { requirePmAuth, assertProjectAccess } from '@/lib/project-management/pm-auth';
import { handlePmError } from '@/lib/project-management/pm-api';

const MilestoneCreateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  status: z.enum(['planned', 'achieved', 'missed']).optional(),
  completedAt: z.string().optional().nullable(),
});

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, orgId } = await requirePmAuth(request);
    await assertProjectAccess({ orgId, user, projectId: params.id });

    const milestones = await MilestoneService.listByProject(orgId, params.id);
    return NextResponse.json({ data: milestones, error: null });
  } catch (error) {
    return handlePmError(error);
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, orgId, userId } = await requirePmAuth(request);
    await assertProjectAccess({ orgId, user, projectId: params.id });

    const body = await request.json();
    const payload = MilestoneCreateSchema.parse(body);

    const milestone = await MilestoneService.create({
      orgId,
      projectId: params.id,
      name: payload.name,
      description: payload.description,
      dueDate: payload.dueDate,
      status: payload.status,
      completedAt: payload.completedAt,
      actorId: userId,
    });

    return NextResponse.json({ data: milestone, error: null }, { status: 201 });
  } catch (error) {
    return handlePmError(error);
  }
}
