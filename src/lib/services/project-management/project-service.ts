import { query, withTransaction } from '@/lib/database';
import { ActivityService } from './activity-service';
import { NotificationService } from './notification-service';

export type Project = {
  project_id: string;
  org_id: string;
  name: string;
  description: string | null;
  project_key: string;
  status: 'active' | 'archived' | 'completed';
  visibility: 'org' | 'private';
  owner_id: string | null;
  start_date: string | null;
  target_date: string | null;
  completed_at: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

const DEFAULT_STATUSES = [
  { name: 'Backlog', key: 'backlog', type: 'todo', color: '#64748b', position: 0, is_default: true },
  { name: 'In Progress', key: 'in_progress', type: 'in_progress', color: '#2563eb', position: 1, is_default: false },
  { name: 'Review', key: 'review', type: 'in_progress', color: '#f59e0b', position: 2, is_default: false },
  { name: 'Done', key: 'done', type: 'done', color: '#16a34a', position: 3, is_default: false },
] as const;

export class ProjectService {
  static async list(orgId: string, filters?: { status?: string; visibility?: string; search?: string }) {
    const conditions = ['org_id = $1'];
    const params: unknown[] = [orgId];
    let index = 2;

    if (filters?.status) {
      conditions.push(`status = $${index}`);
      params.push(filters.status);
      index++;
    }

    if (filters?.visibility) {
      conditions.push(`visibility = $${index}`);
      params.push(filters.visibility);
      index++;
    }

    if (filters?.search) {
      conditions.push(`(name ILIKE $${index} OR description ILIKE $${index})`);
      params.push(`%${filters.search}%`);
      index++;
    }

    const result = await query<Project>(
      `SELECT * FROM core.pm_project WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC`,
      params
    );

    return result.rows;
  }

  static async listForUser(params: {
    orgId: string;
    userId: string;
    isAdmin: boolean;
    filters?: { status?: string; visibility?: string; search?: string };
  }) {
    const conditions = ['p.org_id = $1'];
    const values: unknown[] = [params.orgId];
    let index = 2;

    if (params.filters?.status) {
      conditions.push(`p.status = $${index}`);
      values.push(params.filters.status);
      index++;
    }

    if (params.filters?.visibility) {
      conditions.push(`p.visibility = $${index}`);
      values.push(params.filters.visibility);
      index++;
    }

    if (params.filters?.search) {
      conditions.push(`(p.name ILIKE $${index} OR p.description ILIKE $${index})`);
      values.push(`%${params.filters.search}%`);
      index++;
    }

    if (!params.isAdmin) {
      conditions.push(
        `(p.visibility = 'org' OR p.owner_id = $${index} OR EXISTS (
          SELECT 1 FROM core.pm_project_member m
          WHERE m.project_id = p.project_id AND m.user_id = $${index} AND m.is_active = true
        ))`
      );
      values.push(params.userId);
      index++;
    }

    const result = await query<Project>(
      `SELECT p.* FROM core.pm_project p WHERE ${conditions.join(' AND ')} ORDER BY p.created_at DESC`,
      values
    );

    return result.rows;
  }

  static async get(orgId: string, projectId: string): Promise<Project | null> {
    const result = await query<Project>(
      'SELECT * FROM core.pm_project WHERE org_id = $1 AND project_id = $2',
      [orgId, projectId]
    );
    return result.rows[0] || null;
  }

  static async create(params: {
    orgId: string;
    name: string;
    description?: string | null;
    projectKey: string;
    visibility?: 'org' | 'private';
    ownerId?: string | null;
    startDate?: string | null;
    targetDate?: string | null;
    metadata?: Record<string, unknown>;
  }): Promise<Project> {
    return withTransaction(async client => {
      const projectResult = await client.query<Project>(
        `
        INSERT INTO core.pm_project (
          org_id, name, description, project_key, visibility, owner_id, start_date, target_date, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
        RETURNING *
        `,
        [
          params.orgId,
          params.name,
          params.description || null,
          params.projectKey,
          params.visibility || 'org',
          params.ownerId || null,
          params.startDate || null,
          params.targetDate || null,
          JSON.stringify(params.metadata || {}),
        ]
      );

      const project = projectResult.rows[0];

      if (project.owner_id) {
        await client.query(
          `
          INSERT INTO core.pm_project_member (project_id, user_id, role, is_active)
          VALUES ($1, $2, 'owner', true)
          ON CONFLICT (project_id, user_id) DO UPDATE SET role = 'owner', is_active = true
          `,
          [project.project_id, project.owner_id]
        );
      }

      for (const status of DEFAULT_STATUSES) {
        await client.query(
          `
          INSERT INTO core.pm_status (org_id, project_id, name, status_key, status_type, color, position, is_default)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `,
          [
            params.orgId,
            project.project_id,
            status.name,
            status.key,
            status.type,
            status.color,
            status.position,
            status.is_default,
          ]
        );
      }

      await ActivityService.log({
        orgId: params.orgId,
        actorId: params.ownerId || null,
        entityType: 'project',
        entityId: project.project_id,
        action: 'created',
      });

      if (project.owner_id) {
        await NotificationService.notify({
          orgId: params.orgId,
          userId: project.owner_id,
          type: 'success',
          title: 'Project created',
          message: `Project ${project.name} is ready.`,
          actionUrl: `/project-management/projects/${project.project_id}`,
        });
      }

      return project;
    });
  }

  static async update(orgId: string, projectId: string, patch: Partial<Project>) {
    const fields: string[] = [];
    const values: unknown[] = [orgId, projectId];
    let index = 3;

    const addField = (field: string, value: unknown) => {
      fields.push(`${field} = $${index}`);
      values.push(value);
      index++;
    };

    if (patch.name !== undefined) addField('name', patch.name);
    if (patch.description !== undefined) addField('description', patch.description);
    if (patch.status !== undefined) addField('status', patch.status);
    if (patch.visibility !== undefined) addField('visibility', patch.visibility);
    if (patch.owner_id !== undefined) addField('owner_id', patch.owner_id);
    if (patch.start_date !== undefined) addField('start_date', patch.start_date);
    if (patch.target_date !== undefined) addField('target_date', patch.target_date);
    if (patch.completed_at !== undefined) addField('completed_at', patch.completed_at);
    if (patch.metadata !== undefined) addField('metadata', JSON.stringify(patch.metadata));

    if (fields.length === 0) return null;

    const result = await query<Project>(
      `UPDATE core.pm_project SET ${fields.join(', ')} WHERE org_id = $1 AND project_id = $2 RETURNING *`,
      values
    );

    return result.rows[0] || null;
  }

  static async archive(orgId: string, projectId: string) {
    const result = await query<Project>(
      `UPDATE core.pm_project SET status = 'archived' WHERE org_id = $1 AND project_id = $2 RETURNING *`,
      [orgId, projectId]
    );
    return result.rows[0] || null;
  }

  static async listMembers(orgId: string, projectId: string) {
    const result = await query(
      `
      SELECT m.project_id, m.user_id, m.role, m.is_active, m.joined_at,
             u.email, u.display_name
      FROM core.pm_project_member m
      JOIN auth.users_extended u ON u.id = m.user_id
      WHERE m.project_id = $1
      `,
      [projectId]
    );
    return result.rows;
  }

  static async addMember(params: {
    projectId: string;
    userId: string;
    role: 'owner' | 'admin' | 'member' | 'viewer';
    addedBy?: string | null;
  }) {
    const result = await query(
      `
      INSERT INTO core.pm_project_member (project_id, user_id, role, is_active, added_by)
      VALUES ($1, $2, $3, true, $4)
      ON CONFLICT (project_id, user_id) DO UPDATE SET role = EXCLUDED.role, is_active = true, added_by = EXCLUDED.added_by
      RETURNING project_id, user_id, role, is_active, joined_at
      `,
      [params.projectId, params.userId, params.role, params.addedBy || null]
    );

    return result.rows[0];
  }

  static async removeMember(projectId: string, userId: string) {
    await query(
      `DELETE FROM core.pm_project_member WHERE project_id = $1 AND user_id = $2`,
      [projectId, userId]
    );
  }
}
