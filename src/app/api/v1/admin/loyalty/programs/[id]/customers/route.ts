/**
 * Admin Loyalty Programs API - Enrolled Customers
 *
 * GET /api/v1/admin/loyalty/programs/[id]/customers - List enrolled customers
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

// GET - List enrolled customers
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

    const searchParams = request.nextUrl.searchParams;
    const { page, limit, offset } = getPaginationParams(searchParams);

    // Filters
    const tier = searchParams.get('tier');
    const minPoints = searchParams.get('min_points');
    const maxPoints = searchParams.get('max_points');
    const sortBy = searchParams.get('sort_by') || 'points_balance';
    const sortOrder = searchParams.get('sort_order') || 'desc';

    // TODO: Replace with actual service call when Team B completes services
    // const result = await LoyaltyProgramService.getEnrolledCustomers(
    //   id,
    //   user.organizationId,
    //   { tier, minPoints, maxPoints, sortBy, sortOrder, limit, offset }
    // );

    const mockData = {
      customers: [],
      total: 0,
    };

    return NextResponse.json(
      formatPaginatedResponse(mockData.customers, mockData.total, page, limit)
    );
  } catch (error) {
    return handleError(error);
  }
}
