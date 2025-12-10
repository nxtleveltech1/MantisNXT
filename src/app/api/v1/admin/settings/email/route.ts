/**
 * Email Settings API
 *
 * Provides endpoints for managing email configuration stored in the database.
 *
 * GET /api/v1/admin/settings/email - Get current email configuration
 * PUT /api/v1/admin/settings/email - Update email settings
 *
 * @module api/v1/admin/settings/email
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAuth, isAdmin } from '@/lib/auth/auth-helper';
import { EmailSettingsService } from '@/lib/services/EmailSettingsService';
import { clearEmailServiceCache } from '@/lib/services/EmailService';

// ============================================================================
// SCHEMAS
// ============================================================================

const UpdateEmailSettingsSchema = z.object({
  // Provider selection
  provider: z.enum(['resend', 'smtp', 'auto']).optional(),

  // Resend configuration
  resendApiKey: z.string().optional(),

  // SMTP configuration
  smtpHost: z.string().optional(),
  smtpPort: z.number().int().min(1).max(65535).optional(),
  smtpUser: z.string().optional(),
  smtpPassword: z.string().optional(),
  smtpSecure: z.boolean().optional(),

  // From configuration
  fromEmail: z.string().email().optional(),
  fromName: z.string().min(1).max(100).optional(),
  replyToEmail: z.string().email().optional().nullable(),

  // Feature flags
  enabled: z.boolean().optional(),
  welcomeEmailEnabled: z.boolean().optional(),
  passwordResetEnabled: z.boolean().optional(),
  invitationEmailEnabled: z.boolean().optional(),
  poApprovalEnabled: z.boolean().optional(),
  invoiceReminderEnabled: z.boolean().optional(),
});

// ============================================================================
// GET - Get Email Configuration
// ============================================================================

export async function GET(request: NextRequest) {
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

    const orgId = user.orgId || 'default';
    const settings = await EmailSettingsService.getSettingsMasked(orgId);
    const isConfigured = await EmailSettingsService.isConfigured(orgId);

    return NextResponse.json({
      success: true,
      data: {
        ...settings,
        isConfigured,
        // Determine primary provider
        primaryProvider: settings.provider === 'auto'
          ? (settings.hasResendKey ? 'resend' : settings.smtpHost ? 'smtp' : null)
          : settings.provider,
      },
    });
  } catch (error) {
    console.error('Get email settings error:', error);

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

// ============================================================================
// PUT - Update Email Settings
// ============================================================================

export async function PUT(request: NextRequest) {
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
    const validatedData = UpdateEmailSettingsSchema.parse(body);

    const orgId = user.orgId || 'default';

    // Save settings to database
    await EmailSettingsService.saveSettings(orgId, validatedData, user.id);

    // Clear the email service cache so it picks up new settings
    clearEmailServiceCache(orgId);

    // Get updated settings
    const updatedSettings = await EmailSettingsService.getSettingsMasked(orgId);

    console.log('[EmailSettings] Settings updated for org:', orgId);

    return NextResponse.json({
      success: true,
      message: 'Email settings saved successfully',
      data: updatedSettings,
    });
  } catch (error) {
    console.error('Update email settings error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Invalid settings data',
          details: error.errors,
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
