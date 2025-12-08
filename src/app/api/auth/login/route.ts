import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { sign as signJwt, verify as verifyJwt } from 'jsonwebtoken';
import type { JwtPayload, SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/database';

// Validation schema
const LoginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(3, 'Password must be at least 3 characters'),
  remember_me: z.boolean().default(false),
  two_factor_code: z.string().optional(),
});

// JWT secret - allow a harmless placeholder only during static build so Vercel can compile
const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';
const rawJwtSecret =
  process.env.JWT_SECRET || (isBuildPhase ? 'build-placeholder-secret' : undefined);
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

if (!rawJwtSecret) {
  throw new Error('JWT_SECRET environment variable is required for authentication');
}

const JWT_SECRET: string = rawJwtSecret;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validatedData = LoginSchema.parse(body);
    const { email, password, remember_me, two_factor_code } = validatedData;

    // Query user from database
    const userResult = await db.query(
      `
      SELECT
        u.id,
        u.email,
        u.password_hash,
        u.display_name as name,
        u.first_name,
        u.last_name,
        u.org_id,
        u.department,
        u.job_title,
        u.is_active,
        u.is_suspended,
        u.two_factor_enabled,
        u.email_verified,
        u.last_login_at,
        u.failed_login_attempts,
        u.locked_until,
        o.name as org_name,
        COALESCE(
          array_agg(DISTINCT r.slug) FILTER (WHERE r.slug IS NOT NULL),
          ARRAY[]::text[]
        ) as roles,
        COALESCE(
          array_agg(DISTINCT perm.name) FILTER (WHERE perm.name IS NOT NULL),
          ARRAY[]::text[]
        ) as permissions
      FROM auth.users_extended u
      JOIN organization o ON u.org_id = o.id
      LEFT JOIN auth.user_roles ur ON u.id = ur.user_id
        AND (ur.effective_until IS NULL OR ur.effective_until > NOW())
      LEFT JOIN auth.roles r ON ur.role_id = r.id AND r.is_active = TRUE
      LEFT JOIN auth.role_permissions rp ON r.id = rp.role_id
      LEFT JOIN auth.permissions perm ON rp.permission_id = perm.id
      WHERE u.email = $1
      GROUP BY u.id, o.id, o.name
      `,
      [email]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid email or password',
          error: 'INVALID_CREDENTIALS',
        },
        { status: 401 }
      );
    }

    const user = userResult.rows[0];

    // Check if account is locked
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      return NextResponse.json(
        {
          success: false,
          message: `Account locked until ${new Date(user.locked_until).toLocaleTimeString()}`,
          error: 'ACCOUNT_LOCKED',
        },
        { status: 401 }
      );
    }

    // Check if user is active
    if (!user.is_active || user.is_suspended) {
      return NextResponse.json(
        {
          success: false,
          message: 'Account is disabled or suspended',
          error: 'ACCOUNT_DISABLED',
        },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash || '');
    if (!isValidPassword) {
      // Record failed login attempt
      const failedAttempts = (user.failed_login_attempts || 0) + 1;
      const lockUntil = failedAttempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null; // 15 min lockout

      await db.query(
        `
        UPDATE auth.users_extended
        SET failed_login_attempts = $1, locked_until = $2
        WHERE id = $3
        `,
        [failedAttempts, lockUntil, user.id]
      );

      const remaining = 5 - failedAttempts;
      const message =
        remaining > 0
          ? `Invalid email or password. ${remaining} attempts remaining.`
          : 'Account locked due to too many failed attempts.';

      return NextResponse.json(
        {
          success: false,
          message,
          error: 'INVALID_CREDENTIALS',
        },
        { status: 401 }
      );
    }

    // Check 2FA if enabled
    if (user.two_factor_enabled && !two_factor_code) {
      return NextResponse.json(
        {
          success: false,
          message: 'Two-factor authentication required',
          error: 'TWO_FACTOR_REQUIRED',
          requires_two_factor: true,
          two_factor_token: 'temp_2fa_token_' + user.id,
        },
        { status: 200 }
      );
    }

    // TODO: Verify 2FA code if provided
    // if (user.two_factor_enabled && two_factor_code) { ... }

    // Reset failed login attempts and update last login
    await db.query(
      `
      UPDATE auth.users_extended
      SET failed_login_attempts = 0, locked_until = NULL, last_login_at = NOW()
      WHERE id = $1
      `,
      [user.id]
    );

    // Determine primary role
    const primaryRole = user.roles.includes('super_admin')
      ? 'super_admin'
      : user.roles.includes('admin')
        ? 'admin'
        : user.roles.includes('manager')
          ? 'manager'
          : user.roles.includes('user')
            ? 'user'
            : 'viewer';

    // Generate JWT token
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: primaryRole,
      roles: user.roles,
      permissions: user.permissions,
      organizationId: user.org_id,
    };

    const signOptions: SignOptions = {
      expiresIn: (remember_me ? '30d' : JWT_EXPIRES_IN) as SignOptions['expiresIn'],
    };

    const token = signJwt(tokenPayload as Record<string, unknown>, JWT_SECRET, signOptions);

    // Return success response
    return NextResponse.json(
      {
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            firstName: user.first_name,
            lastName: user.last_name,
            role: primaryRole,
            roles: user.roles,
            permissions: user.permissions,
            organizationId: user.org_id,
            organization: user.org_name,
            department: user.department,
            jobTitle: user.job_title,
            emailVerified: user.email_verified,
            twoFactorEnabled: user.two_factor_enabled,
            lastLogin: new Date(),
          },
          token,
          expiresIn: remember_me ? '30d' : JWT_EXPIRES_IN,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Login error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid input data',
          error: 'VALIDATION_ERROR',
          details: error.issues,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: 'Login failed due to server error',
        error: 'SERVER_ERROR',
      },
      { status: 500 }
    );
  }
}

