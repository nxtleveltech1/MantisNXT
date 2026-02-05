import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ViewService } from '@/lib/services/project-management/view-service';
import { requirePmAuth } from '@/lib/project-management/pm-auth';
import { handlePmError } from '@/lib/project-management/pm-api';

const ViewQuerySchema = z.object({
  project_id: z.string().uuid().optional(),
});

const ViewCreateSchema = z.object({
  name: z.string().min(1),
  view_type: z.enum(['kanban', 'list', 'calendar', 'gantt', 'roadmap', 'workload']),
  project_id: z.string().uuid().optional().nullable(),
  config: z.record(z.unknown()).optional(),
  is_shared: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { orgId } = await requirePmAuth(request);
    const { searchParams } = new URL(request.url);
    const params = ViewQuerySchema.parse({ project_id: searchParams.get('project_id') || undefined });

    const views = await ViewService.list({
      orgId,
      projectId: params.project_id || null,
    });

    return NextResponse.json({ data: views, error: null });
  } catch (error) {
    return handlePmError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { orgId, userId } = await requirePmAuth(request);
    const body = await request.json();
    const payload = ViewCreateSchema.parse(body);

    const view = await ViewService.create({
      orgId,
      projectId: payload.project_id || null,
      name: payload.name,
      viewType: payload.view_type,
      config: payload.config,
      ownerId: userId,
      isShared: payload.is_shared,
    });

    return NextResponse.json({ data: view, error: null }, { status: 201 });
  } catch (error) {
    return handlePmError(error);
  }
}
