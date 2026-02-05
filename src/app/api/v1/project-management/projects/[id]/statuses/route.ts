import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { StatusService } from '@/lib/services/project-management/status-service';
import { requirePmAuth, assertProjectAccess } from '@/lib/project-management/pm-auth';
import { handlePmError } from '@/lib/project-management/pm-api';

const StatusCreateSchema = z.object({
  name: z.string().min(1),
  statusKey: z.string().min(1),
  statusType: z.enum(['todo', 'in_progress', 'done']),
  color: z.string().optional(),
  position: z.number().int().optional(),
  isDefault: z.boolean().optional(),
});

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, orgId } = await requirePmAuth(request);
    await assertProjectAccess({ orgId, user, projectId: params.id });

    const statuses = await StatusService.list(orgId, params.id);
    return NextResponse.json({ data: statuses, error: null });
  } catch (error) {
    return handlePmError(error);
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, orgId } = await requirePmAuth(request);
    await assertProjectAccess({ orgId, user, projectId: params.id });

    const body = await request.json();
    const payload = StatusCreateSchema.parse(body);

    const status = await StatusService.create({
      orgId,
      projectId: params.id,
      name: payload.name,
      statusKey: payload.statusKey,
      statusType: payload.statusType,
      color: payload.color,
      position: payload.position,
      isDefault: payload.isDefault,
    });

    return NextResponse.json({ data: status, error: null }, { status: 201 });
  } catch (error) {
    return handlePmError(error);
  }
}
