/**
 * Email Test API
 *
 * Sends a test email to verify email configuration.
 *
 * POST /api/v1/admin/settings/email/test - Send test email
 *
 * @module api/v1/admin/settings/email/test
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAuth, isAdmin } from '@/lib/auth/auth-helper';
import { getEmailService } from '@/lib/services/EmailService';

// ============================================================================
// SCHEMAS
// ============================================================================

const TestEmailSchema = z.object({
  email: z.string().email('Invalid email address'),
});

// ============================================================================
// POST - Send Test Email
// ============================================================================

export async function POST(request: NextRequest) {
  try {
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
    const { email } = TestEmailSchema.parse(body);

    const orgId = user.orgId || 'default';
    const emailService = getEmailService(orgId);

    // Reload settings to ensure we have the latest
    await emailService.reload();

    // Check if email service is configured
    const isConfigured = await emailService.isConfigured();
    if (!isConfigured) {
      const providerStatus = await emailService.getProviderStatus();
      return NextResponse.json(
        {
          success: false,
          error: 'EMAIL_NOT_CONFIGURED',
          message:
            'Email service is not configured. Please configure Resend API key or SMTP settings in the Email Settings page.',
          providers: providerStatus,
        },
        { status: 503 }
      );
    }

    // Send test email
    const result = await emailService.sendTestEmail({ email });

    if (result.success) {
      console.log(`[EmailTest] Test email sent to ${email} via ${result.provider}`);

      return NextResponse.json({
        success: true,
        message: `Test email sent successfully to ${email}`,
        data: {
          messageId: result.messageId,
          provider: result.provider,
          sentAt: new Date().toISOString(),
        },
      });
    } else {
      console.error(`[EmailTest] Failed to send test email:`, result.error);

      return NextResponse.json(
        {
          success: false,
          error: 'EMAIL_SEND_FAILED',
          message: result.error || 'Failed to send test email',
          provider: result.provider,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Test email API error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: error.errors[0]?.message || 'Invalid email address',
        },
        { status: 400 }
      );
    }

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
