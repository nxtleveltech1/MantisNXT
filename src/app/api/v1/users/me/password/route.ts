import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { neonAuthService } from '@/lib/auth/neon-auth-service'

export async function PUT(request: NextRequest) {
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

    // Parse request body
    const body = await request.json()
    const { currentPassword, newPassword } = body

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Current password and new password are required',
        },
        { status: 400 }
      )
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Password must be at least 8 characters long',
        },
        { status: 400 }
      )
    }

    // Change password using auth provider
    const { authProvider } = await import('@/lib/auth/mock-provider')
    await authProvider.changePassword(currentPassword, newPassword)

    return NextResponse.json(
      {
        success: true,
        message: 'Password changed successfully',
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Change password API error:', error)

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

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

