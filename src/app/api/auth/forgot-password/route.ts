import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/database';
import crypto from 'node:crypto';
import { getEmailService } from '@/lib/services/EmailService';

const ForgotPasswordSchema = z.object({
  email: z.string().email('Invalid email format'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = ForgotPasswordSchema.parse(body);

    // Look up user with org_id
    const userResult = await db.query(
      `SELECT id, email, display_name, is_active, org_id FROM auth.users_extended WHERE email = $1`,
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
    await db.query(`DELETE FROM auth.password_reset_tokens WHERE user_id = $1`, [user.id]);

    // Insert new token
    await db.query(
      `INSERT INTO auth.password_reset_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, tokenHash, expiresAt]
    );

    // Send password reset email using org-specific settings
    const orgId = user.org_id || 'default';
    const emailService = getEmailService(orgId);

    const isConfigured = await emailService.isConfigured();
    if (isConfigured) {
      const emailResult = await emailService.sendPasswordReset({
        email: user.email,
        name: user.display_name || undefined,
        resetToken,
        expiresIn: '1 hour',
      });

      if (!emailResult.success) {
        console.error('Failed to send password reset email:', emailResult.error);
        // Still return success to prevent email enumeration
      } else {
        console.log(`Password reset email sent to ${email} via ${emailResult.provider}`);
      }
    } else {
      // Log token in development when email is not configured
      console.warn('⚠️  Email service not configured. Password reset token:', resetToken);
    }

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
