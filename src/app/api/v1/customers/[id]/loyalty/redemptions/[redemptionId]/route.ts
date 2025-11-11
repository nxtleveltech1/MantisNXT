/**
 * Customer Loyalty API - Single Redemption
 *
 * GET /api/v1/customers/[id]/loyalty/redemptions/[redemptionId] - Get redemption details
 *
 * @author Claude Code
 * @date 2025-11-02
 */

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import {
  authenticateRequest,
  authorizeCustomerAccess,
  handleError,
} from '@/lib/auth/middleware';

// GET - Get redemption details
export async function GET(
  request: NextRequest,

  context: { params: Promise<{ id: string; redemptionId: string }> }
) {
  try {
    const { id, redemptionId } = await context.params;
    // Authentication
    const user = await authenticateRequest(request);

    // Authorization - Customer access check
    await authorizeCustomerAccess(user, id);


    // TODO: Replace with actual service call when Team B completes services
    // const result = await CustomerLoyaltyService.getRedemptionById(
    //   id,
    //   redemptionId,
    //   user.organizationId
    // );

    const mockResult = {
      id: redemptionId,
      customer_id: id,
      reward_id: 'reward-1',
      reward_name: '10% Discount Coupon',
      reward_type: 'discount',
      points_spent: 500,
      monetary_value_used: 50.0,
      status: 'pending',
      redemption_code: 'ABC123DEF456',
      redeemed_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      fulfilled_at: null,
      terms_conditions: {
        minimum_order: 100,
        excluded_categories: ['sale'],
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
