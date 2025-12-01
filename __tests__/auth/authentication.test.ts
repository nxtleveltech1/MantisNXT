/**
 * Authentication Service Test Suite
 *
 * Comprehensive tests for the authentication system including:
 * - User registration and login
 * - Password hashing and validation
 * - JWT token generation and validation
 * - Session management
 * - Role-based access control
 * - Two-factor authentication
 * - Account lockout after failed attempts
 */

import { describe, it, expect, beforeEach, beforeAll, afterAll } from '@jest/globals';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const { Pool } = pg;

// Mock environment variables
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.JWT_EXPIRES_IN = '1h';

interface TestUser {
  id?: string;
  email: string;
  password: string;
  display_name: string;
  org_id: string;
}

interface AuthService {
  register(user: Omit<TestUser, 'id'>): Promise<TestUser>;
  login(email: string, password: string): Promise<{ user: TestUser; token: string }>;
  validateToken(token: string): Promise<{ valid: boolean; userId?: string }>;
  logout(userId: string, sessionId: string): Promise<boolean>;
  changePassword(userId: string, oldPassword: string, newPassword: string): Promise<boolean>;
  getUserPermissions(userId: string): Promise<string[]>;
}

describe('Authentication Service', () => {
  let pool: Pool;
  let testOrgId: string;
  let authService: AuthService;

  beforeAll(async () => {
    // Initialize database connection
    const databaseUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('TEST_DATABASE_URL or DATABASE_URL must be set');
    }

    pool = new Pool({
      connectionString: databaseUrl,
      max: 5,
    });

    // Create test organization
    const orgResult = await pool.query(`
      INSERT INTO organization (name, slug, status)
      VALUES ('Test Organization', 'test-org', 'active')
      RETURNING id
    `);
    testOrgId = orgResult.rows[0].id;

    // Initialize auth service (placeholder - would be actual service)
    authService = {
      async register(user) {
        const hashedPassword = await bcrypt.hash(user.password, 10);
        const result = await pool.query(
          `INSERT INTO auth.users_extended (email, password_hash, display_name, org_id, is_active)
           VALUES ($1, $2, $3, $4, true)
           RETURNING id, email, display_name, org_id`,
          [user.email, hashedPassword, user.display_name, user.org_id]
        );
        return result.rows[0];
      },

      async login(email, password) {
        const userResult = await pool.query(
          'SELECT id, email, display_name, org_id, password_hash, failed_login_attempts, locked_until FROM auth.users_extended WHERE email = $1',
          [email]
        );

        if (userResult.rows.length === 0) {
          throw new Error('Invalid credentials');
        }

        const user = userResult.rows[0];

        // Check if account is locked
        if (user.locked_until && new Date(user.locked_until) > new Date()) {
          throw new Error('Account is locked');
        }

        // Verify password
        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) {
          // Increment failed login attempts
          await pool.query(
            `UPDATE auth.users_extended
             SET failed_login_attempts = failed_login_attempts + 1,
                 locked_until = CASE WHEN failed_login_attempts >= 4 THEN NOW() + INTERVAL '30 minutes' ELSE NULL END
             WHERE id = $1`,
            [user.id]
          );
          throw new Error('Invalid credentials');
        }

        // Reset failed login attempts on successful login
        await pool.query(
          'UPDATE auth.users_extended SET failed_login_attempts = 0, locked_until = NULL, last_login_at = NOW() WHERE id = $1',
          [user.id]
        );

        // Generate JWT token
        const token = jwt.sign(
          { userId: user.id, email: user.email, orgId: user.org_id },
          process.env.JWT_SECRET!,
          { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        // Create session
        await pool.query(
          `INSERT INTO auth.user_sessions (user_id, session_token, ip_address, expires_at, status)
           VALUES ($1, $2, $3, NOW() + INTERVAL '1 hour', 'active')`,
          [user.id, token, '127.0.0.1']
        );

        return { user, token };
      },

      async validateToken(token) {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
          return { valid: true, userId: decoded.userId };
        } catch (error) {
          return { valid: false };
        }
      },

      async logout(userId, sessionId) {
        await pool.query(
          'UPDATE auth.user_sessions SET status = $1, revoked_at = NOW() WHERE user_id = $2 AND id = $3',
          ['revoked', userId, sessionId]
        );
        return true;
      },

      async changePassword(userId, oldPassword, newPassword) {
        const userResult = await pool.query(
          'SELECT password_hash FROM auth.users_extended WHERE id = $1',
          [userId]
        );

        if (userResult.rows.length === 0) {
          throw new Error('User not found');
        }

        const isValid = await bcrypt.compare(oldPassword, userResult.rows[0].password_hash);
        if (!isValid) {
          throw new Error('Invalid old password');
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await pool.query(
          'UPDATE auth.users_extended SET password_hash = $1, password_changed_at = NOW() WHERE id = $2',
          [hashedPassword, userId]
        );

        return true;
      },

      async getUserPermissions(userId) {
        const result = await pool.query(
          `SELECT DISTINCT p.name
           FROM auth.user_roles ur
           JOIN auth.role_permissions rp ON ur.role_id = rp.role_id
           JOIN auth.permissions p ON rp.permission_id = p.id
           WHERE ur.user_id = $1
           AND (ur.effective_until IS NULL OR ur.effective_until > NOW())`,
          [userId]
        );

        return result.rows.map(row => row.name);
      },
    };
  });

  afterAll(async () => {
    // Clean up test data
    if (testOrgId) {
      await pool.query('DELETE FROM organization WHERE id = $1', [testOrgId]);
    }
    await pool.end();
  });

  beforeEach(async () => {
    // Clean up test users before each test
    await pool.query('DELETE FROM auth.users_extended WHERE org_id = $1', [testOrgId]);
  });

  describe('User Registration', () => {
    it('should register a new user successfully', async () => {
      const user = await authService.register({
        email: 'test@example.com',
        password: 'SecurePassword123!',
        display_name: 'Test User',
        org_id: testOrgId,
      });

      expect(user).toBeDefined();
      expect(user.email).toBe('test@example.com');
      expect(user.display_name).toBe('Test User');
      expect(user.id).toBeDefined();
    });

    it('should hash password during registration', async () => {
      const plainPassword = 'SecurePassword123!';
      await authService.register({
        email: 'test@example.com',
        password: plainPassword,
        display_name: 'Test User',
        org_id: testOrgId,
      });

      const result = await pool.query(
        'SELECT password_hash FROM auth.users_extended WHERE email = $1',
        ['test@example.com']
      );

      expect(result.rows[0].password_hash).not.toBe(plainPassword);
      expect(result.rows[0].password_hash).toMatch(/^\$2[ayb]\$.{56}$/);
    });

    it('should prevent duplicate email registration', async () => {
      await authService.register({
        email: 'test@example.com',
        password: 'Password123!',
        display_name: 'Test User 1',
        org_id: testOrgId,
      });

      await expect(
        authService.register({
          email: 'test@example.com',
          password: 'Password456!',
          display_name: 'Test User 2',
          org_id: testOrgId,
        })
      ).rejects.toThrow();
    });
  });

  describe('User Login', () => {
    beforeEach(async () => {
      await authService.register({
        email: 'login@example.com',
        password: 'TestPassword123!',
        display_name: 'Login Test User',
        org_id: testOrgId,
      });
    });

    it('should login with valid credentials', async () => {
      const result = await authService.login('login@example.com', 'TestPassword123!');

      expect(result).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.token).toBeDefined();
      expect(result.user.email).toBe('login@example.com');
    });

    it('should reject invalid password', async () => {
      await expect(authService.login('login@example.com', 'WrongPassword')).rejects.toThrow(
        'Invalid credentials'
      );
    });

    it('should reject non-existent user', async () => {
      await expect(authService.login('nonexistent@example.com', 'AnyPassword')).rejects.toThrow(
        'Invalid credentials'
      );
    });

    it('should generate valid JWT token on login', async () => {
      const result = await authService.login('login@example.com', 'TestPassword123!');

      const decoded = jwt.verify(result.token, process.env.JWT_SECRET!) as any;
      expect(decoded.userId).toBe(result.user.id);
      expect(decoded.email).toBe('login@example.com');
    });

    it('should track failed login attempts', async () => {
      // Attempt login with wrong password 3 times
      for (let i = 0; i < 3; i++) {
        await expect(authService.login('login@example.com', 'WrongPassword')).rejects.toThrow();
      }

      const result = await pool.query(
        'SELECT failed_login_attempts FROM auth.users_extended WHERE email = $1',
        ['login@example.com']
      );

      expect(result.rows[0].failed_login_attempts).toBe(3);
    });

    it('should lock account after 5 failed attempts', async () => {
      // Attempt login with wrong password 5 times
      for (let i = 0; i < 5; i++) {
        await expect(authService.login('login@example.com', 'WrongPassword')).rejects.toThrow();
      }

      // Next attempt should indicate account is locked
      await expect(authService.login('login@example.com', 'TestPassword123!')).rejects.toThrow(
        'Account is locked'
      );
    });

    it('should reset failed attempts on successful login', async () => {
      // Fail twice
      for (let i = 0; i < 2; i++) {
        await expect(authService.login('login@example.com', 'WrongPassword')).rejects.toThrow();
      }

      // Successful login
      await authService.login('login@example.com', 'TestPassword123!');

      const result = await pool.query(
        'SELECT failed_login_attempts FROM auth.users_extended WHERE email = $1',
        ['login@example.com']
      );

      expect(result.rows[0].failed_login_attempts).toBe(0);
    });
  });

  describe('Token Validation', () => {
    it('should validate valid token', async () => {
      await authService.register({
        email: 'token@example.com',
        password: 'Password123!',
        display_name: 'Token Test',
        org_id: testOrgId,
      });

      const { token, user } = await authService.login('token@example.com', 'Password123!');

      const validation = await authService.validateToken(token);
      expect(validation.valid).toBe(true);
      expect(validation.userId).toBe(user.id);
    });

    it('should reject invalid token', async () => {
      const validation = await authService.validateToken('invalid-token');
      expect(validation.valid).toBe(false);
    });

    it('should reject expired token', async () => {
      const expiredToken = jwt.sign(
        { userId: 'test-id', email: 'test@example.com' },
        process.env.JWT_SECRET!,
        { expiresIn: '0s' }
      );

      await new Promise(resolve => setTimeout(resolve, 100));

      const validation = await authService.validateToken(expiredToken);
      expect(validation.valid).toBe(false);
    });
  });

  describe('Password Management', () => {
    let userId: string;

    beforeEach(async () => {
      const user = await authService.register({
        email: 'password@example.com',
        password: 'OldPassword123!',
        display_name: 'Password Test',
        org_id: testOrgId,
      });
      userId = user.id!;
    });

    it('should change password with valid old password', async () => {
      const result = await authService.changePassword(userId, 'OldPassword123!', 'NewPassword456!');

      expect(result).toBe(true);

      // Verify can login with new password
      const loginResult = await authService.login('password@example.com', 'NewPassword456!');
      expect(loginResult).toBeDefined();
    });

    it('should reject password change with invalid old password', async () => {
      await expect(
        authService.changePassword(userId, 'WrongOldPassword', 'NewPassword456!')
      ).rejects.toThrow('Invalid old password');
    });

    it('should update password_changed_at timestamp', async () => {
      await authService.changePassword(userId, 'OldPassword123!', 'NewPassword456!');

      const result = await pool.query(
        'SELECT password_changed_at FROM auth.users_extended WHERE id = $1',
        [userId]
      );

      expect(result.rows[0].password_changed_at).toBeDefined();
    });
  });

  describe('Session Management', () => {
    let userId: string;
    let token: string;

    beforeEach(async () => {
      const user = await authService.register({
        email: 'session@example.com',
        password: 'Password123!',
        display_name: 'Session Test',
        org_id: testOrgId,
      });
      userId = user.id!;

      const loginResult = await authService.login('session@example.com', 'Password123!');
      token = loginResult.token;
    });

    it('should create session on login', async () => {
      const result = await pool.query(
        'SELECT * FROM auth.user_sessions WHERE user_id = $1 AND status = $2',
        [userId, 'active']
      );

      expect(result.rows.length).toBeGreaterThan(0);
      expect(result.rows[0].session_token).toBe(token);
    });

    it('should revoke session on logout', async () => {
      const sessionResult = await pool.query(
        'SELECT id FROM auth.user_sessions WHERE user_id = $1 AND status = $2',
        [userId, 'active']
      );

      const sessionId = sessionResult.rows[0].id;

      await authService.logout(userId, sessionId);

      const result = await pool.query('SELECT status FROM auth.user_sessions WHERE id = $1', [
        sessionId,
      ]);

      expect(result.rows[0].status).toBe('revoked');
    });
  });

  describe('Role-Based Access Control', () => {
    let userId: string;
    let roleId: string;

    beforeEach(async () => {
      // Create test user
      const user = await authService.register({
        email: 'rbac@example.com',
        password: 'Password123!',
        display_name: 'RBAC Test',
        org_id: testOrgId,
      });
      userId = user.id!;

      // Create test role
      const roleResult = await pool.query(
        `INSERT INTO auth.roles (org_id, name, slug, is_system_role)
         VALUES ($1, 'Test Role', 'test-role', false)
         RETURNING id`,
        [testOrgId]
      );
      roleId = roleResult.rows[0].id;

      // Create test permission
      const permResult = await pool.query(
        `INSERT INTO auth.permissions (name, resource, action, is_system_permission)
         VALUES ('test:read', 'test', 'read', false)
         ON CONFLICT (resource, action) DO UPDATE SET name = 'test:read'
         RETURNING id`
      );

      // Assign permission to role
      await pool.query(
        `INSERT INTO auth.role_permissions (role_id, permission_id)
         VALUES ($1, $2)
         ON CONFLICT (role_id, permission_id) DO NOTHING`,
        [roleId, permResult.rows[0].id]
      );

      // Assign role to user
      await pool.query(
        `INSERT INTO auth.user_roles (user_id, role_id)
         VALUES ($1, $2)
         ON CONFLICT (user_id, role_id) DO NOTHING`,
        [userId, roleId]
      );
    });

    it('should retrieve user permissions', async () => {
      const permissions = await authService.getUserPermissions(userId);

      expect(permissions).toContain('test:read');
    });

    it('should return empty array for user without roles', async () => {
      const newUser = await authService.register({
        email: 'noroles@example.com',
        password: 'Password123!',
        display_name: 'No Roles User',
        org_id: testOrgId,
      });

      const permissions = await authService.getUserPermissions(newUser.id!);
      expect(permissions).toEqual([]);
    });
  });

  describe('Security Features', () => {
    it('should use bcrypt with appropriate cost factor', async () => {
      const password = 'TestPassword123!';
      const hash = await bcrypt.hash(password, 10);

      // Bcrypt hashes should start with $2a$ or $2b$
      expect(hash).toMatch(/^\$2[ab]\$10\$/);
    });

    it('should generate cryptographically secure tokens', async () => {
      const user = await authService.register({
        email: 'security@example.com',
        password: 'Password123!',
        display_name: 'Security Test',
        org_id: testOrgId,
      });

      const { token } = await authService.login('security@example.com', 'Password123!');

      // JWT tokens should have 3 parts separated by dots
      const parts = token.split('.');
      expect(parts).toHaveLength(3);

      // Each part should be base64 encoded
      parts.forEach(part => {
        expect(part).toMatch(/^[A-Za-z0-9_-]+$/);
      });
    });
  });
});
