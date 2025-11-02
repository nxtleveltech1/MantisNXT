/**
 * Admin Loyalty Analytics API - Points Flow
 *
 * GET /api/v1/admin/loyalty/analytics/points-flow - Get points flow analysis
 *
 * @author Claude Code
 * @date 2025-11-02
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  authenticateRequest,
  requireAdmin,
  handleError,
} from '@/lib/auth/middleware';

// GET - Get points flow analysis
export async function GET(request: NextRequest) {
  try {
    // Authentication
    const user = await authenticateRequest(request);

    // Authorization - Admin only
    await requireAdmin(user);

    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period') || '30';
    const programId = searchParams.get('program_id');

    // TODO: Replace with actual service call when Team B completes services
    // const result = await LoyaltyAnalyticsService.getPointsFlow(
    //   user.organizationId,
    //   { period, programId }
    // );

    const mockResult = {
      period_days: parseInt(period),
      summary: {
        points_earned: 450000,
        points_redeemed: 125000,
        points_expired: 5000,
        points_adjusted: 2000,
        net_change: 322000,
      },
      earned_by_source: {
        purchases: 380000,
        referrals: 25000,
        bonuses: 30000,
        reviews: 8000,
        signup: 7000,
      },
      redeemed_by_type: {
        discounts: 65000,
        free_shipping: 30000,
        cashback: 20000,
        gifts: 10000,
      },
      daily_flow: [],
      top_earning_customers: [
        {
          customer_id: 'customer-1',
          customer_name: 'John Doe',
          points_earned: 15000,
          source_breakdown: {
            purchases: 12000,
            referrals: 2000,
            bonuses: 1000,
          },
        },
      ],
      top_redeeming_customers: [
        {
          customer_id: 'customer-2',
          customer_name: 'Jane Smith',
          points_redeemed: 8000,
          redemption_count: 4,
        },
      ],
    };

    return NextResponse.json({
      success: true,
      data: mockResult,
    });
  } catch (error) {
    return handleError(error);
  }
}
