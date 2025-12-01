import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { neonAuthService } from '@/lib/auth/neon-auth-service';
import { db } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    // Get session token
    let sessionToken = request.cookies.get('session_token')?.value;

    if (!sessionToken) {
      const authHeader = request.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        sessionToken = authHeader.substring(7);
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
      );
    }

    // Verify session and get user
    const user = await neonAuthService.verifySession(sessionToken);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_SESSION',
          message: 'Invalid or expired session',
        },
        { status: 401 }
      );
    }

    // Get active sessions from database
    const result = await db.query(
      `
      SELECT 
        id,
        session_token,
        device_info,
        ip_address,
        user_agent,
        location,
        status,
        created_at,
        last_activity_at,
        expires_at
      FROM auth.user_sessions
      WHERE user_id = $1
        AND status = 'active'
        AND (expires_at IS NULL OR expires_at > NOW())
      ORDER BY last_activity_at DESC
    `,
      [user.id]
    );

    return NextResponse.json(
      {
        success: true,
        data: result.rows.map(row => ({
          id: row.id,
          deviceInfo: row.device_info,
          ipAddress: row.ip_address,
          userAgent: row.user_agent,
          location: row.location,
          status: row.status,
          createdAt: row.created_at,
          lastActivityAt: row.last_activity_at,
          expiresAt: row.expires_at,
          isCurrent: row.session_token === sessionToken,
        })),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get sessions API error:', error);

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
