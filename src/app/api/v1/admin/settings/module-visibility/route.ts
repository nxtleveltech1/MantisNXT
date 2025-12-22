/**
 * Module Visibility Settings API
 *
 * Provides endpoints for managing sidebar module visibility settings.
 *
 * GET /api/v1/admin/settings/module-visibility - Get current module visibility settings
 * PUT /api/v1/admin/settings/module-visibility - Update module visibility settings
 *
 * @module api/v1/admin/settings/module-visibility
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAuth, isAdmin } from '@/lib/auth/auth-helper';
import { ModuleVisibilityService } from '@/lib/services/ModuleVisibilityService';

// ============================================================================
// SCHEMAS
// ============================================================================

const UpdateModuleVisibilitySchema = z.object({
  dashboard: z.boolean().optional(),
  analytics: z.boolean().optional(),
  systemHealth: z.boolean().optional(),
  projectManagement: z.boolean().optional(),
  suppliers: z.boolean().optional(),
  productManagement: z.boolean().optional(),
  customers: z.boolean().optional(),
  salesServices: z.boolean().optional(),
  salesChannels: z.boolean().optional(),
  courierLogistics: z.boolean().optional(),
  rentals: z.boolean().optional(),
  repairsWorkshop: z.boolean().optional(),
  docustore: z.boolean().optional(),
  aiServices: z.boolean().optional(),
  financial: z.boolean().optional(),
  systemIntegration: z.boolean().optional(),
  administration: z.boolean().optional(),
  support: z.boolean().optional(),
  loyalty: z.boolean().optional(),
  communication: z.boolean().optional(),
});

// ============================================================================
// GET - Get Module Visibility Settings
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
    const settings = await ModuleVisibilityService.getSettings(orgId);

    return NextResponse.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    console.error('Get module visibility settings error:', error);

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
// PUT - Update Module Visibility Settings
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
    const validatedData = UpdateModuleVisibilitySchema.parse(body);

    const orgId = user.orgId || 'default';

    // Save settings to database
    const updatedSettings = await ModuleVisibilityService.saveSettings(
      orgId,
      validatedData,
      user.id
    );

    console.log('[ModuleVisibility] Settings updated for org:', orgId);

    return NextResponse.json({
      success: true,
      message: 'Module visibility settings saved successfully',
      data: updatedSettings,
    });
  } catch (error) {
    console.error('Update module visibility settings error:', error);

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

