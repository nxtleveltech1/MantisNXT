import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { verifyAuth, isAdmin } from '@/lib/auth/auth-helper';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Await params (Next.js 15 requirement)
    const { id: userId } = await params;

    // Verify authentication
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

    // Check admin permissions
    if (!isAdmin(user)) {
      return NextResponse.json(
        {
          success: false,
          error: 'FORBIDDEN',
          message: 'Admin access required',
        },
        { status: 403 }
      );
    }
    const body = await request.json();
    const { roleId, effectiveFrom, effectiveTo } = body;

    if (!roleId) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Role ID is required',
        },
        { status: 400 }
      );
    }

    // Verify role exists
    const roleCheck = await db.query(
      `
      SELECT id FROM auth.roles
      WHERE id = $1 AND is_active = TRUE
    `,
      [roleId]
    );

    if (roleCheck.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'NOT_FOUND',
          message: 'Role not found',
        },
        { status: 404 }
      );
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
    );

    return NextResponse.json(
      {
        success: true,
        message: 'Role assigned successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Assign role API error:', error);

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
