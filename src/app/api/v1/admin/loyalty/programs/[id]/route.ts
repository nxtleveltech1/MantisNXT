/**
 * Admin Loyalty Programs API - Single Program
 *
 * GET    /api/v1/admin/loyalty/programs/[id] - Get program details
 * PATCH  /api/v1/admin/loyalty/programs/[id] - Update program
 * DELETE /api/v1/admin/loyalty/programs/[id] - Delete program
 *
 * @author Claude Code
 * @date 2025-11-02
 */

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  authenticateRequest,
  requireAdmin,
  handleError,
} from '@/lib/auth/middleware';

// Validation schema for updating program
const updateProgramSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  is_active: z.boolean().optional(),
  is_default: z.boolean().optional(),
  earn_rate: z.number().positive().optional(),
  tier_thresholds: z.record(z.number()).optional(),
  tier_benefits: z.record(z.any()).optional(),
  points_expiry_days: z.number().positive().nullable().optional(),
});

// GET - Get program details
export async function GET(
  request: NextRequest,

  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    // Authentication
    const user = await authenticateRequest(request);

    // Authorization - Admin only
    await requireAdmin(user);


    // TODO: Replace with actual service call when Team B completes services
    // const result = await LoyaltyProgramService.getById(id, user.organizationId);

    const mockResult = {
      id: id,
      org_id: user.organizationId,
      name: 'Main Loyalty Program',
      description: 'Our primary customer loyalty program',
      is_active: true,
      is_default: true,
      earn_rate: 1.0,
      tier_thresholds: {
        bronze: 0,
        silver: 1000,
        gold: 5000,
        platinum: 15000,
        diamond: 50000,
      },
      tier_benefits: {
        bronze: { multiplier: 1.0 },
        silver: { multiplier: 1.2, discount: 5 },
        gold: { multiplier: 1.5, discount: 10, free_shipping: true },
        platinum: {
          multiplier: 2.0,
          discount: 15,
          free_shipping: true,
          priority_support: true,
        },
        diamond: {
          multiplier: 3.0,
          discount: 20,
          free_shipping: true,
          priority_support: true,
          dedicated_rep: true,
        },
      },
      points_expiry_days: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      data: mockResult,
    });
  } catch (error) {
    return handleError(error);
  }
}

// PATCH - Update program
export async function PATCH(
  request: NextRequest,

  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    // Authentication
    const user = await authenticateRequest(request);

    // Authorization - Admin only
    await requireAdmin(user);


    // Parse and validate body
    const body = await request.json();
    const validated = updateProgramSchema.parse(body);

    // TODO: Replace with actual service call when Team B completes services
    // const result = await LoyaltyProgramService.update(
    //   id,
    //   user.organizationId,
    //   validated
    // );

    const mockResult = {
      id: id,
      org_id: user.organizationId,
      ...validated,
      updated_at: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      data: mockResult,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: error.errors,
        },
        { status: 400 }
      );
    }
    return handleError(error);
  }
}

// DELETE - Delete program
export async function DELETE(
  request: NextRequest,

  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    // Authentication
    const user = await authenticateRequest(request);

    // Authorization - Admin only
    await requireAdmin(user);


    // TODO: Replace with actual service call when Team B completes services
    // await LoyaltyProgramService.delete(id, user.organizationId);

    return NextResponse.json({
      success: true,
      message: 'Program deleted successfully',
    });
  } catch (error) {
    return handleError(error);
  }
}
