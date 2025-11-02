/**
 * Admin Loyalty Redemptions API - List
 *
 * GET /api/v1/admin/loyalty/redemptions - List all redemptions
 *
 * @author Claude Code
 * @date 2025-11-02
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  authenticateRequest,
  requireAdmin,
  handleError,
  getPaginationParams,
  formatPaginatedResponse,
} from '@/lib/auth/middleware';

// GET - List all redemptions
export async function GET(request: NextRequest) {
  try {
    // Authentication
    const user = await authenticateRequest(request);

    // Authorization - Admin only
    await requireAdmin(user);

    // Pagination
    const searchParams = request.nextUrl.searchParams;
    const { page, limit, offset } = getPaginationParams(searchParams);

    // Filters
    const status = searchParams.get('status');
    const customerId = searchParams.get('customer_id');
    const rewardId = searchParams.get('reward_id');
    const fromDate = searchParams.get('from_date');
    const toDate = searchParams.get('to_date');
    const sortBy = searchParams.get('sort_by') || 'redeemed_at';
    const sortOrder = searchParams.get('sort_order') || 'desc';

    // TODO: Replace with actual service call when Team B completes services
    // const result = await RewardRedemptionService.list(user.organizationId, {
    //   status,
    //   customerId,
    //   rewardId,
    //   fromDate,
    //   toDate,
    //   sortBy,
    //   sortOrder,
    //   limit,
    //   offset,
    // });

    const mockData = {
      redemptions: [],
      total: 0,
    };

    return NextResponse.json(
      formatPaginatedResponse(mockData.redemptions, mockData.total, page, limit)
    );
  } catch (error) {
    return handleError(error);
  }
}
