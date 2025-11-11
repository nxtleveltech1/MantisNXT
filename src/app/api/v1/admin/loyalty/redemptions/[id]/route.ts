/**
 * Admin Loyalty Redemptions API - Single Redemption
 *
 * GET   /api/v1/admin/loyalty/redemptions/[id] - Get redemption details
 * PATCH /api/v1/admin/loyalty/redemptions/[id] - Update redemption
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

// Validation schema for updating redemption
const updateRedemptionSchema = z.object({
  status: z.enum(['pending', 'approved', 'fulfilled', 'cancelled', 'expired']).optional(),
  fulfillment_notes: z.string().optional(),
});

// GET - Get redemption details
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
    // const result = await RewardRedemptionService.getById(
    //   id,
    //   user.organizationId
    // );

    const mockResult = {
      id: id,
      org_id: user.organizationId,
      customer_id: 'customer-1',
      customer_name: 'John Doe',
      customer_email: 'john@example.com',
      reward_id: 'reward-1',
      reward_name: '10% Discount Coupon',
      reward_type: 'discount',
      points_spent: 500,
      monetary_value_used: 50.0,
      status: 'pending',
      redemption_code: 'abc123def456',
      redeemed_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      fulfilled_at: null,
      fulfilled_by: null,
      fulfillment_notes: null,
      created_at: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      data: mockResult,
    });
  } catch (error) {
    return handleError(error);
  }
}

// PATCH - Update redemption
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
    const validated = updateRedemptionSchema.parse(body);

    // TODO: Replace with actual service call when Team B completes services
    // const result = await RewardRedemptionService.update(
    //   id,
    //   user.organizationId,
    //   validated
    // );

    const mockResult = {
      id: id,
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
