/**
 * Admin Loyalty Analytics API - Tier Distribution
 *
 * GET /api/v1/admin/loyalty/analytics/tier-distribution - Get tier distribution
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

// GET - Get tier distribution
export async function GET(request: NextRequest) {
  try {
    // Authentication
    const user = await authenticateRequest(request);

    // Authorization - Admin only
    await requireAdmin(user);

    const searchParams = request.nextUrl.searchParams;
    const programId = searchParams.get('program_id');

    // TODO: Replace with actual service call when Team B completes services
    // const result = await LoyaltyAnalyticsService.getTierDistribution(
    //   user.organizationId,
    //   { programId }
    // );

    const mockResult = {
      total_members: 1250,
      distribution: {
        bronze: {
          count: 450,
          percentage: 36.0,
          avg_points: 250,
          avg_lifetime_value: 2500,
          total_points: 112500,
        },
        silver: {
          count: 320,
          percentage: 25.6,
          avg_points: 1500,
          avg_lifetime_value: 5000,
          total_points: 480000,
        },
        gold: {
          count: 180,
          percentage: 14.4,
          avg_points: 7500,
          avg_lifetime_value: 12000,
          total_points: 1350000,
        },
        platinum: {
          count: 25,
          percentage: 2.0,
          avg_points: 20000,
          avg_lifetime_value: 35000,
          total_points: 500000,
        },
        diamond: {
          count: 5,
          percentage: 0.4,
          avg_points: 75000,
          avg_lifetime_value: 125000,
          total_points: 375000,
        },
      },
      movement: {
        upgrades_this_month: 28,
        downgrades_this_month: 3,
        net_movement: 25,
      },
      revenue_by_tier: {
        bronze: 1125000,
        silver: 1600000,
        gold: 2160000,
        platinum: 875000,
        diamond: 625000,
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
