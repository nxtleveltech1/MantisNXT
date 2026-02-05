import { query, withTransaction } from '@/lib/database';
import { ActivityService } from './activity-service';
import { WebhookService } from './webhook-service';
import { AutomationService } from './automation-service';
import { NotificationService } from './notification-service';

export class TaskService {
  static async list(params: {
    orgId: string;
    taskId?: string;
    projectId?: string;
    parentTaskId?: string;
    statusId?: string;
    assigneeId?: string;
    labelId?: string;
    sprintId?: string;
    milestoneId?: string;
    search?: string;
    dueFrom?: string;
    dueTo?: string;
    userId?: string;
    isAdmin?: boolean;
  }) {
    const conditions: string[] = ['t.org_id = $1'];
    const values: unknown[] = [params.orgId];
    let index = 2;

    if (params.taskId) {
      conditions.push(`t.task_id = $${index}`);
      values.push(params.taskId);
      index++;
    }

    if (params.parentTaskId) {
      conditions.push(`t.parent_task_id = $${index}`);
      values.push(params.parentTaskId);
      index++;
    }

    if (params.projectId) {
      conditions.push(`t.project_id = $${index}`);
      values.push(params.projectId);
      index++;
    }

    if (params.statusId) {
      conditions.push(`t.status_id = $${index}`);
      values.push(params.statusId);
      index++;
    }

    if (params.sprintId) {
      conditions.push(`t.sprint_id = $${index}`);
      values.push(params.sprintId);
      index++;
    }

    if (params.milestoneId) {
      conditions.push(`t.milestone_id = $${index}`);
      values.push(params.milestoneId);
      index++;
    }

    if (params.search) {
      conditions.push(`(t.title ILIKE $${index} OR t.description ILIKE $${index})`);
      values.push(`%${params.search}%`);
      index++;
    }

    if (params.dueFrom) {
      conditions.push(`t.due_date >= $${index}`);
      values.push(params.dueFrom);
      index++;
    }

    if (params.dueTo) {
      conditions.push(`t.due_date <= $${index}`);
      values.push(params.dueTo);
      index++;
    }

    if (params.assigneeId) {
      conditions.push(`EXISTS (SELECT 1 FROM core.pm_task_assignee ta WHERE ta.task_id = t.task_id AND ta.user_id = $${index})`);
      values.push(params.assigneeId);
      index++;
    }

    if (params.labelId) {
      conditions.push(`EXISTS (SELECT 1 FROM core.pm_task_label tl WHERE tl.task_id = t.task_id AND tl.label_id = $${index})`);
      values.push(params.labelId);
      index++;
    }

    if (params.userId && !params.isAdmin) {
      conditions.push(
        `(p.visibility = 'org' OR p.owner_id = $${index} OR EXISTS (
          SELECT 1 FROM core.pm_project_member m
          WHERE m.project_id = p.project_id AND m.user_id = $${index} AND m.is_active = true
        ))`
      );
      values.push(params.userId);
      index++;
    }

    const result = await query(
      `
      SELECT
        t.*, s.name as status_name, s.status_type,
        COALESCE(array_agg(DISTINCT l.name) FILTER (WHERE l.name IS NOT NULL), '{}') AS labels,
        COALESCE(array_agg(DISTINCT ta.user_id) FILTER (WHERE ta.user_id IS NOT NULL), '{}') AS assignees
      FROM core.pm_task t
      JOIN core.pm_project p ON p.project_id = t.project_id
      LEFT JOIN core.pm_status s ON s.status_id = t.status_id
      LEFT JOIN core.pm_task_label tl ON tl.task_id = t.task_id
      LEFT JOIN core.pm_label l ON l.label_id = tl.label_id
      LEFT JOIN core.pm_task_assignee ta ON ta.task_id = t.task_id
      WHERE ${conditions.join(' AND ')}
      GROUP BY t.task_id, s.name, s.status_type
      ORDER BY t.position ASC, t.created_at DESC
      `,
      values
    );

    return result.rows;
  }

  static async get(orgId: string, taskId: string) {
    const result = await this.list({ orgId, taskId });
    return result[0] || null;
  }

