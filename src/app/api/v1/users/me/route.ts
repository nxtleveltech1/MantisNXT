import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/auth-helper';
import { db } from '@/lib/database';
import { syncUserProfileToClerk } from '@/lib/auth/clerk-sync';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication using Clerk
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

    // Get full user data from database
    const userResult = await db.query(
      `
      SELECT 
        u.id,
        u.clerk_id,
        u.email,
        u.first_name,
        u.last_name,
        u.display_name,
        u.avatar_url,
        u.phone,
        u.mobile,
        u.department,
        u.job_title,
        u.org_id,
        u.email_verified,
        u.two_factor_enabled,
        u.is_active,
        u.created_at,
        u.updated_at
      FROM auth.users_extended u
      WHERE u.clerk_id = $1 OR u.email = $2
      LIMIT 1
      `,
      [user.clerkId, user.email]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'USER_NOT_FOUND',
          message: 'User profile not found',
        },
        { status: 404 }
      );
    }

    const dbUser = userResult.rows[0];

    // Return user information
    return NextResponse.json(
      {
        success: true,
        data: {
          id: dbUser.id,
          email: dbUser.email,
          emailVerified: dbUser.email_verified,
          firstName: dbUser.first_name,
          lastName: dbUser.last_name,
          displayName: dbUser.display_name,
          avatarUrl: dbUser.avatar_url,
          phone: dbUser.phone,
          mobile: dbUser.mobile,
          orgId: dbUser.org_id,
          department: dbUser.department,
          jobTitle: dbUser.job_title,
          roles: user.roles,
          permissions: user.permissions,
          isActive: dbUser.is_active,
          twoFactorEnabled: dbUser.two_factor_enabled,
          createdAt: dbUser.created_at,
          updatedAt: dbUser.updated_at,
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
    // Verify authentication using Clerk
    const authUser = await verifyAuth(request);

    if (!authUser) {
      return NextResponse.json(
        {
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { firstName, lastName, displayName, phone, mobile, department, jobTitle, avatarUrl } =
      body;

    // Get current user from database to ensure we have the correct ID
    const currentUserResult = await db.query(
      `
      SELECT id, clerk_id, org_id, role
      FROM auth.users_extended
      WHERE clerk_id = $1 OR email = $2
      LIMIT 1
      `,
      [authUser.clerkId, authUser.email]
    );

    if (currentUserResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'USER_NOT_FOUND',
          message: 'User profile not found in database',
        },
        { status: 404 }
      );
    }

    const dbUser = currentUserResult.rows[0];
    const userId = dbUser.id;
    const clerkId = dbUser.clerk_id || authUser.clerkId;

    // Calculate display name if not provided
    const finalDisplayName =
      displayName || (firstName && lastName ? `${firstName} ${lastName}`.trim() : null);

    // Update user profile in database
    await db.query(
      `
      UPDATE auth.users_extended SET
        first_name = COALESCE($1, first_name),
        last_name = COALESCE($2, last_name),
        display_name = COALESCE($3, display_name),
        phone = COALESCE($4, phone),
        mobile = COALESCE($5, mobile),
        department = COALESCE($6, department),
        job_title = COALESCE($7, job_title),
        avatar_url = COALESCE($8, avatar_url),
        updated_at = NOW()
      WHERE id = $9
      `,
      [
        firstName || null,
        lastName || null,
        finalDisplayName || null,
        phone || null,
        mobile || null,
        department || null,
        jobTitle || null,
        avatarUrl || null,
        userId,
      ]
    );

    // Sync changes to Clerk (if clerk_id exists)
    if (clerkId) {
      try {
        await syncUserProfileToClerk(clerkId, {
          firstName: firstName || undefined,
          lastName: lastName || undefined,
          displayName: finalDisplayName || undefined,
          phone: phone || undefined,
          mobile: mobile || undefined,
          department: department || undefined,
          jobTitle: jobTitle || undefined,
          avatarUrl: avatarUrl || undefined,
          orgId: dbUser.org_id || undefined,
          role: dbUser.role || undefined,
        });
      } catch (syncError) {
        // Log error but don't fail the request - database update succeeded
        console.error('[Profile Update] Failed to sync to Clerk:', syncError);
      }
    }

    // Fetch updated user data
    const updatedUserResult = await db.query(
      `
      SELECT 
        id,
        email,
        first_name,
        last_name,
        display_name,
        avatar_url,
        phone,
        mobile,
        department,
        job_title,
        org_id,
        email_verified,
        two_factor_enabled,
        is_active,
        updated_at
      FROM auth.users_extended
      WHERE id = $1
      `,
      [userId]
    );

    const updatedUser = updatedUserResult.rows[0];

    return NextResponse.json(
      {
        success: true,
        message: 'Profile updated successfully',
        data: {
          id: updatedUser.id,
          email: updatedUser.email,
          firstName: updatedUser.first_name,
          lastName: updatedUser.last_name,
          displayName: updatedUser.display_name,
          avatarUrl: updatedUser.avatar_url,
          phone: updatedUser.phone,
          mobile: updatedUser.mobile,
          department: updatedUser.department,
          jobTitle: updatedUser.job_title,
          orgId: updatedUser.org_id,
          emailVerified: updatedUser.email_verified,
          twoFactorEnabled: updatedUser.two_factor_enabled,
          isActive: updatedUser.is_active,
          updatedAt: updatedUser.updated_at,
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
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
