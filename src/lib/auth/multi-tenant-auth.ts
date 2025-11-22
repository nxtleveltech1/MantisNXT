// @ts-nocheck
/**
 * Multi-Tenant Authentication System
 * Enterprise authentication with live database integration
 */

import { db } from '../database';
import { sign, verify } from 'jsonwebtoken';
import { hash, compare } from 'bcryptjs';
import { EventEmitter } from 'events';

export interface User {
  id: string;
  email: string;
  name: string;
  organizationId: string;
  role: string;
  permissions: string[];
  status: 'active' | 'inactive' | 'suspended';
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Organization {
  id: string;
  name: string;
  domain: string;
  status: 'active' | 'suspended' | 'trial';
  plan: 'free' | 'pro' | 'enterprise';
  settings: Record<string, unknown>;
  createdAt: string;
}

export interface AuthSession {
  id: string;
  userId: string;
  organizationId: string;
  token: string;
  refreshToken: string;
  expiresAt: string;
  createdAt: string;
  lastAccessed: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  organizationDomain?: string;
  rememberMe?: boolean;
}

export interface AuthResult {
  success: boolean;
  user?: User;
  organization?: Organization;
  session?: AuthSession;
  token?: string;
  refreshToken?: string;
  error?: string;
}

export class MultiTenantAuth extends EventEmitter {
  private _jwtSecret: string | null = null;
  private readonly tokenExpiry: string;
  private readonly refreshTokenExpiry: string;

  constructor() {
    super();
    this.tokenExpiry = '1h';
    this.refreshTokenExpiry = '30d';
  }

  /**
   * Lazy getter for JWT secret - validates only when first accessed at runtime
   */
  private get jwtSecret(): string {
    if (this._jwtSecret === null) {
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        throw new Error('JWT_SECRET environment variable is required for authentication');
      }
      this._jwtSecret = secret;
    }
    return this._jwtSecret;
  }

  /**
   * Authenticate user with email and password
   */
  async login(credentials: LoginCredentials): Promise<AuthResult> {
    try {
      // Find user by email
      const userQuery = `
        SELECT u.*, o.name as organization_name, o.domain as organization_domain,
               o.status as org_status, o.plan as org_plan
        FROM users u
        JOIN organizations o ON u.organization_id = o.id
        WHERE u.email = $1 AND u.status = 'active'
      `;

      const userResult = await db.query(userQuery, [credentials.email]);

      if (userResult.rows.length === 0) {
        return {
          success: false,
          error: 'Invalid email or password'
        };
      }

      const userData = userResult.rows[0];

      // Verify organization domain if provided
      if (credentials.organizationDomain &&
          userData.organization_domain !== credentials.organizationDomain) {
        return {
          success: false,
          error: 'Invalid organization domain'
        };
      }

      // Check organization status
      if (userData.org_status !== 'active') {
        return {
          success: false,
          error: 'Organization is not active'
        };
      }

      // Verify password
      const isPasswordValid = await compare(credentials.password, userData.password_hash);
      if (!isPasswordValid) {
        // Log failed login attempt
        await this.logAuthEvent('login_failed', userData.id, userData.organization_id);
        return {
          success: false,
          error: 'Invalid email or password'
        };
      }

      // Get user permissions
      const permissionsQuery = `
        SELECT p.name
        FROM permissions p
        JOIN role_permissions rp ON p.id = rp.permission_id
        JOIN user_roles ur ON rp.role_id = ur.role_id
        WHERE ur.user_id = $1
      `;

      const permissionsResult = await db.query(permissionsQuery, [userData.id]);
      const permissions = permissionsResult.rows.map(row => row.name);

      // Create user object
      const user: User = {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        organizationId: userData.organization_id,
        role: userData.role,
        permissions,
        status: userData.status,
        lastLogin: userData.last_login,
        createdAt: userData.created_at,
        updatedAt: userData.updated_at
      };

      // Create organization object
      const organization: Organization = {
        id: userData.organization_id,
        name: userData.organization_name,
        domain: userData.organization_domain,
        status: userData.org_status,
        plan: userData.org_plan,
        settings: userData.org_settings || {},
        createdAt: userData.org_created_at
      };

      // Create session
      const session = await this.createSession(user, credentials.rememberMe);

      // Update last login
      await db.query(
        'UPDATE users SET last_login = NOW() WHERE id = $1',
        [user.id]
      );

      // Log successful login
      await this.logAuthEvent('login_success', user.id, user.organizationId, {
        sessionId: session.id
      });

      // Emit authentication event
      this.emit('login', { user, organization, session });

      return {
        success: true,
        user,
        organization,
        session,
        token: session.token,
        refreshToken: session.refreshToken
      };

    } catch (error) {
      console.error('❌ Login error:', error);
      return {
        success: false,
        error: 'Authentication failed'
      };
    }
  }

