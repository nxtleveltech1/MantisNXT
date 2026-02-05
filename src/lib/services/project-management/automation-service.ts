import { query } from '@/lib/database';
import { NotificationService } from './notification-service';
import { WebhookService } from './webhook-service';
import { ActivityService } from './activity-service';

export type AutomationRule = {
  rule_id: string;
  org_id: string;
  project_id: string | null;
  name: string;
  trigger_type: 'event' | 'schedule' | 'sla';
  trigger_config: Record<string, unknown>;
  conditions: Array<Record<string, unknown>>;
  actions: Array<Record<string, unknown>>;
  status: 'active' | 'paused' | 'archived';
};

type Condition = {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'in';
  value: unknown;
};

type Action = {
  type:
    | 'notify_assignee'
    | 'notify_project_owner'
    | 'set_status'
    | 'assign_user'
    | 'add_label'
    | 'comment';
  params?: Record<string, unknown>;
};

export class AutomationService {
  static async listRules(orgId: string, projectId?: string) {
    const conditions = ['org_id = $1'];
    const params: unknown[] = [orgId];
    let index = 2;

    if (projectId) {
      conditions.push(`(project_id = $${index} OR project_id IS NULL)`);
      params.push(projectId);
      index++;
    }

    const result = await query<AutomationRule>(
      `
      SELECT rule_id, org_id, project_id, name, trigger_type,
             trigger_config, conditions, actions, status
      FROM core.pm_automation_rule
      WHERE ${conditions.join(' AND ')}
      ORDER BY created_at DESC
      `,
      params
    );

    return result.rows.map(rule => ({
      ...rule,
      trigger_config: (rule.trigger_config as Record<string, unknown>) || {},
      conditions: (rule.conditions as Array<Record<string, unknown>>) || [],
      actions: (rule.actions as Array<Record<string, unknown>>) || [],
    }));
  }

  static async createRule(params: {
    orgId: string;
    projectId?: string | null;
    name: string;
    triggerType: 'event' | 'schedule' | 'sla';
    triggerConfig: Record<string, unknown>;
    conditions: Condition[];
    actions: Action[];
    createdBy?: string | null;
  }) {
    const result = await query<AutomationRule>(
      `
      INSERT INTO core.pm_automation_rule (
        org_id, project_id, name, trigger_type, trigger_config, conditions, actions, created_by
      ) VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb, $8)
      RETURNING rule_id, org_id, project_id, name, trigger_type, trigger_config, conditions, actions, status
      `,
      [
        params.orgId,
        params.projectId || null,
        params.name,
        params.triggerType,
        JSON.stringify(params.triggerConfig || {}),
        JSON.stringify(params.conditions || []),
        JSON.stringify(params.actions || []),
        params.createdBy || null,
      ]
    );

    return result.rows[0];
  }

  static async updateRule(params: {
    orgId: string;
    ruleId: string;
    patch: Partial<{
      name: string;
      triggerType: 'event' | 'schedule' | 'sla';
      triggerConfig: Record<string, unknown>;
      conditions: Condition[];
      actions: Action[];
      status: 'active' | 'paused' | 'archived';
    }>;
  }) {
    const fields: string[] = [];
    const values: unknown[] = [params.orgId, params.ruleId];
    let index = 3;

    if (params.patch.name !== undefined) {
      fields.push(`name = $${index++}`);
      values.push(params.patch.name);
    }
    if (params.patch.triggerType !== undefined) {
      fields.push(`trigger_type = $${index++}`);
      values.push(params.patch.triggerType);
    }
    if (params.patch.triggerConfig !== undefined) {
      fields.push(`trigger_config = $${index++}::jsonb`);
      values.push(JSON.stringify(params.patch.triggerConfig));
    }
    if (params.patch.conditions !== undefined) {
      fields.push(`conditions = $${index++}::jsonb`);
      values.push(JSON.stringify(params.patch.conditions));
    }
    if (params.patch.actions !== undefined) {
      fields.push(`actions = $${index++}::jsonb`);
      values.push(JSON.stringify(params.patch.actions));
    }
    if (params.patch.status !== undefined) {
      fields.push(`status = $${index++}`);
      values.push(params.patch.status);
    }

    if (fields.length === 0) {
      return null;
    }

    const result = await query<AutomationRule>(
      `
      UPDATE core.pm_automation_rule
      SET ${fields.join(', ')}, updated_at = now()
      WHERE org_id = $1 AND rule_id = $2
      RETURNING rule_id, org_id, project_id, name, trigger_type, trigger_config, conditions, actions, status
      `,
      values
    );

    return result.rows[0] || null;
  }

  static async deleteRule(orgId: string, ruleId: string): Promise<void> {
    await query('DELETE FROM core.pm_automation_rule WHERE org_id = $1 AND rule_id = $2', [orgId, ruleId]);
  }

