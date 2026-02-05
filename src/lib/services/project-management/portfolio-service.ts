import { query } from '@/lib/database';
import { ActivityService } from './activity-service';

export class PortfolioService {
  static async list(orgId: string) {
    const result = await query(
      `
      SELECT portfolio_id, org_id, name, description, owner_id, created_at, updated_at
      FROM core.pm_portfolio
      WHERE org_id = $1
      ORDER BY created_at DESC
      `,
      [orgId]
    );
    return result.rows;
  }

  static async create(params: {
    orgId: string;
    name: string;
    description?: string | null;
    ownerId?: string | null;
  }) {
    const result = await query(
      `
      INSERT INTO core.pm_portfolio (portfolio_id, org_id, name, description, owner_id, created_at, updated_at)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, now(), now())
      RETURNING portfolio_id, org_id, name, description, owner_id, created_at, updated_at
      `,
      [params.orgId, params.name, params.description || null, params.ownerId || null]
    );

    const portfolio = result.rows[0];

    await ActivityService.log({
      orgId: params.orgId,
      actorId: params.ownerId || null,
      entityType: 'portfolio',
      entityId: portfolio.portfolio_id,
      action: 'created',
    });

    return portfolio;
  }

  static async update(params: {
    orgId: string;
    portfolioId: string;
    patch: Partial<{ name: string; description: string | null; owner_id: string | null }>;
  }) {
    const fields: string[] = [];
    const values: unknown[] = [params.orgId, params.portfolioId];
    let index = 3;

    const add = (field: string, value: unknown) => {
      fields.push(`${field} = $${index}`);
      values.push(value);
      index++;
    };

    if (params.patch.name !== undefined) add('name', params.patch.name);
    if (params.patch.description !== undefined) add('description', params.patch.description);
    if (params.patch.owner_id !== undefined) add('owner_id', params.patch.owner_id);

    if (fields.length === 0) return null;

    const result = await query(
      `
      UPDATE core.pm_portfolio
      SET ${fields.join(', ')}, updated_at = now()
      WHERE org_id = $1 AND portfolio_id = $2
      RETURNING portfolio_id, org_id, name, description, owner_id, created_at, updated_at
      `,
      values
    );

    return result.rows[0] || null;
  }

  static async listProjects(orgId: string, portfolioId: string) {
    const result = await query(
      `
      SELECT p.project_id, p.name, p.status, p.visibility, pp.position, pp.added_at
      FROM core.pm_portfolio_project pp
      JOIN core.pm_project p ON p.project_id = pp.project_id
      WHERE pp.portfolio_id = $1 AND p.org_id = $2
      ORDER BY pp.position ASC
      `,
      [portfolioId, orgId]
    );

    return result.rows;
  }

  static async addProject(params: {
    orgId: string;
    portfolioId: string;
    projectId: string;
    position?: number | null;
  }) {
    const posResult = await query<{ max_pos: number | null }>(
      `SELECT MAX(position) as max_pos FROM core.pm_portfolio_project WHERE portfolio_id = $1`,
      [params.portfolioId]
    );
    const position = params.position ?? (posResult.rows[0]?.max_pos ?? 0) + 1;

    const result = await query(
      `
      INSERT INTO core.pm_portfolio_project (portfolio_id, project_id, position)
      VALUES ($1, $2, $3)
      ON CONFLICT (portfolio_id, project_id) DO UPDATE SET position = EXCLUDED.position
      RETURNING portfolio_id, project_id, position, added_at
      `,
      [params.portfolioId, params.projectId, position]
    );

    return result.rows[0];
  }

  static async removeProject(portfolioId: string, projectId: string) {
    await query(
      `DELETE FROM core.pm_portfolio_project WHERE portfolio_id = $1 AND project_id = $2`,
      [portfolioId, projectId]
    );
  }
}
