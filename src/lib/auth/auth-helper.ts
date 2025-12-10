/**
 * Unified Authentication Helper
 * Now powered by Clerk with database user enrichment
 */

import type { NextRequest } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { db } from '@/lib/database';

export interface AuthenticatedUser {
  id: string;
  clerkId: string;
  email: string;
  displayName: string;
  firstName: string;
  lastName: string;
  orgId: string;
  department?: string;
  isActive: boolean;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  roles: Array<{
    id: string;
    slug: string;
    name: string;
    level: number;
  }>;
  permissions: string[];
}

/**
 * Get authentication token from request (for backwards compatibility)
 * @deprecated Use verifyAuth() instead
 */
export function getAuthToken(request: NextRequest): string | null {
  // Try cookie first
  let token = request.cookies.get('session_token')?.value;

  // Try Authorization header
  if (!token) {
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }

  return token || null;
}

/**
 * Verify authentication and return user
 * Uses Clerk for authentication and enriches with database user data
 */
export async function verifyAuth(_request?: NextRequest): Promise<AuthenticatedUser | null> {
  try {
    // Get Clerk authentication state
    const { userId } = await auth();

    if (!userId) {
      console.log('[verifyAuth] No authenticated user from Clerk');
      return null;
    }

    // Get full user object from Clerk
    const clerkUser = await currentUser();

    if (!clerkUser) {
      console.log('[verifyAuth] Could not fetch current user from Clerk');
      return null;
    }

    const email = clerkUser.primaryEmailAddress?.emailAddress;

    if (!email) {
      console.log('[verifyAuth] No primary email found for Clerk user');
      return null;
    }

    // Try to get enriched user data from database
    try {
      const userResult = await db.query(
        `
        SELECT
          u.id,
          u.clerk_id,
          u.email,
          u.display_name,
          u.first_name,
          u.last_name,
          u.org_id,
          u.department,
          u.is_active,
          u.email_verified,
          u.two_factor_enabled,
          COALESCE(
            json_agg(
              DISTINCT jsonb_build_object(
                'id', r.id,
                'slug', r.slug,
                'name', r.name,
                'level', COALESCE(r.role_level, 0)
              )
            ) FILTER (WHERE r.id IS NOT NULL),
            '[]'::json
          ) as roles,
          COALESCE(
            json_agg(DISTINCT p.name) FILTER (WHERE p.name IS NOT NULL),
            '[]'::json
          ) as permissions
        FROM auth.users_extended u
        LEFT JOIN auth.user_roles ur ON u.id = ur.user_id
        LEFT JOIN auth.roles r ON ur.role_id = r.id AND r.is_active = true
        LEFT JOIN auth.role_permissions rp ON r.id = rp.role_id
        LEFT JOIN auth.permissions p ON rp.permission_id = p.id
        WHERE (u.clerk_id = $1 OR u.email = $2) AND u.is_active = true
        GROUP BY u.id, u.clerk_id, u.email, u.display_name, u.first_name, u.last_name, 
                 u.org_id, u.department, u.is_active, u.email_verified, u.two_factor_enabled
        `,
        [userId, email]
      );

      if (userResult.rows.length > 0) {
        const dbUser = userResult.rows[0];
        console.log('[verifyAuth] Found database user:', dbUser.email);

        return {
          id: dbUser.id,
          clerkId: userId,
          email: dbUser.email,
          displayName:
            dbUser.display_name ||
            `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim(),
          firstName: dbUser.first_name || clerkUser.firstName || '',
          lastName: dbUser.last_name || clerkUser.lastName || '',
          orgId: dbUser.org_id || '',
          department: dbUser.department,
          isActive: dbUser.is_active,
          emailVerified:
            dbUser.email_verified ||
            clerkUser.primaryEmailAddress?.verification?.status === 'verified',
          twoFactorEnabled: dbUser.two_factor_enabled || clerkUser.twoFactorEnabled,
          roles: dbUser.roles || [],
          permissions: dbUser.permissions || [],
        };
      }
    } catch (dbError) {
      console.warn('[verifyAuth] Database lookup failed, using Clerk data only:', dbError);
    }

    // Fallback: Return user data from Clerk only (no database record yet)
    // This happens for new users before the webhook syncs them
    const metadata = clerkUser.publicMetadata as {
      org_id?: string;
      role?: string;
      department?: string;
      permissions?: string[];
    };

    console.log('[verifyAuth] Using Clerk-only data for user:', email);

    const baseUser: AuthenticatedUser = {
      id: userId, // Use Clerk ID as fallback
      clerkId: userId,
      email,
      displayName:
        `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || email.split('@')[0],
      firstName: clerkUser.firstName || '',
      lastName: clerkUser.lastName || '',
      orgId: metadata.org_id || '',
      isActive: true,
      emailVerified: clerkUser.primaryEmailAddress?.verification?.status === 'verified',
      twoFactorEnabled: clerkUser.twoFactorEnabled,
      roles: metadata.role ? [{ id: '', slug: metadata.role, name: metadata.role, level: 0 }] : [],
      permissions: metadata.permissions || [],
    };

    // Only add department if it exists (exactOptionalPropertyTypes compliance)
    if (metadata.department) {
      baseUser.department = metadata.department;
    }

    return baseUser;
  } catch (error) {
    console.error('[verifyAuth] Error during authentication:', error);
    return null;
  }
}

/**
 * Check if user has admin permissions
 */
export function isAdmin(user: AuthenticatedUser): boolean {
  return user.roles.some(r => r.slug === 'admin' || r.slug === 'super_admin' || r.level >= 90);
}

/**
 * Check if user has specific role
 */
export function hasRole(user: AuthenticatedUser, role: string): boolean {
  return user.roles.some(r => r.slug === role);
}

/**
 * Check if user has specific permission
 */
export function hasPermission(user: AuthenticatedUser, permission: string): boolean {
  return user.permissions.includes(permission);
}

/**
 * Require authentication - throws if not authenticated
 */
export async function requireAuth(request?: NextRequest): Promise<AuthenticatedUser> {
  const user = await verifyAuth(request);

  if (!user) {
    throw new Error('Authentication required');
  }

  return user;
}

/**
 * Require admin - throws if not admin
 */
export async function requireAdmin(request?: NextRequest): Promise<AuthenticatedUser> {
  const user = await requireAuth(request);

  if (!isAdmin(user)) {
    throw new Error('Admin access required');
  }

  return user;
}
