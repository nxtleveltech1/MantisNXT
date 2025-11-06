/**
 * Admin Loyalty Analytics API - Reward Optimization
 *
 * GET /api/v1/admin/loyalty/analytics/rewards - AI-powered reward catalog optimization
 *
 * @author Claude Code
 * @date 2025-11-04
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  authenticateRequest,
  requireAdmin,
  handleError,
} from '@/lib/auth/middleware';
import { loyaltyAnalytics } from '@/lib/loyalty/ai-analytics-service';

// GET - Optimize reward catalog with AI recommendations
export async function GET(request: NextRequest) {
  try {
    // Authentication
    const user = await authenticateRequest(request);

    // Authorization - Admin only
    await requireAdmin(user);

    const searchParams = request.nextUrl.searchParams;
    const programId = searchParams.get('program_id') || undefined;

    // Generate AI-powered reward optimization recommendations
    const result = await loyaltyAnalytics.optimizeRewards({
      organizationId: user.organizationId,
      programId,
    });

    return NextResponse.json({
      success: true,
      data: result,
      meta: {
        generated_at: new Date().toISOString(),
        ai_powered: true,
        analysis_type: 'reward_optimization',
      },
    });
  } catch (error) {
    return handleError(error);
  }
}
