/**
 * Admin Loyalty Rewards API - Single Reward
 *
 * GET    /api/v1/admin/loyalty/rewards/[id] - Get reward details
 * PATCH  /api/v1/admin/loyalty/rewards/[id] - Update reward
 * DELETE /api/v1/admin/loyalty/rewards/[id] - Delete reward
 *
 * @author Claude Code
 * @date 2025-11-02
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequest, requireAdmin, handleError } from '@/lib/auth/middleware';

// Validation schema for updating reward
const updateRewardSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  reward_type: z
    .enum(['points', 'discount', 'cashback', 'free_shipping', 'upgrade', 'gift'])
    .optional(),
  points_required: z.number().int().positive().optional(),
  monetary_value: z.number().positive().nullable().optional(),
  max_redemptions_per_customer: z.number().int().positive().nullable().optional(),
  stock_quantity: z.number().int().nonnegative().nullable().optional(),
  is_active: z.boolean().optional(),
  is_featured: z.boolean().optional(),
  valid_from: z.string().datetime().optional(),
  valid_until: z.string().datetime().nullable().optional(),
  terms_conditions: z.record(z.any()).optional(),
  image_url: z.string().url().nullable().optional(),
});

// GET - Get reward details
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
    // const result = await RewardCatalogService.getById(
    //   id,
    //   user.organizationId
    // );

    const mockResult = {
      id: id,
      org_id: user.organizationId,
      program_id: null,
      name: '10% Discount Coupon',
      description: 'Get 10% off your next order',
      reward_type: 'discount',
      points_required: 500,
      monetary_value: 50.0,
      max_redemptions_per_customer: 5,
      stock_quantity: null,
      redemption_count: 125,
      is_active: true,
      is_featured: true,
      valid_from: new Date().toISOString(),
      valid_until: null,
      terms_conditions: {
        minimum_order: 100,
        excluded_categories: ['sale'],
      },
      image_url: 'https://example.com/reward.png',
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

// PATCH - Update reward
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
    const validated = updateRewardSchema.parse(body);

    // TODO: Replace with actual service call when Team B completes services
    // const result = await RewardCatalogService.update(
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

// DELETE - Delete reward
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
    // await RewardCatalogService.delete(id, user.organizationId);

    return NextResponse.json({
      success: true,
      message: 'Reward deleted successfully',
    });
  } catch (error) {
    return handleError(error);
  }
}
