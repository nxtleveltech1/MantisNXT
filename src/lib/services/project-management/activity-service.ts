import { query } from '@/lib/database';

export type PmEntityType = 'project' | 'task' | 'sprint' | 'milestone' | 'comment' | 'portfolio';
export type PmActivityAction =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'status_changed'
  | 'assigned'
  | 'unassigned'
  | 'commented'
  | 'linked'
  | 'unlinked'
  | 'moved'
  | 'completed'
  | 'reopened';

export class ActivityService {
  static async log(params: {
    orgId: string;
    actorId?: string | null;
    entityType: PmEntityType;
    entityId: string;
    action: PmActivityAction;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await query(
      `
      INSERT INTO core.pm_activity (org_id, actor_id, entity_type, entity_id, action, metadata)
      VALUES ($1, $2, $3, $4, $5, $6::jsonb)
      `,
      [
        params.orgId,
        params.actorId || null,
        params.entityType,
        params.entityId,
        params.action,
        JSON.stringify(params.metadata || {}),
      ]
    );
  }

  static async list(params: {
    orgId: string;
    entityType?: PmEntityType;
    entityId?: string;
    limit?: number;
  }) {
    const conditions: string[] = ['org_id = $1'];
    const values: unknown[] = [params.orgId];
    let index = 2;

    if (params.entityType) {
      conditions.push(`entity_type = $${index}`);
      values.push(params.entityType);
      index++;
    }

    if (params.entityId) {
      conditions.push(`entity_id = $${index}`);
      values.push(params.entityId);
      index++;
    }

    const limit = Math.min(params.limit || 50, 200);

    const result = await query(
      `
      SELECT activity_id, actor_id, entity_type, entity_id, action, metadata, created_at
      FROM core.pm_activity
      WHERE ${conditions.join(' AND ')}
      ORDER BY created_at DESC
      LIMIT $${index}
      `,
      [...values, limit]
    );

    return result.rows;
  }
}