  /**
   * Create authentication session
   */
  private async createSession(user: User, rememberMe: boolean = false): Promise<AuthSession> {
    const sessionId = this.generateSessionId();
    const expiresAt = new Date();

    if (rememberMe) {
      expiresAt.setDate(expiresAt.getDate() + 30); // 30 days
    } else {
      expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours
    }

    // Create JWT token
    const token = sign(
      {
        userId: user.id,
        organizationId: user.organizationId,
        sessionId,
        permissions: user.permissions
      },
      this.jwtSecret,
      { expiresIn: this.tokenExpiry }
    );

    // Create refresh token
    const refreshToken = sign(
      { userId: user.id, sessionId, type: 'refresh' },
      this.jwtSecret,
      { expiresIn: this.refreshTokenExpiry }
    );

    // Store session in database
    const sessionQuery = `
      INSERT INTO auth_sessions (id, user_id, organization_id, token_hash, refresh_token_hash, expires_at, created_at, last_accessed)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING *
    `;

    const tokenHash = await hash(token, 10);
    const refreshTokenHash = await hash(refreshToken, 10);

    const sessionResult = await db.query(sessionQuery, [
      sessionId,
      user.id,
      user.organizationId,
      tokenHash,
      refreshTokenHash,
      expiresAt.toISOString()
    ]);

    const sessionData = sessionResult.rows[0];

    return {
      id: sessionData.id,
      userId: sessionData.user_id,
      organizationId: sessionData.organization_id,
      token,
      refreshToken,
      expiresAt: sessionData.expires_at,
      createdAt: sessionData.created_at,
      lastAccessed: sessionData.last_accessed
    };
  }

  /**
   * Verify JWT token and get user session
   */
  async verifyToken(token: string): Promise<AuthResult> {
    try {
      // Verify JWT
      const decoded = verify(token, this.jwtSecret) as unknown;

      // Check session exists and is valid
      const sessionQuery = `
        SELECT s.*, u.email, u.name, u.status as user_status,
               o.name as organization_name, o.status as org_status
        FROM auth_sessions s
        JOIN users u ON s.user_id = u.id
        JOIN organizations o ON s.organization_id = o.id
        WHERE s.id = $1 AND s.expires_at > NOW()
      `;

      const sessionResult = await db.query(sessionQuery, [decoded.sessionId]);

      if (sessionResult.rows.length === 0) {
        return {
          success: false,
          error: 'Invalid or expired session'
        };
      }

      const sessionData = sessionResult.rows[0];

      // Check user and organization status
      if (sessionData.user_status !== 'active' || sessionData.org_status !== 'active') {
        return {
          success: false,
          error: 'User or organization is not active'
        };
      }

      // Update last accessed
      await db.query(
        'UPDATE auth_sessions SET last_accessed = NOW() WHERE id = $1',
        [decoded.sessionId]
      );

      // Get user permissions
      const permissionsQuery = `
        SELECT p.name
        FROM permissions p
        JOIN role_permissions rp ON p.id = rp.permission_id
        JOIN user_roles ur ON rp.role_id = ur.role_id
        WHERE ur.user_id = $1
      `;

      const permissionsResult = await db.query(permissionsQuery, [decoded.userId]);
      const permissions = permissionsResult.rows.map(row => row.name);

      const user: User = {
        id: decoded.userId,
        email: sessionData.email,
        name: sessionData.name,
        organizationId: decoded.organizationId,
        role: sessionData.role,
        permissions,
        status: sessionData.user_status,
        createdAt: sessionData.user_created_at,
        updatedAt: sessionData.user_updated_at
      };

      return {
        success: true,
        user
      };

    } catch (error) {
      return {
        success: false,
        error: 'Invalid token'
      };
    }
  }

