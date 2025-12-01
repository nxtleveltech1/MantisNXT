/**
 * Authentication API: Logout Endpoint
 *
 * POST /api/v1/auth/logout
 * Revoke user session and clear cookies
 *
 * @module api/v1/auth/logout
 * @author AS Team (Auth & Security)
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { neonAuthService } from '@/lib/auth/neon-auth-service';

// ============================================================================
// API HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // Get session token from cookie or Authorization header
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
          error: 'NO_SESSION',
          message: 'No active session found',
        },
        { status: 400 }
      );
    }

    // Revoke session
    await neonAuthService.logout(sessionToken);

    // Clear session cookie
    const response = NextResponse.json(
      {
        success: true,
        message: 'Logged out successfully',
      },
      { status: 200 }
    );

    response.cookies.delete('session_token');

    return response;
  } catch (error) {
    console.error('Logout API error:', error);

    // Still clear cookie even if logout fails
    const response = NextResponse.json(
      {
        success: true,
        message: 'Logged out successfully',
      },
      { status: 200 }
    );

    response.cookies.delete('session_token');

    return response;
  }
}

// ============================================================================
// API METADATA
// ============================================================================

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
