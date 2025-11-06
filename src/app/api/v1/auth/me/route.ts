/**
 * Authentication API: Current User Endpoint
 *
 * GET /api/v1/auth/me
 * Get current authenticated user information
 *
 * @module api/v1/auth/me
 * @author AS Team (Auth & Security)
 */

import { NextRequest, NextResponse } from 'next/server'
import { neonAuthService } from '@/lib/auth/neon-auth-service'

// ============================================================================
// API HANDLER
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    // Get session token from cookie or Authorization header
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
          message: 'Authentication required'
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
          message: 'Invalid or expired session'
        },
        { status: 401 }
      )
    }

    // Return user information
    return NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          emailVerified: user.emailVerified,
          firstName: user.firstName,
          lastName: user.lastName,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          phone: user.phone,
          mobile: user.mobile,

          // Organization
          orgId: user.orgId,
          orgName: user.orgName,
          department: user.department,
          jobTitle: user.jobTitle,

          // Roles and permissions
          roles: user.roles.map(r => ({
            id: r.id,
            name: r.name,
            slug: r.slug,
            level: r.level
          })),
          permissions: user.permissions.map(p => p.name),

          // Status
          isActive: user.isActive,
          isSuspended: user.isSuspended,
          twoFactorEnabled: user.twoFactorEnabled,

          // Activity
          lastLoginAt: user.lastLoginAt,
          lastActivityAt: user.lastActivityAt,

          // Preferences
          preferences: user.preferences
        }
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('Get current user API error:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'SERVER_ERROR',
        message: 'An unexpected error occurred'
      },
      { status: 500 }
    )
  }
}

// ============================================================================
// API METADATA
// ============================================================================

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
