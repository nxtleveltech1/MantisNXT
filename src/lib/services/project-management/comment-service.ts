import { query } from '@/lib/database';
import { ActivityService } from './activity-service';
import { WebhookService } from './webhook-service';

export class CommentService {
  static async list(params: { orgId: string; entityType: string; entityId: string }) {
    const result = await query(
      `
      SELECT comment_id, org_id, entity_type, entity_id, author_id, body, parent_comment_id,
             created_at, updated_at, is_edited
      FROM core.pm_comment
      WHERE org_id = $1 AND entity_type = $2 AND entity_id = $3
      ORDER BY created_at ASC
      `,
      [params.orgId, params.entityType, params.entityId]
    );

    return result.rows;
  }

  static async create(params: {
    orgId: string;
    entityType: string;
    entityId: string;
    authorId: string | null;
    body: string;
    parentCommentId?: string | null;
  }) {
    const result = await query(
      `
      INSERT INTO core.pm_comment (
        org_id, entity_type, entity_id, author_id, body, parent_comment_id
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING comment_id, org_id, entity_type, entity_id, author_id, body, parent_comment_id, created_at, updated_at
      `,
      [
        params.orgId,
        params.entityType,
        params.entityId,
        params.authorId || null,
        params.body,
        params.parentCommentId || null,
      ]
    );

    const comment = result.rows[0];

    await ActivityService.log({
      orgId: params.orgId,
      actorId: params.authorId || null,
      entityType: params.entityType as any,
      entityId: params.entityId,
      action: 'commented',
    });

    await WebhookService.deliver({
      orgId: params.orgId,
      eventType: 'comment.created',
      payload: comment,
    });

    return comment;
  }

  static async update(params: {
    orgId: string;
    commentId: string;
    body: string;
    editorId?: string | null;
  }) {
    const result = await query(
      `
      UPDATE core.pm_comment
      SET body = $3, is_edited = true, updated_at = now()
      WHERE org_id = $1 AND comment_id = $2
      RETURNING comment_id, org_id, entity_type, entity_id, author_id, body, parent_comment_id, created_at, updated_at, is_edited
      `,
      [params.orgId, params.commentId, params.body]
    );

    const comment = result.rows[0];

    if (comment) {
      await ActivityService.log({
        orgId: params.orgId,
        actorId: params.editorId || null,
        entityType: comment.entity_type,
        entityId: comment.entity_id,
        action: 'updated',
        metadata: { comment_id: comment.comment_id },
      });

      await WebhookService.deliver({
        orgId: params.orgId,
        eventType: 'comment.updated',
        payload: comment,
      });
    }

    return comment || null;
  }

  static async remove(params: { orgId: string; commentId: string; actorId?: string | null }) {
    const result = await query(
      `
      DELETE FROM core.pm_comment
      WHERE org_id = $1 AND comment_id = $2
      RETURNING comment_id, org_id, entity_type, entity_id
      `,
      [params.orgId, params.commentId]
    );

    const comment = result.rows[0];

    if (comment) {
      await ActivityService.log({
        orgId: params.orgId,
        actorId: params.actorId || null,
        entityType: comment.entity_type,
        entityId: comment.entity_id,
        action: 'deleted',
        metadata: { comment_id: comment.comment_id },
      });

      await WebhookService.deliver({
        orgId: params.orgId,
        eventType: 'comment.deleted',
        payload: comment,
      });
    }

    return comment || null;
  }
}