  static async evaluateEvent(params: {
    orgId: string;
    projectId: string;
    event: string;
    entity: Record<string, unknown>;
  }): Promise<void> {
    const rules = await this.listRules(params.orgId, params.projectId);
    const eventRules = rules.filter(
      rule =>
        rule.status === 'active' &&
        rule.trigger_type === 'event' &&
        (rule.trigger_config?.event as string | undefined) === params.event
    );

    for (const rule of eventRules) {
      await this.runRule({
        rule,
        orgId: params.orgId,
        projectId: params.projectId,
        entity: params.entity,
        triggerType: 'event',
        triggerContext: { event: params.event },
      });
    }
  }

  static async runScheduled(params: { orgId: string }): Promise<void> {
    const rules = await this.listRules(params.orgId);
    const scheduleRules = rules.filter(rule => rule.status === 'active' && rule.trigger_type === 'schedule');

    for (const rule of scheduleRules) {
      const intervalMinutes = Number(rule.trigger_config?.interval_minutes || 0);
      if (!intervalMinutes || intervalMinutes <= 0) continue;

      const lastRun = await query<{ created_at: string }>(
        `SELECT created_at FROM core.pm_automation_run WHERE rule_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [rule.rule_id]
      );
      if (lastRun.rows.length > 0) {
        const lastTime = new Date(lastRun.rows[0].created_at).getTime();
        const now = Date.now();
        if (now - lastTime < intervalMinutes * 60 * 1000) continue;
      }

      await this.runRule({
        rule,
        orgId: params.orgId,
        projectId: rule.project_id || '',
        entity: {},
        triggerType: 'schedule',
        triggerContext: { interval_minutes: intervalMinutes },
      });
    }
  }

  static async runSla(params: { orgId: string }): Promise<void> {
    const rules = await this.listRules(params.orgId);
    const slaRules = rules.filter(rule => rule.status === 'active' && rule.trigger_type === 'sla');

    for (const rule of slaRules) {
      const overdueDays = Number(rule.trigger_config?.overdue_days || 0);
      const idleDays = Number(rule.trigger_config?.idle_days || 0);
      const projectId = rule.project_id;

      if (!overdueDays && !idleDays) continue;

      const conditions: string[] = ['t.org_id = $1'];
      const values: unknown[] = [params.orgId];
      let index = 2;

      if (projectId) {
        conditions.push(`t.project_id = $${index}`);
        values.push(projectId);
        index++;
      }

      if (overdueDays > 0) {
        conditions.push(`t.due_date IS NOT NULL AND t.due_date < (now() - ($${index}::int || ' days')::interval)`);
        values.push(overdueDays);
        index++;
      }

      if (idleDays > 0) {
        conditions.push(`t.updated_at < (now() - ($${index}::int || ' days')::interval)`);
        values.push(idleDays);
        index++;
      }

      const tasks = await query(
        `
        SELECT t.task_id, t.project_id, t.title, t.primary_assignee_id, t.status_id
        FROM core.pm_task t
        WHERE ${conditions.join(' AND ')}
        `,
        values
      );

      for (const task of tasks.rows) {
        await this.runRule({
          rule,
          orgId: params.orgId,
          projectId: task.project_id,
          entity: task as Record<string, unknown>,
          triggerType: 'sla',
          triggerContext: { overdue_days: overdueDays, idle_days: idleDays },
        });
      }
    }
  }

  private static async runRule(params: {
    rule: AutomationRule;
    orgId: string;
    projectId: string;
    entity: Record<string, unknown>;
    triggerType: 'event' | 'schedule' | 'sla';
    triggerContext: Record<string, unknown>;
  }): Promise<void> {
    const { rule, orgId, entity, triggerType, triggerContext } = params;

    const conditions = (rule.conditions || []) as Condition[];
    const actions = (rule.actions || []) as Action[];

    const matches = this.evaluateConditions(entity, conditions);
    if (!matches) {
      await this.recordRun({
        orgId,
        projectId: rule.project_id,
        ruleId: rule.rule_id,
        triggerType,
        triggerContext,
        status: 'skipped',
        message: 'Conditions not met',
      });
      return;
    }

    try {
      await this.executeActions({ orgId, entity, actions });
      await this.recordRun({
        orgId,
        projectId: rule.project_id,
        ruleId: rule.rule_id,
        triggerType,
        triggerContext,
        status: 'success',
        message: 'Rule executed',
      });
    } catch (error) {
      await this.recordRun({
        orgId,
        projectId: rule.project_id,
        ruleId: rule.rule_id,
        triggerType,
        triggerContext,
        status: 'failed',
        message: error instanceof Error ? error.message : 'Rule execution failed',
      });
    }
  }

  private static evaluateConditions(entity: Record<string, unknown>, conditions: Condition[]): boolean {
    if (!conditions || conditions.length === 0) return true;

    return conditions.every(condition => {
      const currentValue = this.getValue(entity, condition.field);
      switch (condition.operator) {
        case 'equals':
          return currentValue === condition.value;
        case 'not_equals':
          return currentValue !== condition.value;
        case 'contains':
          return String(currentValue || '').includes(String(condition.value || ''));
        case 'greater_than':
          return Number(currentValue) > Number(condition.value);
        case 'less_than':
          return Number(currentValue) < Number(condition.value);
        case 'in':
          return Array.isArray(condition.value)
            ? (condition.value as unknown[]).includes(currentValue)
            : false;
        default:
          return false;
      }
    });
  }

  private static getValue(entity: Record<string, unknown>, path: string): unknown {
    if (!path) return undefined;
    return path.split('.').reduce<unknown>((acc, key) => {
      if (acc && typeof acc === 'object' && key in acc) {
        return (acc as Record<string, unknown>)[key];
      }
      return undefined;
    }, entity);
  }

  private static async executeActions(params: {
    orgId: string;
    entity: Record<string, unknown>;
    actions: Action[];
  }) {
    const { orgId, entity, actions } = params;

    for (const action of actions) {
      switch (action.type) {
        case 'notify_assignee': {
          const userId = entity.primary_assignee_id as string | undefined;
          if (userId) {
            await NotificationService.notify({
              orgId,
              userId,
              type: 'warning',
              title: (action.params?.title as string) || 'Task Alert',
              message: (action.params?.message as string) || 'Automation triggered on your task.',
              actionUrl: (action.params?.action_url as string) || null,
              metadata: { rule_action: 'notify_assignee' },
            });
          }
          break;
        }
        case 'notify_project_owner': {
          const projectId = entity.project_id as string | undefined;
          if (projectId) {
            const owner = await query<{ owner_id: string | null }>(
              'SELECT owner_id FROM core.pm_project WHERE project_id = $1 AND org_id = $2',
              [projectId, orgId]
            );
            const ownerId = owner.rows[0]?.owner_id;
            if (ownerId) {
              await NotificationService.notify({
                orgId,
                userId: ownerId,
                type: 'info',
                title: (action.params?.title as string) || 'Project Alert',
                message: (action.params?.message as string) || 'Automation triggered on your project.',
                actionUrl: (action.params?.action_url as string) || null,
                metadata: { rule_action: 'notify_project_owner' },
              });
            }
          }
          break;
        }
        case 'set_status': {
          const statusId = action.params?.status_id as string | undefined;
          if (statusId && entity.task_id) {
            await query('UPDATE core.pm_task SET status_id = $1 WHERE task_id = $2', [statusId, entity.task_id]);
            await ActivityService.log({
              orgId,
              actorId: null,
              entityType: 'task',
              entityId: entity.task_id as string,
              action: 'status_changed',
              metadata: { status_id: statusId, source: 'automation' },
            });
          }
          break;
        }
        case 'assign_user': {
          const userId = action.params?.user_id as string | undefined;
          if (userId && entity.task_id) {
            await query(
              `UPDATE core.pm_task SET primary_assignee_id = $1 WHERE task_id = $2`,
              [userId, entity.task_id]
            );
            await query(
              `INSERT INTO core.pm_task_assignee (task_id, user_id) VALUES ($1, $2)
               ON CONFLICT (task_id, user_id) DO NOTHING`,
              [entity.task_id, userId]
            );
          }
          break;
        }
        case 'add_label': {
          const labelId = action.params?.label_id as string | undefined;
          if (labelId && entity.task_id) {
            await query(
              `INSERT INTO core.pm_task_label (task_id, label_id) VALUES ($1, $2)
               ON CONFLICT (task_id, label_id) DO NOTHING`,
              [entity.task_id, labelId]
            );
          }
          break;
        }
        case 'comment': {
          const body = (action.params?.body as string) || 'Automation note';
          if (entity.task_id) {
            await query(
              `INSERT INTO core.pm_comment (org_id, entity_type, entity_id, body)
               VALUES ($1, 'task', $2, $3)`,
              [orgId, entity.task_id, body]
            );
          }
          break;
        }
        default:
          break;
      }
    }

    if (entity.project_id) {
      await WebhookService.deliver({
        orgId,
        eventType: 'automation.executed',
        payload: { entity, actions },
      });
    }
  }

  private static async recordRun(params: {
    orgId: string;
    projectId: string | null | undefined;
    ruleId: string | null | undefined;
    triggerType: 'event' | 'schedule' | 'sla';
    triggerContext: Record<string, unknown>;
    status: 'success' | 'failed' | 'skipped';
    message?: string;
  }) {
    await query(
      `
      INSERT INTO core.pm_automation_run (rule_id, org_id, project_id, trigger_type, trigger_context, status, message)
      VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)
      `,
      [
        params.ruleId || null,
        params.orgId,
        params.projectId || null,
        params.triggerType,
        JSON.stringify(params.triggerContext || {}),
        params.status,
        params.message || null,
      ]
    );
  }
}
