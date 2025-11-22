import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { neonAuthService } from '@/lib/auth/neon-auth-service'
import { db } from '@/lib/database'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get session token
    let sessionToken = request.cookies.get('session_token')?.value

    if (!sessionToken) {
      const authHeader = request.headers.get('authorization')
      if (authHeader?.startsWith('Bearer ')) {
        sessionToken = authHeader.substring(7)
      }
    }

    if (!sessionToken) {
      return NextResponse.json(
        {
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
        { status: 401 }
      )
    }

    // Verify session and get user
    const user = await neonAuthService.verifySession(sessionToken)

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_SESSION',
          message: 'Invalid or expired session',
        },
        { status: 401 }
      )
    }

    // Check admin permissions
    const isAdmin = user.roles.some(
      (r) => r.slug === 'admin' || r.slug === 'super_admin' || r.level >= 90
    )

    if (!isAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: 'FORBIDDEN',
          message: 'Admin access required',
        },
        { status: 403 }
      )
    }

    const userId = params.id

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
        o.name as org_name,
        u.department,
        u.job_title,
        u.is_active,
        u.is_suspended,
        u.two_factor_enabled,
        u.created_at,
        u.last_login_at,
        u.last_activity_at,
        COALESCE(
          array_agg(DISTINCT jsonb_build_object(
            'id', r.id,
            'name', r.name,
            'slug', r.slug,
            'level', r.role_level
          )) FILTER (WHERE r.id IS NOT NULL),
          ARRAY[]::jsonb[]
        ) as roles
      FROM auth.users_extended u
      JOIN organization o ON u.org_id = o.id
      LEFT JOIN auth.user_roles ur ON u.id = ur.user_id
        AND (ur.effective_until IS NULL OR ur.effective_until > NOW())
      LEFT JOIN auth.roles r ON ur.role_id = r.id AND r.is_active = TRUE
      WHERE u.id = $1 AND u.org_id = $2
      GROUP BY u.id, o.id, o.name
    `,
      [userId, user.orgId]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'NOT_FOUND',
          message: 'User not found',
        },
        { status: 404 }
      )
    }

    const row = result.rows[0]

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
          orgName: row.org_name,
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
    )
  } catch (error) {
    console.error('Get user API error:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get session token
    let sessionToken = request.cookies.get('session_token')?.value

    if (!sessionToken) {
      const authHeader = request.headers.get('authorization')
      if (authHeader?.startsWith('Bearer ')) {
        sessionToken = authHeader.substring(7)
      }
    }

    if (!sessionToken) {
      return NextResponse.json(
        {
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
        { status: 401 }
      )
    }

    // Verify session and get user
    const user = await neonAuthService.verifySession(sessionToken)

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_SESSION',
          message: 'Invalid or expired session',
        },
        { status: 401 }
      )
    }

    // Check admin permissions
    const isAdmin = user.roles.some(
      (r) => r.slug === 'admin' || r.slug === 'super_admin' || r.level >= 90
    )

    if (!isAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: 'FORBIDDEN',
          message: 'Admin access required',
        },
        { status: 403 }
      )
    }

    const userId = params.id
    const body = await request.json()

    // Update user using auth provider
    const { authProvider } = await import('@/lib/auth/mock-provider')
    await authProvider.updateUser(userId, body as any)

    return NextResponse.json(
      {
        success: true,
        message: 'User updated successfully',
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Update user API error:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'SERVER_ERROR',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get session token
    let sessionToken = request.cookies.get('session_token')?.value

    if (!sessionToken) {
      const authHeader = request.headers.get('authorization')
      if (authHeader?.startsWith('Bearer ')) {
        sessionToken = authHeader.substring(7)
      }
    }

    if (!sessionToken) {
      return NextResponse.json(
        {
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
        { status: 401 }
      )
    }

    // Verify session and get user
    const user = await neonAuthService.verifySession(sessionToken)

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_SESSION',
          message: 'Invalid or expired session',
        },
        { status: 401 }
      )
    }

    // Check admin permissions
    const isAdmin = user.roles.some(
      (r) => r.slug === 'admin' || r.slug === 'super_admin' || r.level >= 90
    )

    if (!isAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: 'FORBIDDEN',
          message: 'Admin access required',
        },
        { status: 403 }
      )
    }

    const userId = params.id

    // Don't allow deleting yourself
    if (userId === user.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_OPERATION',
          message: 'Cannot delete your own account',
        },
        { status: 400 }
      )
    }

    // Soft delete user (set is_active = false)
    await db.query(
      `
      UPDATE auth.users_extended
      SET is_active = FALSE, updated_at = NOW()
      WHERE id = $1
    `,
      [userId]
    )

    return NextResponse.json(
      {
        success: true,
        message: 'User deleted successfully',
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Delete user API error:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
      { status: 500 }
    )
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