// GET endpoint for checking authentication status
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: 'No authentication token provided',
          error: 'NO_TOKEN',
        },
        { status: 401 }
      );
    }

    try {
      const decoded = verifyJwt(token, JWT_SECRET) as JwtPayload;

      // Query user from database
      const userResult = await db.query(
        `
        SELECT
          u.id,
          u.email,
          u.display_name as name,
          u.first_name,
          u.last_name,
          u.org_id,
          u.department,
          u.job_title,
          u.is_active,
          u.is_suspended,
          u.two_factor_enabled,
          u.email_verified,
          u.last_login_at,
          o.name as org_name,
          COALESCE(
            array_agg(DISTINCT r.slug) FILTER (WHERE r.slug IS NOT NULL),
            ARRAY[]::text[]
          ) as roles,
          COALESCE(
            array_agg(DISTINCT perm.name) FILTER (WHERE perm.name IS NOT NULL),
            ARRAY[]::text[]
          ) as permissions
        FROM auth.users_extended u
        JOIN organization o ON u.org_id = o.id
        LEFT JOIN auth.user_roles ur ON u.id = ur.user_id
          AND (ur.effective_until IS NULL OR ur.effective_until > NOW())
        LEFT JOIN auth.roles r ON ur.role_id = r.id AND r.is_active = TRUE
        LEFT JOIN auth.role_permissions rp ON r.id = rp.role_id
        LEFT JOIN auth.permissions perm ON rp.permission_id = perm.id
        WHERE u.id = $1
        GROUP BY u.id, o.id, o.name
        `,
        [decoded.userId]
      );

      if (userResult.rows.length === 0 || !userResult.rows[0].is_active) {
        return NextResponse.json(
          {
            success: false,
            message: 'User not found or inactive',
            error: 'USER_NOT_FOUND',
          },
          { status: 401 }
        );
      }

      const user = userResult.rows[0];
      const primaryRole = user.roles.includes('super_admin')
        ? 'super_admin'
        : user.roles.includes('admin')
          ? 'admin'
          : user.roles.includes('manager')
            ? 'manager'
            : user.roles.includes('user')
              ? 'user'
              : 'viewer';

      return NextResponse.json({
        success: true,
        message: 'Authentication valid',
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            firstName: user.first_name,
            lastName: user.last_name,
            role: primaryRole,
            roles: user.roles,
            permissions: user.permissions,
            organizationId: user.org_id,
            organization: user.org_name,
            department: user.department,
            jobTitle: user.job_title,
            emailVerified: user.email_verified,
            twoFactorEnabled: user.two_factor_enabled,
            lastLogin: user.last_login_at,
          },
        },
      });
    } catch (jwtError) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid or expired token',
          error: 'INVALID_TOKEN',
        },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Authentication check failed',
        error: 'SERVER_ERROR',
      },
      { status: 500 }
    );
  }
}
