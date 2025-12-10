import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { verifyAuth, isAdmin } from '@/lib/auth/auth-helper';
import { getOrCreateRole } from '@/lib/auth/ensure-roles';
import { getEmailService } from '@/lib/services/EmailService';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const user = await verifyAuth(request);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
        { status: 401 }
      );
    }

    // Check admin permissions
    if (!isAdmin(user)) {
      return NextResponse.json(
        {
          success: false,
          error: 'FORBIDDEN',
          message: 'Admin access required',
        },
        { status: 403 }
      );
    }

    // Check if user is super admin (can see all users)
    const isSuperAdmin = user.roles.some(r => r.slug === 'super_admin' || r.level >= 90);

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role');
    const department = searchParams.get('department');
    const status = searchParams.get('status');

    // Build query
    let query = `
      SELECT 
        u.id,
        u.email,
        u.display_name,
        u.first_name,
        u.last_name,
        u.phone,
        u.mobile,
        u.department,
        u.job_title,
        u.is_active,
        u.two_factor_enabled,
        u.email_verified,
        u.created_at,
        u.last_login_at,
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
        ) as roles
      FROM auth.users_extended u
      LEFT JOIN auth.user_roles ur ON u.id = ur.user_id
        AND (ur.effective_until IS NULL OR ur.effective_until > NOW())
      LEFT JOIN auth.roles r ON ur.role_id = r.id AND r.is_active = TRUE
      WHERE 1=1
    `;
    const queryParams: unknown[] = [];
    let paramIndex = 1;

    // Filter by org_id unless super admin
    if (!isSuperAdmin && user.orgId) {
      query += ` AND u.org_id = $${paramIndex}`;
      queryParams.push(user.orgId);
      paramIndex++;
    }

    if (search) {
      query += ` AND (
        u.display_name ILIKE $${paramIndex} OR
        u.email ILIKE $${paramIndex} OR
        u.department ILIKE $${paramIndex}
      )`;
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    if (role) {
      query += ` AND EXISTS (
        SELECT 1 FROM auth.user_roles ur2
        JOIN auth.roles r2 ON ur2.role_id = r2.id
        WHERE ur2.user_id = u.id
          AND r2.slug = $${paramIndex}
          AND (ur2.effective_until IS NULL OR ur2.effective_until > NOW())
      )`;
      queryParams.push(role);
      paramIndex++;
    }

    if (department) {
      query += ` AND u.department = $${paramIndex}`;
      queryParams.push(department);
      paramIndex++;
    }

    if (status === 'active') {
      query += ` AND u.is_active = TRUE`;
    } else if (status === 'inactive') {
      query += ` AND u.is_active = FALSE`;
    }

    query += ` GROUP BY u.id, u.email, u.display_name, u.first_name, u.last_name, u.phone, u.mobile, u.department, u.job_title, u.is_active, u.two_factor_enabled, u.email_verified, u.created_at, u.last_login_at`;
    query += ` ORDER BY u.created_at DESC`;
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(limit, offset);

    const result = await db.query(query, queryParams);

    // Get total count
    let countQuery = `
      SELECT COUNT(DISTINCT u.id) as total
      FROM auth.users_extended u
      WHERE 1=1
    `;
    const countParams: unknown[] = [];
    let countParamIndex = 1;

    // Filter by org_id unless super admin
    if (!isSuperAdmin && user.orgId) {
      countQuery += ` AND u.org_id = $${countParamIndex}`;
      countParams.push(user.orgId);
      countParamIndex++;
    }

    if (search) {
      countQuery += ` AND (
        u.display_name ILIKE $${countParamIndex} OR
        u.email ILIKE $${countParamIndex} OR
        u.department ILIKE $${countParamIndex}
      )`;
      countParams.push(`%${search}%`);
      countParamIndex++;
    }

    if (role) {
      countQuery += ` AND EXISTS (
        SELECT 1 FROM auth.user_roles ur2
        JOIN auth.roles r2 ON ur2.role_id = r2.id
        WHERE ur2.user_id = u.id
          AND r2.slug = $${countParamIndex}
          AND (ur2.effective_until IS NULL OR ur2.effective_until > NOW())
      )`;
      countParams.push(role);
      countParamIndex++;
    }

    if (department) {
      countQuery += ` AND u.department = $${countParamIndex}`;
      countParams.push(department);
      countParamIndex++;
    }

    if (status === 'active') {
      countQuery += ` AND u.is_active = TRUE`;
    } else if (status === 'inactive') {
      countQuery += ` AND u.is_active = FALSE`;
    }

    const countResult = await db.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0]?.total || '0');

    return NextResponse.json(
      {
        success: true,
        data: result.rows.map(row => ({
          id: row.id,
          email: row.email,
          name: row.display_name,
          firstName: row.first_name,
          lastName: row.last_name,
          phone: row.phone,
          mobile: row.mobile,
          department: row.department,
          jobTitle: row.job_title,
          isActive: row.is_active,
          twoFactorEnabled: row.two_factor_enabled,
          emailVerified: row.email_verified,
          createdAt: row.created_at,
          lastLoginAt: row.last_login_at,
          roles: Array.isArray(row.roles) ? row.roles : [],
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('List users API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('List users API error details:', { errorMessage, errorStack });

    return NextResponse.json(
      {
        success: false,
        error: 'SERVER_ERROR',
        message: errorMessage,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const user = await verifyAuth(request);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
        { status: 401 }
      );
    }

    // Check admin permissions
    if (!isAdmin(user)) {
      return NextResponse.json(
        {
          success: false,
          error: 'FORBIDDEN',
          message: 'Admin access required',
        },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    console.log('[CreateUser] Received body:', JSON.stringify(body, null, 2));

    const {
      email,
      firstName,
      lastName,
      displayName,
      password,
      phone,
      mobile,
      department,
      jobTitle,
      role,
      sendInvitation,
    } = body;

    console.log('[CreateUser] Parsed fields:', {
      email,
      firstName,
      lastName,
      displayName,
      phone,
      mobile,
      department,
      jobTitle,
      role,
      sendInvitation,
    });

    if (!email || !displayName) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Email and display name are required',
        },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingUser = await db.query(`SELECT id FROM auth.users_extended WHERE email = $1`, [
      email,
    ]);

    if (existingUser.rows.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'EMAIL_EXISTS',
          message: 'A user with this email already exists',
        },
        { status: 409 }
      );
    }

    // Hash password if provided, otherwise generate temporary password
    const bcrypt = await import('bcryptjs');
    const crypto = await import('node:crypto');
    const tempPassword = password || crypto.randomBytes(16).toString('hex');
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    // Insert user into database
    const insertParams = [
      email,
      passwordHash,
      displayName,
      firstName || null,
      lastName || null,
      phone || null,
      mobile || null,
      department || null,
      jobTitle || null,
      user.orgId || null,
      !sendInvitation, // If sending invitation, email not verified yet
    ];
    console.log('[CreateUser] Insert params:', insertParams);

    const insertResult = await db.query(
      `
      INSERT INTO auth.users_extended (
        email,
        password_hash,
        display_name,
        first_name,
        last_name,
        phone,
        mobile,
        department,
        job_title,
        org_id,
        is_active,
        email_verified,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, $11, NOW(), NOW())
      RETURNING id, email, display_name, first_name, last_name, department, job_title, created_at
      `,
      insertParams
    );

    const newUser = insertResult.rows[0];
    console.log('[CreateUser] Created user:', newUser);

    // Assign role to user
    const roleSlug = role || 'user';
    console.log('[CreateUser] Looking for role:', roleSlug, 'in org:', user.orgId);

    // Use getOrCreateRole to ensure the role exists
    const roleId = await getOrCreateRole(
      user.orgId || 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      roleSlug
    );

    if (roleId) {
      console.log('[CreateUser] Found/created role:', roleId);
      await db.query(
        `
        INSERT INTO auth.user_roles (user_id, role_id, assigned_by, assigned_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (user_id, role_id) DO NOTHING
        `,
        [newUser.id, roleId, user.id]
      );
      console.log('[CreateUser] Role assigned successfully');
    } else {
      console.warn(
        '[CreateUser] Could not find or create role with slug:',
        roleSlug,
        '- user created without role'
      );
    }

    // Send invitation email if requested
    let emailSent = false;
    if (sendInvitation) {
      const orgId = user.orgId || 'default';
      const emailService = getEmailService(orgId);

      const isConfigured = await emailService.isConfigured();
      if (isConfigured) {
        const emailResult = await emailService.sendInvitation({
          email: newUser.email,
          name: displayName,
          inviterName: user.displayName || user.email || 'An administrator',
          tempPassword: password ? undefined : tempPassword, // Only include temp password if auto-generated
          setupUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/login`,
          role: roleSlug,
        });

        if (emailResult.success) {
          emailSent = true;
          console.log(`[CreateUser] Invitation email sent to ${email} via ${emailResult.provider}`);
        } else {
          console.error('[CreateUser] Failed to send invitation email:', emailResult.error);
        }
      } else {
        console.warn('[CreateUser] Email service not configured. Temp password:', tempPassword);
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: sendInvitation
          ? emailSent
            ? 'User created and invitation sent'
            : 'User created but invitation email could not be sent'
          : 'User created successfully',
        data: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.display_name,
          firstName: newUser.first_name,
          lastName: newUser.last_name,
          role: roleSlug,
          department: newUser.department,
          jobTitle: newUser.job_title,
          createdAt: newUser.created_at,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create user API error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'SERVER_ERROR',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
