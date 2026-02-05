import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { LabelService } from '@/lib/services/project-management/label-service';
import { requirePmAuth, assertProjectAccess } from '@/lib/project-management/pm-auth';
import { handlePmError } from '@/lib/project-management/pm-api';

const LabelCreateSchema = z.object({
  name: z.string().min(1),
  color: z.string().optional(),
  description: z.string().optional().nullable(),
});

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, orgId } = await requirePmAuth(request);
    await assertProjectAccess({ orgId, user, projectId: params.id });

    const labels = await LabelService.list(orgId, params.id);
    return NextResponse.json({ data: labels, error: null });
  } catch (error) {
    return handlePmError(error);
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, orgId } = await requirePmAuth(request);
    await assertProjectAccess({ orgId, user, projectId: params.id });

    const body = await request.json();
    const payload = LabelCreateSchema.parse(body);

    const label = await LabelService.create({
      orgId,
      projectId: params.id,
      name: payload.name,
      color: payload.color,
      description: payload.description,
    });

    return NextResponse.json({ data: label, error: null }, { status: 201 });
  } catch (error) {
    return handlePmError(error);
  }
}