  static async create(params: {
    orgId: string;
    projectId: string;
    title: string;
    description?: string | null;
    statusId?: string | null;
    parentTaskId?: string | null;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    taskType?: 'task' | 'bug' | 'feature';
    estimatePoints?: number | null;
    startDate?: string | null;
    dueDate?: string | null;
    sprintId?: string | null;
    milestoneId?: string | null;
    primaryAssigneeId?: string | null;
    assigneeIds?: string[];
    labelIds?: string[];
    reporterId?: string | null;
    metadata?: Record<string, unknown>;
  }) {
    return withTransaction(async client => {
      let statusId = params.statusId || null;
      if (!statusId) {
        const statusResult = await client.query<{ status_id: string }>(
          `SELECT status_id FROM core.pm_status WHERE project_id = $1 AND is_default = true ORDER BY position ASC LIMIT 1`,
          [params.projectId]
        );
        statusId = statusResult.rows[0]?.status_id || null;
      }

      if (!statusId) {
        const fallbackStatus = await client.query<{ status_id: string }>(
          `SELECT status_id FROM core.pm_status WHERE project_id = $1 ORDER BY position ASC LIMIT 1`,
          [params.projectId]
        );
        statusId = fallbackStatus.rows[0]?.status_id || null;
      }

      if (!statusId) {
        throw new Error('Project has no statuses configured');
      }

      const posResult = await client.query<{ max_pos: number | null }>(
        `SELECT MAX(position) as max_pos FROM core.pm_task WHERE project_id = $1 AND status_id = $2`,
        [params.projectId, statusId]
      );
      const nextPos = (posResult.rows[0]?.max_pos ?? 0) + 1;

      const taskResult = await client.query(
        `
        INSERT INTO core.pm_task (
          org_id, project_id, parent_task_id, title, description, status_id, priority, task_type, estimate_points,
          start_date, due_date, sprint_id, milestone_id, primary_assignee_id, reporter_id, position, metadata
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17::jsonb)
        RETURNING *
        `,
        [
          params.orgId,
          params.projectId,
          params.parentTaskId || null,
          params.title,
          params.description || null,
          statusId,
          params.priority || 'medium',
          params.taskType || 'task',
          params.estimatePoints ?? null,
          params.startDate || null,
          params.dueDate || null,
          params.sprintId || null,
          params.milestoneId || null,
          params.primaryAssigneeId || null,
          params.reporterId || null,
          nextPos,
          JSON.stringify(params.metadata || {}),
        ]
      );

      const task = taskResult.rows[0];

      const assigneeIds = params.assigneeIds || (params.primaryAssigneeId ? [params.primaryAssigneeId] : []);
      for (const userId of assigneeIds) {
        await client.query(
          `INSERT INTO core.pm_task_assignee (task_id, user_id, assigned_by) VALUES ($1, $2, $3)
           ON CONFLICT (task_id, user_id) DO NOTHING`,
          [task.task_id, userId, params.reporterId || null]
        );
      }

      for (const labelId of params.labelIds || []) {
        await client.query(
          `INSERT INTO core.pm_task_label (task_id, label_id) VALUES ($1, $2)
           ON CONFLICT (task_id, label_id) DO NOTHING`,
          [task.task_id, labelId]
        );
      }

      await ActivityService.log({
        orgId: params.orgId,
        actorId: params.reporterId || null,
        entityType: 'task',
        entityId: task.task_id,
        action: 'created',
        metadata: { project_id: params.projectId },
      });

      if (params.primaryAssigneeId) {
        await NotificationService.notify({
          orgId: params.orgId,
          userId: params.primaryAssigneeId,
          type: 'info',
          title: 'New task assigned',
          message: params.title,
          actionUrl: `/project-management/projects/${params.projectId}`,
        });
      }

      await AutomationService.evaluateEvent({
        orgId: params.orgId,
        projectId: params.projectId,
        event: 'task.created',
        entity: task,
      });

      await WebhookService.deliver({
        orgId: params.orgId,
        eventType: 'task.created',
        payload: task,
      });

      return task;
    });
  }

  static async update(params: {
    orgId: string;
    taskId: string;
    patch: Record<string, unknown>;
    actorId?: string | null;
  }) {
    return withTransaction(async client => {
      const fields: string[] = [];
      const values: unknown[] = [params.orgId, params.taskId];
      let index = 3;

      const setField = (field: string, value: unknown) => {
        fields.push(`${field} = $${index}`);
        values.push(value);
        index++;
      };

      if (params.patch.title !== undefined) setField('title', params.patch.title);
      if (params.patch.description !== undefined) setField('description', params.patch.description);
      if (params.patch.parent_task_id !== undefined) setField('parent_task_id', params.patch.parent_task_id);
      if (params.patch.status_id !== undefined) setField('status_id', params.patch.status_id);
      if (params.patch.priority !== undefined) setField('priority', params.patch.priority);
      if (params.patch.task_type !== undefined) setField('task_type', params.patch.task_type);
      if (params.patch.estimate_points !== undefined) setField('estimate_points', params.patch.estimate_points);
      if (params.patch.start_date !== undefined) setField('start_date', params.patch.start_date);
      if (params.patch.due_date !== undefined) setField('due_date', params.patch.due_date);
      if (params.patch.sprint_id !== undefined) setField('sprint_id', params.patch.sprint_id);
      if (params.patch.milestone_id !== undefined) setField('milestone_id', params.patch.milestone_id);
      if (params.patch.primary_assignee_id !== undefined) setField('primary_assignee_id', params.patch.primary_assignee_id);
      if (params.patch.progress_percent !== undefined) setField('progress_percent', params.patch.progress_percent);
      if (params.patch.metadata !== undefined) setField('metadata', JSON.stringify(params.patch.metadata));

      if (fields.length === 0) return null;

      const result = await client.query(
        `UPDATE core.pm_task SET ${fields.join(', ')} WHERE org_id = $1 AND task_id = $2 RETURNING *`,
        values
      );

      const task = result.rows[0];

      if (params.patch.assignee_ids) {
        await client.query(`DELETE FROM core.pm_task_assignee WHERE task_id = $1`, [params.taskId]);
        for (const userId of params.patch.assignee_ids as string[]) {
          await client.query(
            `INSERT INTO core.pm_task_assignee (task_id, user_id, assigned_by)
             VALUES ($1, $2, $3)`,
            [params.taskId, userId, params.actorId || null]
          );
        }
      }

      if (params.patch.label_ids) {
        await client.query(`DELETE FROM core.pm_task_label WHERE task_id = $1`, [params.taskId]);
        for (const labelId of params.patch.label_ids as string[]) {
          await client.query(
            `INSERT INTO core.pm_task_label (task_id, label_id) VALUES ($1, $2)`,
            [params.taskId, labelId]
          );
        }
      }

      await ActivityService.log({
        orgId: params.orgId,
        actorId: params.actorId || null,
        entityType: 'task',
        entityId: params.taskId,
        action: 'updated',
      });

      await AutomationService.evaluateEvent({
        orgId: params.orgId,
        projectId: task.project_id,
        event: 'task.updated',
        entity: task,
      });

      await WebhookService.deliver({
        orgId: params.orgId,
        eventType: 'task.updated',
        payload: task,
      });

      return task;
    });
  }

