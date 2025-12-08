import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/database';
import crypto from 'node:crypto';

const ForgotPasswordSchema = z.object({
  email: z.string().email('Invalid email format'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = ForgotPasswordSchema.parse(body);

    // Look up user
    const userResult = await db.query(
      `SELECT id, email, display_name, is_active FROM auth.users_extended WHERE email = $1`,
      [email]
    );

    // Always return success to prevent email enumeration
    if (userResult.rows.length === 0 || !userResult.rows[0].is_active) {
      return NextResponse.json({
        success: true,
        message: 'If an account with that email exists, a reset link has been sent.',
      });
    }

    const user = userResult.rows[0];

    // Generate reset token (32 bytes = 64 hex chars)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    // Delete any existing tokens for this user
    await db.query(
      `DELETE FROM auth.password_reset_tokens WHERE user_id = $1`,
      [user.id]
    );

    // Insert new token
    await db.query(
      `INSERT INTO auth.password_reset_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, tokenHash, expiresAt]
    );

    // TODO: Send email with reset link
    // The reset link should be: ${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password?token=${resetToken}
    console.log(`Password reset token generated for ${email}. Token: ${resetToken}`);

    return NextResponse.json({
      success: true,
      message: 'If an account with that email exists, a reset link has been sent.',
    });
  } catch (error) {
    console.error('Forgot password error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid email format',
          error: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred. Please try again.',
        error: 'SERVER_ERROR',
      },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';