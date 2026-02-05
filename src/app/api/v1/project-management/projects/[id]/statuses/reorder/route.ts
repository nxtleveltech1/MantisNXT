import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { StatusService } from '@/lib/services/project-management/status-service';
import { requirePmAuth, assertProjectAccess } from '@/lib/project-management/pm-auth';
import { handlePmError } from '@/lib/project-management/pm-api';

const ReorderSchema = z.object({
  orderedIds: z.array(z.string().uuid()).min(1),
});

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, orgId } = await requirePmAuth(request);
    await assertProjectAccess({ orgId, user, projectId: params.id });

    const body = await request.json();
    const payload = ReorderSchema.parse(body);

    await StatusService.reorder(orgId, params.id, payload.orderedIds);
    return NextResponse.json({ data: { reordered: true }, error: null });
  } catch (error) {
    return handlePmError(error);
  }
}
