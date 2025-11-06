/**
 * Admin Loyalty Analytics API - Churn Prediction
 *
 * GET /api/v1/admin/loyalty/analytics/churn - AI-powered churn prediction
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

// GET - Predict customer churn with AI
export async function GET(request: NextRequest) {
  try {
    // Authentication
    const user = await authenticateRequest(request);

    // Authorization - Admin only
    await requireAdmin(user);

    const searchParams = request.nextUrl.searchParams;
    const programId = searchParams.get('program_id') || undefined;

    // Generate AI-powered churn predictions
    const result = await loyaltyAnalytics.predictChurn({
      organizationId: user.organizationId,
      programId,
    });

    return NextResponse.json({
      success: true,
      data: result,
      meta: {
        generated_at: new Date().toISOString(),
        ai_powered: true,
        prediction_type: 'churn_analysis',
      },
    });
  } catch (error) {
    return handleError(error);
  }
}
