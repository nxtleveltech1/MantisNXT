import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { neonAuthService } from '@/lib/auth/neon-auth-service'
import { db } from '@/lib/database'

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

    const sessionId = params.id

    // Verify the session belongs to the user
    const sessionCheck = await db.query(
      `
      SELECT id, session_token
      FROM auth.user_sessions
      WHERE id = $1 AND user_id = $2
    `,
      [sessionId, user.id]
    )

    if (sessionCheck.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'NOT_FOUND',
          message: 'Session not found',
        },
        { status: 404 }
      )
    }

    // Don't allow revoking the current session
    if (sessionCheck.rows[0].session_token === sessionToken) {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_OPERATION',
          message: 'Cannot revoke your current session',
        },
        { status: 400 }
      )
    }

    // Revoke the session
    await db.query(
      `
      UPDATE auth.user_sessions
      SET status = 'revoked', updated_at = NOW()
      WHERE id = $1
    `,
      [sessionId]
    )

    return NextResponse.json(
      {
        success: true,
        message: 'Session revoked successfully',
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Revoke session API error:', error)

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