  static async remove(orgId: string, taskId: string, actorId?: string | null) {
    const result = await query(
      `DELETE FROM core.pm_task WHERE org_id = $1 AND task_id = $2 RETURNING *`,
      [orgId, taskId]
    );

    if (result.rows.length > 0) {
      await ActivityService.log({
        orgId,
        actorId: actorId || null,
        entityType: 'task',
        entityId: taskId,
        action: 'deleted',
      });

      await WebhookService.deliver({
        orgId,
        eventType: 'task.deleted',
        payload: result.rows[0],
      });
    }

    return result.rows[0] || null;
  }

  static async move(params: {
    orgId: string;
    taskId: string;
    statusId?: string;
    beforeTaskId?: string | null;
    afterTaskId?: string | null;
  }) {
    const taskResult = await query(
      'SELECT task_id, project_id, status_id, position FROM core.pm_task WHERE org_id = $1 AND task_id = $2',
      [params.orgId, params.taskId]
    );

    if (taskResult.rows.length === 0) return null;

    const task = taskResult.rows[0];
    const statusId = params.statusId || task.status_id;

    let newPosition = task.position;

    if (params.beforeTaskId) {
      const beforeResult = await query(
        'SELECT position FROM core.pm_task WHERE task_id = $1 AND project_id = $2',
        [params.beforeTaskId, task.project_id]
      );
      newPosition = beforeResult.rows[0]?.position - 0.5;
    } else if (params.afterTaskId) {
      const afterResult = await query(
        'SELECT position FROM core.pm_task WHERE task_id = $1 AND project_id = $2',
        [params.afterTaskId, task.project_id]
      );
      newPosition = afterResult.rows[0]?.position + 0.5;
    } else {
      const maxResult = await query<{ max_pos: number | null }>(
        'SELECT MAX(position) as max_pos FROM core.pm_task WHERE project_id = $1 AND status_id = $2',
        [task.project_id, statusId]
      );
      newPosition = (maxResult.rows[0]?.max_pos ?? 0) + 1;
    }

    const updated = await query(
      'UPDATE core.pm_task SET status_id = $1, position = $2 WHERE task_id = $3 RETURNING *',
      [statusId, newPosition, params.taskId]
    );

    await ActivityService.log({
      orgId: params.orgId,
      actorId: null,
      entityType: 'task',
      entityId: params.taskId,
      action: 'moved',
      metadata: { status_id: statusId, position: newPosition },
    });

    await WebhookService.deliver({
      orgId: params.orgId,
      eventType: 'task.moved',
      payload: updated.rows[0],
    });

    return updated.rows[0];
  }

  static async listSubtasks(orgId: string, taskId: string) {
    return this.list({ orgId, parentTaskId: taskId });
  }

  static async listDependencies(orgId: string, taskId: string) {
    const result = await query(
      `
      SELECT dependency_id, task_id, depends_on_task_id, dependency_type, created_at
      FROM core.pm_task_dependency
      WHERE task_id = $1
      `,
      [taskId]
    );
    return result.rows;
  }

  static async addDependency(params: {
    taskId: string;
    dependsOnTaskId: string;
    dependencyType?: 'blocks' | 'relates';
    createdBy?: string | null;
  }) {
    const result = await query(
      `
      INSERT INTO core.pm_task_dependency (task_id, depends_on_task_id, dependency_type, created_by)
      VALUES ($1, $2, $3, $4)
      RETURNING dependency_id, task_id, depends_on_task_id, dependency_type, created_at
      `,
      [params.taskId, params.dependsOnTaskId, params.dependencyType || 'blocks', params.createdBy || null]
    );
    return result.rows[0];
  }

  static async removeDependency(dependencyId: string) {
    await query('DELETE FROM core.pm_task_dependency WHERE dependency_id = $1', [dependencyId]);
  }
}
