import { query } from '@/lib/database';
import { emitPmActivity } from './activity-service';
import { notifyPmEvent } from './notification-service';
import { emitWebhookEvent } from './webhook-service';

export type MilestoneInput = {
  orgId: string;
  projectId: string;
  name: string;
  description?: string | null;
  dueDate?: string | null;
  status?: 'planned' | 'achieved' | 'missed' | null;
  completedAt?: string | null;
  actorId: string;
};

export type MilestoneUpdate = Partial<Omit<MilestoneInput, 'orgId' | 'projectId' | 'actorId' | 'name'>> & {
  name?: string;
  actorId: string;
};

export const MilestoneService = {
  async listByProject(orgId: string, projectId: string) {
    const { rows } = await query(
      `
      SELECT milestone_id, project_id, org_id, name, description, due_date, status, completed_at, created_at, updated_at
      FROM core.pm_milestone
      WHERE org_id = $1 AND project_id = $2
      ORDER BY due_date NULLS LAST, created_at ASC
      `,
      [orgId, projectId]
    );
    return rows;
  },

  async create(input: MilestoneInput) {
    const { rows } = await query(
      `
      INSERT INTO core.pm_milestone (
        milestone_id,
        org_id,
        project_id,
        name,
        description,
        due_date,
        status,
        completed_at,
        created_at,
        updated_at
      )
      VALUES (
        gen_random_uuid(),
        $1,
        $2,
        $3,
        $4,
        $5,
        COALESCE($6, 'planned'),
        $7,
        NOW(),
        NOW()
      )
      RETURNING milestone_id, project_id, org_id, name, description, due_date, status, completed_at, created_at, updated_at
      `,
      [
        input.orgId,
        input.projectId,
        input.name,
        input.description ?? null,
        input.dueDate ?? null,
        input.status ?? null,
        input.completedAt ?? null,
      ]
    );

    const milestone = rows[0];

    await emitPmActivity({
      orgId: input.orgId,
      actorId: input.actorId,
      entityType: 'milestone',
      entityId: milestone.milestone_id,
      action: 'created',
      metadata: {
        projectId: input.projectId,
        name: input.name,
      },
    });

    await notifyPmEvent({
      orgId: input.orgId,
      actorId: input.actorId,
      eventType: 'pm.milestone.created',
      entityType: 'milestone',
      entityId: milestone.milestone_id,
      payload: {
        projectId: input.projectId,
        name: input.name,
      },
    });

    await emitWebhookEvent({
      orgId: input.orgId,
      eventType: 'pm.milestone.created',
      entityType: 'milestone',
      entityId: milestone.milestone_id,
      payload: {
        projectId: input.projectId,
        name: input.name,
      },
    });

    return milestone;
  },

  async update(orgId: string, milestoneId: string, update: MilestoneUpdate) {
    const { rows } = await query(
      `
      UPDATE core.pm_milestone
      SET
        name = COALESCE($3, name),
        description = COALESCE($4, description),
        due_date = COALESCE($5, due_date),
        status = COALESCE($6, status),
        completed_at = COALESCE($7, completed_at),
        updated_at = NOW()
      WHERE org_id = $1 AND milestone_id = $2
      RETURNING milestone_id, project_id, org_id, name, description, due_date, status, completed_at, created_at, updated_at
      `,
      [
        orgId,
        milestoneId,
        update.name ?? null,
        update.description ?? null,
        update.dueDate ?? null,
        update.status ?? null,
        update.completedAt ?? null,
      ]
    );

    const milestone = rows[0];

    if (milestone) {
      await emitPmActivity({
        orgId,
        actorId: update.actorId,
        entityType: 'milestone',
        entityId: milestone.milestone_id,
        action: 'updated',
        metadata: {
          projectId: milestone.project_id,
          name: milestone.name,
        },
      });

      await notifyPmEvent({
        orgId,
        actorId: update.actorId,
        eventType: 'pm.milestone.updated',
        entityType: 'milestone',
        entityId: milestone.milestone_id,
        payload: {
          projectId: milestone.project_id,
          name: milestone.name,
        },
      });

      await emitWebhookEvent({
        orgId,
        eventType: 'pm.milestone.updated',
        entityType: 'milestone',
        entityId: milestone.milestone_id,
        payload: {
          projectId: milestone.project_id,
          name: milestone.name,
        },
      });
    }

    return milestone;
  },
};
