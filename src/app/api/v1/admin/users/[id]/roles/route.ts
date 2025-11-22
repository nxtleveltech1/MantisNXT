import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { neonAuthService } from '@/lib/auth/neon-auth-service'
import { db } from '@/lib/database'

export async function POST(
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
    const { roleId, effectiveFrom, effectiveTo } = body

    if (!roleId) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Role ID is required',
        },
        { status: 400 }
      )
    }

    // Verify role exists
    const roleCheck = await db.query(
      `
      SELECT id FROM auth.roles
      WHERE id = $1 AND org_id = $2 AND is_active = TRUE
    `,
      [roleId, user.orgId]
    )

    if (roleCheck.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'NOT_FOUND',
          message: 'Role not found',
        },
        { status: 404 }
      )
    }

    // Assign role to user
    await db.query(
      `
      INSERT INTO auth.user_roles (user_id, role_id, effective_from, effective_until)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, role_id) DO UPDATE SET
        effective_from = EXCLUDED.effective_from,
        effective_until = EXCLUDED.effective_until,
        updated_at = NOW()
    `,
      [
        userId,
        roleId,
        effectiveFrom ? new Date(effectiveFrom) : new Date(),
        effectiveTo ? new Date(effectiveTo) : null,
      ]
    )

    return NextResponse.json(
      {
        success: true,
        message: 'Role assigned successfully',
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Assign role API error:', error)

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

