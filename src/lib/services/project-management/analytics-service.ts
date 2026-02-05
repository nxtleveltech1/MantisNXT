import { query } from '@/lib/database';

export class AnalyticsService {
  static async overview(orgId: string, projectId?: string | null) {
    const params: unknown[] = [orgId];
    let filter = 'org_id = $1';
    if (projectId) {
      filter += ' AND project_id = $2';
      params.push(projectId);
    }

    const projects = await query(
      `SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status = 'active')::int AS active
       FROM core.pm_project WHERE org_id = $1`,
      [orgId]
    );

    const tasks = await query(
      `
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE completed_at IS NOT NULL)::int AS completed,
        COUNT(*) FILTER (WHERE due_date IS NOT NULL AND due_date < now() AND completed_at IS NULL)::int AS overdue
      FROM core.pm_task
      WHERE ${filter}
      `,
      params
    );

    return {
      projects: projects.rows[0],
      tasks: tasks.rows[0],
    };
  }

  static async velocity(orgId: string, projectId?: string | null) {
    const conditions = ['t.org_id = $1'];
    const values: unknown[] = [orgId];
    let index = 2;

    if (projectId) {
      conditions.push(`t.project_id = $${index}`);
      values.push(projectId);
      index++;
    }

    const result = await query(
      `
      SELECT s.sprint_id, s.name, s.start_date, s.end_date,
             COUNT(t.task_id)::int AS completed_tasks
      FROM core.pm_sprint s
      LEFT JOIN core.pm_task t ON t.sprint_id = s.sprint_id
      LEFT JOIN core.pm_status st ON st.status_id = t.status_id
      WHERE s.org_id = $1
        AND (${conditions.join(' AND ')})
        AND (st.status_type = 'done' OR t.completed_at IS NOT NULL)
      GROUP BY s.sprint_id, s.name, s.start_date, s.end_date
      ORDER BY s.start_date DESC
      `,
      values
    );

    return result.rows;
  }

  static async workload(orgId: string, projectId?: string | null) {
    const conditions = ['t.org_id = $1'];
    const values: unknown[] = [orgId];
    let index = 2;

    if (projectId) {
      conditions.push(`t.project_id = $${index}`);
      values.push(projectId);
      index++;
    }

    const result = await query(
      `
      SELECT ta.user_id, COUNT(t.task_id)::int AS task_count
      FROM core.pm_task_assignee ta
      JOIN core.pm_task t ON t.task_id = ta.task_id
      LEFT JOIN core.pm_status s ON s.status_id = t.status_id
      WHERE ${conditions.join(' AND ')}
        AND (s.status_type IS NULL OR s.status_type <> 'done')
      GROUP BY ta.user_id
      ORDER BY task_count DESC
      `,
      values
    );

    return result.rows;
  }

  static async roadmap(orgId: string, projectId?: string | null) {
    const conditions = ['org_id = $1'];
    const values: unknown[] = [orgId];
    let index = 2;

    if (projectId) {
      conditions.push(`project_id = $${index}`);
      values.push(projectId);
      index++;
    }

    const tasks = await query(
      `
      SELECT task_id, project_id, title, start_date, due_date, status_id, completed_at
      FROM core.pm_task
      WHERE ${conditions.join(' AND ')}
      ORDER BY due_date NULLS LAST
      `,
      values
    );

    const milestones = await query(
      `
      SELECT milestone_id, project_id, name, due_date, status, completed_at
      FROM core.pm_milestone
      WHERE ${conditions.join(' AND ')}
      ORDER BY due_date NULLS LAST
      `,
      values
    );

    return { tasks: tasks.rows, milestones: milestones.rows };
  }

  static async statusDistribution(orgId: string, projectId?: string | null) {
    const conditions = ['t.org_id = $1'];
    const values: unknown[] = [orgId];
    let index = 2;

    if (projectId) {
      conditions.push(`t.project_id = $${index}`);
      values.push(projectId);
      index++;
    }

    const result = await query(
      `
      SELECT s.status_id, s.name, s.status_type, COUNT(t.task_id)::int AS task_count
      FROM core.pm_status s
      LEFT JOIN core.pm_task t ON t.status_id = s.status_id
      WHERE ${conditions.join(' AND ')}
      GROUP BY s.status_id, s.name, s.status_type
      ORDER BY s.position ASC
      `,
      values
    );

    return result.rows;
  }
}
