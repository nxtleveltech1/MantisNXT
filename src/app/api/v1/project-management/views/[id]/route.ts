import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ViewService } from '@/lib/services/project-management/view-service';
import { requirePmAuth } from '@/lib/project-management/pm-auth';
import { handlePmError } from '@/lib/project-management/pm-api';

const ViewUpdateSchema = z.object({
  name: z.string().optional(),
  view_type: z.enum(['kanban', 'list', 'calendar', 'gantt', 'roadmap', 'workload']).optional(),
  config: z.record(z.unknown()).optional(),
  is_shared: z.boolean().optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { orgId } = await requirePmAuth(request);
    const body = await request.json();
    const payload = ViewUpdateSchema.parse(body);

    const view = await ViewService.update({
      orgId,
      viewId: params.id,
      patch: payload,
    });

    return NextResponse.json({ data: view, error: null });
  } catch (error) {
    return handlePmError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { orgId } = await requirePmAuth(request);
    await ViewService.remove(orgId, params.id);
    return NextResponse.json({ data: { removed: true }, error: null });
  } catch (error) {
    return handlePmError(error);
  }
}
