import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { neonAuthService } from '@/lib/auth/neon-auth-service';

export async function GET(request: NextRequest) {
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

    // Return user information
    return NextResponse.json(
      {
        success: true,
        data: {
          id: user.id,
          email: user.email,
          emailVerified: user.emailVerified,
          firstName: user.firstName,
          lastName: user.lastName,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          phone: user.phone,
          mobile: user.mobile,
          orgId: user.orgId,
          orgName: user.orgName,
          department: user.department,
          jobTitle: user.jobTitle,
          roles: user.roles,
          permissions: user.permissions,
          isActive: user.isActive,
          isSuspended: user.isSuspended,
          twoFactorEnabled: user.twoFactorEnabled,
          lastLoginAt: user.lastLoginAt,
          lastActivityAt: user.lastActivityAt,
          preferences: user.preferences,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get current user API error:', error);

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

export async function PUT(request: NextRequest) {
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

    // Parse request body
    const body = await request.json();
    const { firstName, lastName, displayName, phone, mobile, department, jobTitle } = body;

    // Update user profile
    // In production, this would update the database
    // For now, we'll use the mock provider
    const { authProvider } = await import('@/lib/auth/mock-provider');
    await authProvider.updateProfile({
      id: user.id,
      name: displayName || `${firstName} ${lastName}`.trim(),
      phone,
      mobile,
      department,
    } as any);

    return NextResponse.json(
      {
        success: true,
        message: 'Profile updated successfully',
        data: {
          id: user.id,
          displayName: displayName || user.displayName,
          phone: phone || user.phone,
          mobile: mobile || user.mobile,
          department: department || user.department,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Update user profile API error:', error);

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
