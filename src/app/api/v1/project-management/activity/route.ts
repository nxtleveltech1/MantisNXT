import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ActivityService } from '@/lib/services/project-management/activity-service';
import { requirePmAuth } from '@/lib/project-management/pm-auth';
import { handlePmError } from '@/lib/project-management/pm-api';

const ActivityQuerySchema = z.object({
  entity_type: z.enum(['project', 'task', 'sprint', 'milestone', 'comment', 'portfolio']).optional(),
  entity_id: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { orgId } = await requirePmAuth(request);
    const { searchParams } = new URL(request.url);

    const params = ActivityQuerySchema.parse({
      entity_type: searchParams.get('entity_type') || undefined,
      entity_id: searchParams.get('entity_id') || undefined,
      limit: searchParams.get('limit') || undefined,
    });

    const activities = await ActivityService.list({
      orgId,
      entityType: params.entity_type,
      entityId: params.entity_id,
      limit: params.limit,
    });

    return NextResponse.json({ data: activities, error: null });
  } catch (error) {
    return handlePmError(error);
  }
}
