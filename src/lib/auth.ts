/**
 * Enterprise Authentication & Authorization Middleware
 * JWT-based auth with role-based access control
 */

// @ts-nocheck
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/database';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  organizationId: string;
  roles: string[];
  permissions: string[];
}

export interface AuthContext {
  user: AuthUser;
  token: string;
}

const JWT_SECRET = process.env.JWT_SECRET || 'enterprise_jwt_secret_key_2024_production';
const SESSION_TIMEOUT = parseInt(process.env.SESSION_TIMEOUT || '3600000'); // 1 hour

/**
 * Generate JWT token for authenticated user
 */
export async function generateToken(user: AuthUser): Promise<string> {
  const payload = {
    userId: user.id,
    email: user.email,
    organizationId: user.organizationId,
    roles: user.roles,
    permissions: user.permissions,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + SESSION_TIMEOUT / 1000,
  };

  return jwt.sign(payload, JWT_SECRET);
}

/**
 * Verify and decode JWT token
 */
export async function verifyToken(token: string): Promise<AuthUser | null> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as unknown;

    // Check if token is expired
    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    // Fetch fresh user data to ensure current permissions
    const userResult = await db.query(
      `
      SELECT
        u.id, u.email, u.first_name, u.last_name, u.organization_id,
        COALESCE(array_agg(DISTINCT r.name) FILTER (WHERE r.name IS NOT NULL), '{}') as roles,
        COALESCE(array_agg(DISTINCT p.name) FILTER (WHERE p.name IS NOT NULL), '{}') as permissions
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      LEFT JOIN permissions p ON p.name = ANY(r.permissions::text[])
      WHERE u.id = $1 AND u.is_active = true
      GROUP BY u.id, u.email, u.first_name, u.last_name, u.organization_id
    `,
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      return null;
    }

    const user = userResult.rows[0];
    return {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      organizationId: user.organization_id,
      roles: user.roles || [],
      permissions: user.permissions || [],
    };
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}

/**
 * Extract auth context from request
 */
export async function getAuthContext(request: NextRequest): Promise<AuthContext | null> {
  const authHeader = request.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  const user = await verifyToken(token);

  if (!user) {
    return null;
  }

  return { user, token };
}

/**
 * Authentication middleware decorator
 */
export function withAuth(
  handler: (request: NextRequest, context: AuthContext) => Promise<NextResponse>,
  requiredPermissions?: string[]
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      const authContext = await getAuthContext(request);

      if (!authContext) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        );
      }

      // Check permissions if required
      if (requiredPermissions && requiredPermissions.length > 0) {
        const hasPermission = requiredPermissions.some(
          permission =>
            authContext.user.permissions.includes(permission) ||
            authContext.user.roles.includes('admin') ||
            authContext.user.roles.includes('super_admin')
        );

        if (!hasPermission) {
          return NextResponse.json(
            { success: false, error: 'Insufficient permissions' },
            { status: 403 }
          );
        }
      }

      return handler(request, authContext);
    } catch (error) {
      console.error('Auth middleware error:', error);
      return NextResponse.json({ success: false, error: 'Authentication error' }, { status: 500 });
    }
  };
}

/**
 * Role-based access control
 */
export function hasRole(user: AuthUser, role: string): boolean {
  return user.roles.includes(role) || user.roles.includes('super_admin');
}

/**
 * Permission-based access control
 */
export function hasPermission(user: AuthUser, permission: string): boolean {
  return (
    user.permissions.includes(permission) ||
    user.roles.includes('admin') ||
    user.roles.includes('super_admin')
  );
}

/**
 * Organization-based access control
 */
export function isSameOrganization(user: AuthUser, organizationId: string): boolean {
  return user.organizationId === organizationId;
}

/**
 * Login user and generate session
 */
export async function loginUser(
  email: string,
  password: string
): Promise<{ user: AuthUser; token: string } | null> {
  try {
    // Find user with password (use proper password hashing in production)
    const userResult = await db.query(
      `
      SELECT
        u.id, u.email, u.first_name, u.last_name, u.organization_id, u.password_hash,
        COALESCE(array_agg(DISTINCT r.name) FILTER (WHERE r.name IS NOT NULL), '{}') as roles,
        COALESCE(array_agg(DISTINCT p.name) FILTER (WHERE p.name IS NOT NULL), '{}') as permissions
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      LEFT JOIN permissions p ON p.name = ANY(r.permissions::text[])
      WHERE u.email = $1 AND u.is_active = true
      GROUP BY u.id, u.email, u.first_name, u.last_name, u.organization_id, u.password_hash
    `,
      [email.toLowerCase()]
    );

    if (userResult.rows.length === 0) {
      return null;
    }

    const userData = userResult.rows[0];

    // Verify password using bcrypt
    const isValidPassword = await bcrypt.compare(password, userData.password_hash);
    if (!isValidPassword) {
      return null;
    }

    const user: AuthUser = {
      id: userData.id,
      email: userData.email,
      firstName: userData.first_name,
      lastName: userData.last_name,
      organizationId: userData.organization_id,
      roles: userData.roles || [],
      permissions: userData.permissions || [],
    };

    const token = await generateToken(user);

    // Log login activity
    await db.query(
      `
      INSERT INTO activity_logs (user_id, organization_id, action, resource, details, ip_address, user_agent)
      VALUES ($1, $2, 'login', 'auth', $3, $4, $5)
    `,
      [
        user.id,
        user.organizationId,
        JSON.stringify({ email, timestamp: new Date() }),
        'unknown', // You can extract from request
        'user-agent', // You can extract from request
      ]
    );

    return { user, token };
  } catch (error) {
    console.error('Login error:', error);
    return null;
  }
}

/**
 * Refresh token if near expiry
 */
export async function refreshToken(currentToken: string): Promise<string | null> {
  try {
    const decoded = jwt.verify(currentToken, JWT_SECRET) as unknown;

    // Check if token expires within next 15 minutes
    const expiryTime = decoded.exp * 1000;
    const refreshThreshold = 15 * 60 * 1000; // 15 minutes

    if (expiryTime - Date.now() > refreshThreshold) {
      return currentToken; // Token still valid for a while
    }

    // Generate new token
    const user = await verifyToken(currentToken);
    if (!user) {
      return null;
    }

    return generateToken(user);
  } catch (error) {
    console.error('Token refresh error:', error);
    return null;
  }
}
