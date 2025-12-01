/**
 * Customer Loyalty API - Redeem Reward
 *
 * POST /api/v1/customers/[id]/loyalty/rewards/redeem - Redeem a reward
 *
 * @author Claude Code
 * @date 2025-11-02
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequest, authorizeCustomerAccess, handleError } from '@/lib/auth/middleware';

// Validation schema for reward redemption
const redeemRewardSchema = z.object({
  reward_id: z.string().uuid(),
});

// POST - Redeem a reward
export async function POST(
  request: NextRequest,

  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    // Authentication
    const user = await authenticateRequest(request);

    // Authorization - Customer access check
    await authorizeCustomerAccess(user, id);

    // Parse and validate body
    const body = await request.json();
    const validated = redeemRewardSchema.parse(body);

    // TODO: Replace with actual service call when Team B completes services
    // const result = await CustomerLoyaltyService.redeemReward(
    //   id,
    //   user.organizationId,
    //   validated.reward_id
    // );

    const mockResult = {
      redemption_id: 'mock-redemption-id',
      customer_id: id,
      reward_id: validated.reward_id,
      points_spent: 500,
      status: 'pending',
      redemption_code: 'ABC123DEF456',
      redeemed_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };

    return NextResponse.json(
      {
        success: true,
        data: mockResult,
        message: 'Reward redeemed successfully',
      },
      { status: 201 }
    );
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
