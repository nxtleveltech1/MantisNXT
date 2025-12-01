/**
 * Admin Loyalty Analytics API - Tier Movement Prediction
 *
 * GET /api/v1/admin/loyalty/analytics/tier-prediction - AI-powered tier movement forecasting
 *
 * @author Claude Code
 * @date 2025-11-04
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { authenticateRequest, requireAdmin, handleError } from '@/lib/auth/middleware';
import { loyaltyAnalytics } from '@/lib/loyalty/ai-analytics-service';

// GET - Predict tier movements with AI
export async function GET(request: NextRequest) {
  try {
    // Authentication
    const user = await authenticateRequest(request);

    // Authorization - Admin only
    await requireAdmin(user);

    const searchParams = request.nextUrl.searchParams;
    const programId = searchParams.get('program_id') || undefined;
    const forecastDays = parseInt(searchParams.get('forecast_days') || '30');

    // Generate AI-powered tier movement predictions
    const result = await loyaltyAnalytics.predictTierMovements({
      organizationId: user.organizationId,
      programId,
      forecastDays,
    });

    return NextResponse.json({
      success: true,
      data: result,
      meta: {
        generated_at: new Date().toISOString(),
        ai_powered: true,
        forecast_days: forecastDays,
        prediction_type: 'tier_movements',
      },
    });
  } catch (error) {
    return handleError(error);
  }
}
