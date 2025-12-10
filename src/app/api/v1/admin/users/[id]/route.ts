import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { verifyAuth, isAdmin } from '@/lib/auth/auth-helper';
import { getOrCreateRole } from '@/lib/auth/ensure-roles';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Await params (Next.js 15 requirement)
    const { id: userId } = await params;

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

    // Get user details
    const result = await db.query(
      `
      SELECT 
        u.id,
        u.email,
        u.email_verified,
        u.first_name,
        u.last_name,
        u.display_name,
        u.avatar_url,
        u.phone,
        u.mobile,
        u.org_id,
        u.department,
        u.job_title,
        u.is_active,
        u.is_suspended,
        u.two_factor_enabled,
        u.created_at,
        u.last_login_at,
        u.last_activity_at,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', r.id,
              'name', r.name,
              'slug', r.slug,
              'level', COALESCE(r.role_level, 0)
            )
          ) FILTER (WHERE r.id IS NOT NULL),
          '[]'::json
        ) as roles
      FROM auth.users_extended u
      LEFT JOIN auth.user_roles ur ON u.id = ur.user_id
        AND (ur.effective_until IS NULL OR ur.effective_until > NOW())
      LEFT JOIN auth.roles r ON ur.role_id = r.id AND r.is_active = TRUE
      WHERE u.id = $1
      GROUP BY u.id, u.email, u.email_verified, u.first_name, u.last_name, u.display_name, u.avatar_url, u.phone, u.mobile, u.org_id, u.department, u.job_title, u.is_active, u.is_suspended, u.two_factor_enabled, u.created_at, u.last_login_at, u.last_activity_at
    `,
      [userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'NOT_FOUND',
          message: 'User not found',
        },
        { status: 404 }
      );
    }

    const row = result.rows[0];

    return NextResponse.json(
      {
        success: true,
        data: {
          id: row.id,
          email: row.email,
          emailVerified: row.email_verified,
          firstName: row.first_name,
          lastName: row.last_name,
          displayName: row.display_name,
          avatarUrl: row.avatar_url,
          phone: row.phone,
          mobile: row.mobile,
          orgId: row.org_id,
          department: row.department,
          jobTitle: row.job_title,
          isActive: row.is_active,
          isSuspended: row.is_suspended,
          twoFactorEnabled: row.two_factor_enabled,
          createdAt: row.created_at,
          lastLoginAt: row.last_login_at,
          lastActivityAt: row.last_activity_at,
          roles: row.roles || [],
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get user API error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Await params (Next.js 15 requirement)
    const { id: userId } = await params;

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
    const body = await request.json();
    console.log('[UpdateUser] Received body:', JSON.stringify(body, null, 2));

    const {
      firstName,
      lastName,
      displayName,
      phone,
      mobile,
      department,
      jobTitle,
      isActive,
      role,
    } = body;

    console.log('[UpdateUser] Parsed fields:', {
      userId,
      firstName,
      lastName,
      displayName,
      phone,
      mobile,
      department,
      jobTitle,
      isActive,
      role,
    });

    // Update user in database
    await db.query(
      `
      UPDATE auth.users_extended
      SET
        first_name = COALESCE($1, first_name),
        last_name = COALESCE($2, last_name),
        display_name = COALESCE($3, display_name),
        phone = COALESCE($4, phone),
        mobile = COALESCE($5, mobile),
        department = COALESCE($6, department),
        job_title = COALESCE($7, job_title),
        is_active = COALESCE($8, is_active),
        updated_at = NOW()
      WHERE id = $9
      `,
      [
        firstName || null,
        lastName || null,
        displayName || null,
        phone || null,
        mobile || null,
        department || null,
        jobTitle || null,
        isActive !== undefined ? isActive : null,
        userId,
      ]
    );

    // Update role if provided
    if (role) {
      console.log('[UpdateUser] Looking for role:', role, 'in org:', user.orgId);

      // Use getOrCreateRole to ensure the role exists
      const roleId = await getOrCreateRole(
        user.orgId || 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        role
      );

      if (roleId) {
        console.log('[UpdateUser] Found/created role:', roleId);
        // Remove existing roles
        await db.query(`DELETE FROM auth.user_roles WHERE user_id = $1`, [userId]);

        // Assign new role
        await db.query(
          `
          INSERT INTO auth.user_roles (user_id, role_id, assigned_by, assigned_at)
          VALUES ($1, $2, $3, NOW())
          ON CONFLICT (user_id, role_id) DO NOTHING
          `,
          [userId, roleId, user.id]
        );
        console.log('[UpdateUser] Role updated successfully');
      } else {
        console.warn(
          '[UpdateUser] Could not find or create role with slug:',
          role,
          '- role not updated'
        );
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: 'User updated successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Update user API error:', error);

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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params (Next.js 15 requirement)
    const { id: userId } = await params;

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

    // Don't allow deleting yourself
    if (userId === user.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_OPERATION',
          message: 'Cannot delete your own account',
        },
        { status: 400 }
      );
    }

    // Soft delete user (set is_active = false)
    await db.query(
      `
      UPDATE auth.users_extended
      SET is_active = FALSE, updated_at = NOW()
      WHERE id = $1
    `,
      [userId]
    );

    return NextResponse.json(
      {
        success: true,
        message: 'User deleted successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Delete user API error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
