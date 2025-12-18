/**
 * Utility to ensure default roles exist for an organization
 */

import { db } from '@/lib/database';

const DEFAULT_ROLES = [
  {
    slug: 'super_admin',
    name: 'Super Administrator',
    description: 'Full system access across all organizations',
    level: 100,
  },
  {
    slug: 'admin',
    name: 'Administrator',
    description: 'Full access within organization',
    level: 90,
  },
  {
    slug: 'manager',
    name: 'Manager',
    description: 'Manage team and department resources',
    level: 70,
  },
  { slug: 'user', name: 'User', description: 'Standard user access', level: 50 },
  { slug: 'viewer', name: 'Viewer', description: 'Read-only access', level: 30 },
] as const;

/**
 * Ensures that default roles exist for the given organization.
 * Creates any missing roles.
 */
export async function ensureDefaultRoles(orgId: string): Promise<void> {
  console.log('[EnsureRoles] Checking roles for org:', orgId);

  for (const role of DEFAULT_ROLES) {
    try {
      await db.query(
        `
        INSERT INTO auth.roles (org_id, name, slug, description, role_level, is_system_role, is_active)
        VALUES ($1, $2, $3, $4, $5, true, true)
        ON CONFLICT (org_id, slug) DO NOTHING
        `,
        [orgId, role.name, role.slug, role.description, role.level]
      );
    } catch (error) {
      // Log but don't fail if role creation fails (might be a constraint issue)
      console.warn('[EnsureRoles] Failed to create role:', role.slug, error);
    }
  }

  console.log('[EnsureRoles] Default roles ensured for org:', orgId);
}

/**
 * Gets the role ID for a given slug, creating it if necessary.
 * Returns null if the role cannot be found or created.
 */
export async function getOrCreateRole(orgId: string, roleSlug: string): Promise<string | null> {
  // First try to find the role
  let result = await db.query(
    `SELECT id FROM auth.roles WHERE slug = $1 AND org_id = $2 AND is_active = true`,
    [roleSlug, orgId]
  );

  if (result.rows.length > 0) {
    return result.rows[0].id;
  }

  // Try to find in any org (for global roles)
  result = await db.query(
    `SELECT id FROM auth.roles WHERE slug = $1 AND is_active = true LIMIT 1`,
    [roleSlug]
  );

  if (result.rows.length > 0) {
    return result.rows[0].id;
  }

  // Role doesn't exist - try to create it
  const defaultRole = DEFAULT_ROLES.find(r => r.slug === roleSlug);
  if (!defaultRole) {
    console.warn('[GetOrCreateRole] Unknown role slug:', roleSlug);
    return null;
  }

  try {
    const insertResult = await db.query(
      `
      INSERT INTO auth.roles (org_id, name, slug, description, role_level, is_system_role, is_active)
      VALUES ($1, $2, $3, $4, $5, true, true)
      RETURNING id
      `,
      [orgId, defaultRole.name, defaultRole.slug, defaultRole.description, defaultRole.level]
    );

    if (insertResult.rows.length > 0) {
      console.log('[GetOrCreateRole] Created role:', roleSlug, insertResult.rows[0].id);
      return insertResult.rows[0].id;
    }
  } catch (error) {
    console.error('[GetOrCreateRole] Failed to create role:', roleSlug, error);
  }

  return null;
}





