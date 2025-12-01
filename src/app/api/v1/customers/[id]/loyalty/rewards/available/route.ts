/**
 * Customer Loyalty API - Available Rewards
 *
 * GET /api/v1/customers/[id]/loyalty/rewards/available - Get available rewards for customer
 *
 * @author Claude Code
 * @date 2025-11-02
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import {
  authenticateRequest,
  authorizeCustomerAccess,
  handleError,
  getPaginationParams,
  formatPaginatedResponse,
} from '@/lib/auth/middleware';

// GET - Get available rewards for customer
export async function GET(
  request: NextRequest,

  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    // Authentication
    const user = await authenticateRequest(request);

    // Authorization - Customer access check
    await authorizeCustomerAccess(user, id);

    const searchParams = request.nextUrl.searchParams;
    const { page, limit, offset } = getPaginationParams(searchParams);

    // Filters
    const rewardType = searchParams.get('reward_type');
    const maxPoints = searchParams.get('max_points');
    const isFeatured = searchParams.get('is_featured');

    // TODO: Replace with actual service call when Team B completes services
    // const result = await CustomerLoyaltyService.getAvailableRewards(
    //   id,
    //   user.organizationId,
    //   { rewardType, maxPoints, isFeatured, limit, offset }
    // );

    const mockData = {
      rewards: [],
      total: 0,
    };

    return NextResponse.json(
      formatPaginatedResponse(mockData.rewards, mockData.total, page, limit)
    );
  } catch (error) {
    return handleError(error);
  }
}
