import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { CommentService } from '@/lib/services/project-management/comment-service';
import { requirePmAuth, assertProjectAccess } from '@/lib/project-management/pm-auth';
import { handlePmError } from '@/lib/project-management/pm-api';
import { query } from '@/lib/database';

const CommentUpdateSchema = z.object({
  body: z.string().min(1),
});

function isAdmin(user: { roles: Array<{ slug: string; level: number }> }) {
  return user.roles.some(role => role.slug === 'admin' || role.slug === 'super_admin' || role.level >= 90);
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, orgId, userId } = await requirePmAuth(request);
    const body = await request.json();
    const payload = CommentUpdateSchema.parse(body);

    const commentResult = await query(
      `
      SELECT c.comment_id, c.entity_type, c.entity_id, c.author_id, p.project_id
      FROM core.pm_comment c
      LEFT JOIN core.pm_task t ON c.entity_type = 'task' AND t.task_id = c.entity_id
      LEFT JOIN core.pm_sprint s ON c.entity_type = 'sprint' AND s.sprint_id = c.entity_id
      LEFT JOIN core.pm_milestone m ON c.entity_type = 'milestone' AND m.milestone_id = c.entity_id
      LEFT JOIN core.pm_project p ON (
        (c.entity_type = 'project' AND p.project_id = c.entity_id)
        OR (c.entity_type = 'task' AND p.project_id = t.project_id)
        OR (c.entity_type = 'sprint' AND p.project_id = s.project_id)
        OR (c.entity_type = 'milestone' AND p.project_id = m.project_id)
      )
      WHERE c.comment_id = $1 AND c.org_id = $2
      `,
      [params.id, orgId]
    );

    if (commentResult.rows.length === 0) {
      return NextResponse.json(
        { data: null, error: { code: 'NOT_FOUND', message: 'Comment not found' } },
        { status: 404 }
      );
    }

    const comment = commentResult.rows[0];
    await assertProjectAccess({ orgId, user, projectId: comment.project_id });

    if (!isAdmin(user) && comment.author_id !== userId) {
      return NextResponse.json(
        { data: null, error: { code: 'FORBIDDEN', message: 'Only the author can edit this comment' } },
        { status: 403 }
      );
    }

    const updated = await CommentService.update({
      orgId,
      commentId: params.id,
      body: payload.body,
      editorId: userId,
    });

    return NextResponse.json({ data: updated, error: null });
  } catch (error) {
    return handlePmError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, orgId, userId } = await requirePmAuth(request);

    const commentResult = await query(
      `
      SELECT c.comment_id, c.entity_type, c.entity_id, c.author_id, p.project_id
      FROM core.pm_comment c
      LEFT JOIN core.pm_task t ON c.entity_type = 'task' AND t.task_id = c.entity_id
      LEFT JOIN core.pm_sprint s ON c.entity_type = 'sprint' AND s.sprint_id = c.entity_id
      LEFT JOIN core.pm_milestone m ON c.entity_type = 'milestone' AND m.milestone_id = c.entity_id
      LEFT JOIN core.pm_project p ON (
        (c.entity_type = 'project' AND p.project_id = c.entity_id)
        OR (c.entity_type = 'task' AND p.project_id = t.project_id)
        OR (c.entity_type = 'sprint' AND p.project_id = s.project_id)
        OR (c.entity_type = 'milestone' AND p.project_id = m.project_id)
      )
      WHERE c.comment_id = $1 AND c.org_id = $2
      `,
      [params.id, orgId]
    );

    if (commentResult.rows.length === 0) {
      return NextResponse.json(
        { data: null, error: { code: 'NOT_FOUND', message: 'Comment not found' } },
        { status: 404 }
      );
    }

    const comment = commentResult.rows[0];
    await assertProjectAccess({ orgId, user, projectId: comment.project_id });

    if (!isAdmin(user) && comment.author_id !== userId) {
      return NextResponse.json(
        { data: null, error: { code: 'FORBIDDEN', message: 'Only the author can delete this comment' } },
        { status: 403 }
      );
    }

    const removed = await CommentService.remove({ orgId, commentId: params.id, actorId: userId });
    return NextResponse.json({ data: removed, error: null });
  } catch (error) {
    return handlePmError(error);
  }
}
