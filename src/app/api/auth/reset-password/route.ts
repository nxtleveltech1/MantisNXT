import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/database';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';

const ResetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password } = ResetPasswordSchema.parse(body);

    // Hash the token to match stored hash
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Look up valid token
    const tokenResult = await db.query(
      `SELECT t.user_id, t.expires_at, u.email
       FROM auth.password_reset_tokens t
       JOIN auth.users_extended u ON t.user_id = u.id
       WHERE t.token_hash = $1 AND t.used_at IS NULL`,
      [tokenHash]
    );

    if (tokenResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid or expired reset token.',
          error: 'INVALID_TOKEN',
        },
        { status: 400 }
      );
    }

    const tokenRecord = tokenResult.rows[0];

    // Check if token is expired
    if (new Date(tokenRecord.expires_at) < new Date()) {
      return NextResponse.json(
        {
          success: false,
          message: 'Reset token has expired. Please request a new one.',
          error: 'TOKEN_EXPIRED',
        },
        { status: 400 }
      );
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(password, 12);

    // Update user password and mark token as used (in transaction)
    await db.query('BEGIN');

    try {
      // Update password
      await db.query(
        `UPDATE auth.users_extended SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
        [passwordHash, tokenRecord.user_id]
      );

      // Mark token as used
      await db.query(
        `UPDATE auth.password_reset_tokens SET used_at = NOW() WHERE token_hash = $1`,
        [tokenHash]
      );

      // Reset any account lockout
      await db.query(
        `UPDATE auth.users_extended SET failed_login_attempts = 0, locked_until = NULL WHERE id = $1`,
        [tokenRecord.user_id]
      );

      await db.query('COMMIT');
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: 'Password has been reset successfully.',
    });
  } catch (error) {
    console.error('Reset password error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          message: error.errors[0]?.message || 'Validation error',
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