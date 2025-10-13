/**
 * Authentication API Route - Live Database Integration
 * Real-time login with multi-tenant support
 */

import { NextRequest, NextResponse } from 'next/server';
import { multiTenantAuth } from '@/lib/auth/multi-tenant-auth';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
  organizationDomain: z.string().optional(),
  rememberMe: z.boolean().optional().default(false)
});

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedData = loginSchema.parse(body);

    // Attempt login
    const authResult = await multiTenantAuth.login(validatedData);

    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: 401 }
      );
    }

    // Create response with authentication data
    const response = NextResponse.json({
      success: true,
      user: authResult.user,
      organization: authResult.organization,
      token: authResult.token
    });

    // Set HTTP-only cookie for refresh token
    response.cookies.set('refreshToken', authResult.refreshToken!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      path: '/'
    });

    // Set session cookie
    response.cookies.set('sessionId', authResult.session!.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      path: '/'
    });

    return response;

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid input data', details: error.issues },
        { status: 400 }
      );
    }

    console.error('❌ Login API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}