/**
 * Admin Loyalty Programs API - Tier Configuration
 *
 * GET   /api/v1/admin/loyalty/programs/[id]/tiers - Get tier configuration
 * PATCH /api/v1/admin/loyalty/programs/[id]/tiers - Update tier configuration
 *
 * @author Claude Code
 * @date 2025-11-02
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequest, requireAdmin, handleError } from '@/lib/auth/middleware';

// Validation schema for tier configuration
const tierConfigSchema = z.object({
  tier_thresholds: z.object({
    bronze: z.number().default(0),
    silver: z.number(),
    gold: z.number(),
    platinum: z.number(),
    diamond: z.number(),
  }),
  tier_benefits: z.object({
    bronze: z.record(z.any()),
    silver: z.record(z.any()),
    gold: z.record(z.any()),
    platinum: z.record(z.any()),
    diamond: z.record(z.any()),
  }),
});

// GET - Get tier configuration
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
    // const result = await LoyaltyProgramService.getTierConfig(
    //   id,
    //   user.organizationId
    // );

    const mockResult = {
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
    };

    return NextResponse.json({
      success: true,
      data: mockResult,
    });
  } catch (error) {
    return handleError(error);
  }
}

// PATCH - Update tier configuration
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
    const validated = tierConfigSchema.parse(body);

    // TODO: Replace with actual service call when Team B completes services
    // const result = await LoyaltyProgramService.updateTierConfig(
    //   id,
    //   user.organizationId,
    //   validated
    // );

    const mockResult = {
      program_id: id,
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