  /**
   * Refresh authentication token
   */
  async refreshToken(refreshToken: string): Promise<AuthResult> {
    try {
      // Verify refresh token
      const decoded = verify(refreshToken, this.jwtSecret) as unknown;

      if (decoded.type !== 'refresh') {
        return {
          success: false,
          error: 'Invalid refresh token'
        };
      }

      // Get session and user data
      const sessionQuery = `
        SELECT s.*, u.email, u.name, u.organization_id, u.role, u.status,
               o.name as organization_name, o.status as org_status
        FROM auth_sessions s
        JOIN users u ON s.user_id = u.id
        JOIN organizations o ON s.organization_id = o.id
        WHERE s.id = $1 AND s.expires_at > NOW()
      `;

      const sessionResult = await db.query(sessionQuery, [decoded.sessionId]);

      if (sessionResult.rows.length === 0) {
        return {
          success: false,
          error: 'Invalid or expired session'
        };
      }

      const sessionData = sessionResult.rows[0];

      // Check status
      if (sessionData.status !== 'active' || sessionData.org_status !== 'active') {
        return {
          success: false,
          error: 'User or organization is not active'
        };
      }

      // Get permissions
      const permissionsQuery = `
        SELECT p.name
        FROM permissions p
        JOIN role_permissions rp ON p.id = rp.permission_id
        JOIN user_roles ur ON rp.role_id = ur.role_id
        WHERE ur.user_id = $1
      `;

      const permissionsResult = await db.query(permissionsQuery, [decoded.userId]);
      const permissions = permissionsResult.rows.map(row => row.name);

      // Create new access token
      const newToken = sign(
        {
          userId: decoded.userId,
          organizationId: sessionData.organization_id,
          sessionId: decoded.sessionId,
          permissions
        },
        this.jwtSecret,
        { expiresIn: this.tokenExpiry }
      );

      // Update token hash in database
      const tokenHash = await hash(newToken, 10);
      await db.query(
        'UPDATE auth_sessions SET token_hash = $1, last_accessed = NOW() WHERE id = $2',
        [tokenHash, decoded.sessionId]
      );

      const user: User = {
        id: decoded.userId,
        email: sessionData.email,
        name: sessionData.name,
        organizationId: sessionData.organization_id,
        role: sessionData.role,
        permissions,
        status: sessionData.status,
        createdAt: sessionData.created_at,
        updatedAt: sessionData.updated_at
      };

      return {
        success: true,
        user,
        token: newToken
      };

    } catch (error) {
      return {
        success: false,
        error: 'Failed to refresh token'
      };
    }
  }

  /**
   * Logout user and invalidate session
   */
  async logout(sessionId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Delete session from database
      const result = await db.query(
        'DELETE FROM auth_sessions WHERE id = $1 RETURNING user_id, organization_id',
        [sessionId]
      );

      if (result.rows.length > 0) {
        const { user_id, organization_id } = result.rows[0];

        // Log logout event
        await this.logAuthEvent('logout', user_id, organization_id, { sessionId });

        // Emit logout event
        this.emit('logout', { sessionId, userId: user_id, organizationId: organization_id });
      }

      return { success: true };

    } catch (error) {
      console.error('❌ Logout error:', error);
      return {
        success: false,
        error: 'Failed to logout'
      };
    }
  }

  /**
   * Check if user has permission
   */
  hasPermission(user: User, permission: string): boolean {
    return user.permissions.includes(permission) || user.permissions.includes('*');
  }

  /**
   * Check if user belongs to organization
   */
  belongsToOrganization(user: User, organizationId: string): boolean {
    return user.organizationId === organizationId;
  }

  /**
   * Log authentication events
   */
  private async logAuthEvent(
    event: string,
    userId: string,
    organizationId: string,
    metadata: unknown = {}
  ): Promise<void> {
    try {
      await db.query(
        `INSERT INTO auth_logs (event, user_id, organization_id, metadata, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [event, userId, organizationId, JSON.stringify(metadata)]
      );
    } catch (error) {
      console.error('❌ Error logging auth event:', error);
    }
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<void> {
    try {
      const result = await db.query(
        'DELETE FROM auth_sessions WHERE expires_at < NOW()'
      );

      if (result.rowCount && result.rowCount > 0) {
        console.log(`🧹 Cleaned up ${result.rowCount} expired sessions`);
      }
    } catch (error) {
      console.error('❌ Error cleaning up sessions:', error);
    }
  }

  /**
   * Get active sessions for user
   */
  async getUserSessions(userId: string): Promise<AuthSession[]> {
    const query = `
      SELECT * FROM auth_sessions
      WHERE user_id = $1 AND expires_at > NOW()
      ORDER BY last_accessed DESC
    `;

    const result = await db.query(query, [userId]);
    return result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      organizationId: row.organization_id,
      token: '[HIDDEN]',
      refreshToken: '[HIDDEN]',
      expiresAt: row.expires_at,
      createdAt: row.created_at,
      lastAccessed: row.last_accessed,
      ipAddress: row.ip_address,
      userAgent: row.user_agent
    }));
  }
}

// Singleton instance
export const multiTenantAuth = new MultiTenantAuth();

// Cleanup expired sessions every hour
setInterval(() => {
  multiTenantAuth.cleanupExpiredSessions();
}, 60 * 60 * 1000);

export default multiTenantAuth;
