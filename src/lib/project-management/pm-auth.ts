import type { NextRequest } from 'next/server';

import { requireAuth, type AuthenticatedUser } from '@/lib/auth/auth-helper';
import { query } from '@/lib/database';

export class PmAuthError extends Error {
  constructor(
    public code:
      | 'AUTH_REQUIRED'
      | 'ORG_REQUIRED'
      | 'USER_NOT_SYNCED'
      | 'PROJECT_NOT_FOUND'
      | 'PROJECT_FORBIDDEN',
    message: string
  ) {
    super(message);
    this.name = 'PmAuthError';
  }
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function getRequestMeta(request: NextRequest) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    request.ip ||
    undefined;

  return {
    ipAddress: ip,
    userAgent: request.headers.get('user-agent') || undefined,
  };
}

export async function requirePmAuth(request?: NextRequest): Promise<{
  user: AuthenticatedUser;
  orgId: string;
  userId: string;
}> {
  let user: AuthenticatedUser;
  try {
    user = await requireAuth(request);
  } catch {
    throw new PmAuthError('AUTH_REQUIRED', 'Authentication required');
  }

  if (!user.orgId || !UUID_REGEX.test(user.orgId)) {
    throw new PmAuthError('ORG_REQUIRED', 'Organization context required');
  }

  if (!UUID_REGEX.test(user.id)) {
    throw new PmAuthError('USER_NOT_SYNCED', 'User record not synced yet');
  }

  return { user, orgId: user.orgId, userId: user.id };
}

function isAdminUser(user: AuthenticatedUser): boolean {
  return user.roles.some(role => role.slug === 'admin' || role.slug === 'super_admin' || role.level >= 90);
}

export async function assertProjectAccess(params: {
  orgId: string;
  user: AuthenticatedUser;
  projectId: string;
}): Promise<{ projectId: string; visibility: 'org' | 'private'; ownerId: string | null }> {
  const { orgId, user, projectId } = params;

  const projectResult = await query<{
    project_id: string;
    visibility: 'org' | 'private';
    owner_id: string | null;
  }>(
    `
    SELECT project_id, visibility, owner_id
    FROM core.pm_project
    WHERE project_id = $1 AND org_id = $2
    `,
    [projectId, orgId]
  );

  if (projectResult.rows.length === 0) {
    throw new PmAuthError('PROJECT_NOT_FOUND', 'Project not found');
  }

  const project = projectResult.rows[0];

  if (project.visibility === 'private' && !isAdminUser(user)) {
    const membership = await query(
      `
      SELECT 1
      FROM core.pm_project_member
      WHERE project_id = $1 AND user_id = $2 AND is_active = true
      `,
      [projectId, user.id]
    );

    const isOwner = project.owner_id && project.owner_id === user.id;

    if (membership.rows.length === 0 && !isOwner) {
      throw new PmAuthError('PROJECT_FORBIDDEN', 'You do not have access to this project');
    }
  }

  return { projectId: project.project_id, visibility: project.visibility, ownerId: project.owner_id };
}
