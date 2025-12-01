/**
 * Authentication API: Login Endpoint
 *
 * POST /api/v1/auth/login
 * Authenticate user with email/password and optional 2FA
 *
 * @module api/v1/auth/login
 * @author AS Team (Auth & Security)
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { neonAuthService } from '@/lib/auth/neon-auth-service';
import { z } from 'zod';

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(3, 'Password must be at least 3 characters'),
  rememberMe: z.boolean().optional().default(false),
  twoFactorCode: z
    .string()
    .regex(/^\d{6}$/, 'Invalid 2FA code')
    .optional(),
});

// ============================================================================
// API HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();

    const validationResult = loginSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          errors: validationResult.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        },
        { status: 400 }
      );
    }

    const { email, password, rememberMe, twoFactorCode } = validationResult.data;

    // Attempt login
    const result = await neonAuthService.login({
      email,
      password,
      rememberMe,
      twoFactorCode,
    });

    if (!result.success) {
      // Handle 2FA requirement
      if (result.requiresTwoFactor) {
        return NextResponse.json(
          {
            success: false,
            requiresTwoFactor: true,
            twoFactorToken: result.twoFactorToken,
            message: result.message,
          },
          { status: 200 } // 200 OK but requires additional step
        );
      }

      // Handle authentication failure
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'AUTHENTICATION_FAILED',
          message: result.message || 'Invalid email or password',
        },
        { status: 401 }
      );
    }

    // Successful login
    const response = NextResponse.json(
      {
        success: true,
        message: result.message,
        user: {
          id: result.session!.user.id,
          email: result.session!.user.email,
          displayName: result.session!.user.displayName,
          avatarUrl: result.session!.user.avatarUrl,
          orgId: result.session!.user.orgId,
          orgName: result.session!.user.orgName,
          roles: result.session!.user.roles.map(r => r.slug),
          permissions: result.session!.user.permissions.map(p => p.name),
        },
        expiresAt: result.session!.expiresAt,
      },
      { status: 200 }
    );

    // Set session token as HTTP-only cookie
    response.cookies.set('session_token', result.session!.sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: result.session!.expiresAt,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login API error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'SERVER_ERROR',
        message: 'An unexpected error occurred. Please try again.',
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// API METADATA
// ============================================================================

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
