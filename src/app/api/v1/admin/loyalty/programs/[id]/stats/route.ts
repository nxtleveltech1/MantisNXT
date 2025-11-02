/**
 * Admin Loyalty Programs API - Program Statistics
 *
 * GET /api/v1/admin/loyalty/programs/[id]/stats - Get program statistics
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

// GET - Get program statistics
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
    // const result = await LoyaltyProgramService.getStats(
    //   id,
    //   user.organizationId
    // );

    const mockResult = {
      program_id: id,
      total_members: 1250,
      active_members: 980,
      tier_distribution: {
        bronze: 450,
        silver: 320,
        gold: 180,
        platinum: 25,
        diamond: 5,
      },
      points_metrics: {
        total_points_earned: 12500000,
        total_points_redeemed: 3200000,
        total_points_active: 9300000,
        total_points_pending: 150000,
      },
      redemption_metrics: {
        total_redemptions: 850,
        total_value_redeemed: 125000,
        pending_redemptions: 35,
        fulfilled_redemptions: 780,
        cancelled_redemptions: 35,
      },
      engagement_metrics: {
        avg_points_per_member: 10200,
        avg_lifetime_value: 8500.5,
        avg_referrals_per_member: 1.8,
        points_earned_this_month: 450000,
        points_redeemed_this_month: 125000,
      },
      growth_metrics: {
        new_members_this_month: 85,
        new_members_last_month: 72,
        growth_rate: 18.05,
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
