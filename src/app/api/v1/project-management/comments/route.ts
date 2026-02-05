import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { CommentService } from '@/lib/services/project-management/comment-service';
import { requirePmAuth, assertProjectAccess } from '@/lib/project-management/pm-auth';
import { handlePmError } from '@/lib/project-management/pm-api';
import { query } from '@/lib/database';

const CommentCreateSchema = z.object({
  entity_type: z.enum(['project', 'task', 'sprint', 'milestone']),
  entity_id: z.string().uuid(),
  body: z.string().min(1),
  parent_comment_id: z.string().uuid().optional().nullable(),
});

const CommentQuerySchema = z.object({
  entity_type: z.enum(['project', 'task', 'sprint', 'milestone']),
  entity_id: z.string().uuid(),
});

async function getProjectId(orgId: string, entityType: string, entityId: string) {
  switch (entityType) {
    case 'project':
      return entityId;
    case 'task': {
      const result = await query<{ project_id: string }>(
        'SELECT project_id FROM core.pm_task WHERE org_id = $1 AND task_id = $2',
        [orgId, entityId]
      );
      return result.rows[0]?.project_id || null;
    }
    case 'sprint': {
      const result = await query<{ project_id: string }>(
        'SELECT project_id FROM core.pm_sprint WHERE org_id = $1 AND sprint_id = $2',
        [orgId, entityId]
      );
      return result.rows[0]?.project_id || null;
    }
    case 'milestone': {
      const result = await query<{ project_id: string }>(
        'SELECT project_id FROM core.pm_milestone WHERE org_id = $1 AND milestone_id = $2',
        [orgId, entityId]
      );
      return result.rows[0]?.project_id || null;
    }
    default:
      return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { user, orgId } = await requirePmAuth(request);
    const { searchParams } = new URL(request.url);
    const params = CommentQuerySchema.parse({
      entity_type: searchParams.get('entity_type') || undefined,
      entity_id: searchParams.get('entity_id') || undefined,
    });

    const projectId = await getProjectId(orgId, params.entity_type, params.entity_id);
    if (!projectId) {
      return NextResponse.json(
        { data: null, error: { code: 'NOT_FOUND', message: 'Entity not found' } },
        { status: 404 }
      );
    }

    await assertProjectAccess({ orgId, user, projectId });

    const comments = await CommentService.list({
      orgId,
      entityType: params.entity_type,
      entityId: params.entity_id,
    });

    return NextResponse.json({ data: comments, error: null });
  } catch (error) {
    return handlePmError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, orgId, userId } = await requirePmAuth(request);
    const body = await request.json();
    const payload = CommentCreateSchema.parse(body);

    const projectId = await getProjectId(orgId, payload.entity_type, payload.entity_id);
    if (!projectId) {
      return NextResponse.json(
        { data: null, error: { code: 'NOT_FOUND', message: 'Entity not found' } },
        { status: 404 }
      );
    }

    await assertProjectAccess({ orgId, user, projectId });

    const comment = await CommentService.create({
      orgId,
      entityType: payload.entity_type,
      entityId: payload.entity_id,
      authorId: userId,
      body: payload.body,
      parentCommentId: payload.parent_comment_id,
    });

    return NextResponse.json({ data: comment, error: null }, { status: 201 });
  } catch (error) {
    return handlePmError(error);
  }
}
