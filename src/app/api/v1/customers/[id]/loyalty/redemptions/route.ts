/**
 * Customer Loyalty API - Redemptions
 *
 * GET /api/v1/customers/[id]/loyalty/redemptions - Get customer redemptions
 *
 * @author Claude Code
 * @date 2025-11-02
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  authenticateRequest,
  authorizeCustomerAccess,
  handleError,
  getPaginationParams,
  formatPaginatedResponse,
} from '@/lib/auth/middleware';

// GET - Get customer redemptions
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
    const status = searchParams.get('status');
    const fromDate = searchParams.get('from_date');
    const toDate = searchParams.get('to_date');

    // TODO: Replace with actual service call when Team B completes services
    // const result = await CustomerLoyaltyService.getRedemptions(
    //   id,
    //   user.organizationId,
    //   { status, fromDate, toDate, limit, offset }
    // );

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
