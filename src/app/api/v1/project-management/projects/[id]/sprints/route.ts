import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { SprintService } from '@/lib/services/project-management/sprint-service';
import { requirePmAuth, assertProjectAccess } from '@/lib/project-management/pm-auth';
import { handlePmError } from '@/lib/project-management/pm-api';

const SprintCreateSchema = z.object({
  name: z.string().min(1),
  goal: z.string().optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  status: z.enum(['planned', 'active', 'closed']).optional(),
});

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, orgId } = await requirePmAuth(request);
    await assertProjectAccess({ orgId, user, projectId: params.id });

    const sprints = await SprintService.list(orgId, params.id);
    return NextResponse.json({ data: sprints, error: null });
  } catch (error) {
    return handlePmError(error);
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, orgId, userId } = await requirePmAuth(request);
    await assertProjectAccess({ orgId, user, projectId: params.id });

    const body = await request.json();
    const payload = SprintCreateSchema.parse(body);

    const sprint = await SprintService.create({
      orgId,
      projectId: params.id,
      name: payload.name,
      goal: payload.goal,
      startDate: payload.startDate,
      endDate: payload.endDate,
      status: payload.status,
      actorId: userId,
    });

    return NextResponse.json({ data: sprint, error: null }, { status: 201 });
  } catch (error) {
    return handlePmError(error);
  }
}
