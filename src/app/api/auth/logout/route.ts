/**
 * Authentication API: Logout Endpoint
 *
 * POST /api/auth/logout
 * Revoke user session and clear cookies
 *
 * @module api/auth/logout
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { neonAuthService } from '@/lib/auth/neon-auth-service';

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
      // No session found, but still return success to allow client-side cleanup
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

    // Revoke session
    try {
      await neonAuthService.logout(sessionToken);
    } catch (error) {
      // Log error but don't fail - still clear cookie
      console.error('Logout session revocation error:', error);
    }

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

export const runtime = 'nodejs';


