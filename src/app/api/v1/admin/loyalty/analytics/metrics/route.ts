/**
 * Admin Loyalty Analytics API - Metrics
 *
 * GET /api/v1/admin/loyalty/analytics/metrics - Get loyalty program metrics
 *
 * @author Claude Code
 * @date 2025-11-02
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { authenticateRequest, requireAdmin, handleError } from '@/lib/auth/middleware';
import { loyaltyAnalytics } from '@/lib/loyalty/ai-analytics-service';

// GET - Get loyalty program metrics with AI insights
export async function GET(request: NextRequest) {
  try {
    // Authentication
    const user = await authenticateRequest(request);

    // Authorization - Admin only
    await requireAdmin(user);

    const searchParams = request.nextUrl.searchParams;
    const programId = searchParams.get('program_id') || undefined;
    const period = parseInt(searchParams.get('period') || '30');

    // Get real-time metrics from database with AI analytics
    const result = await loyaltyAnalytics.getMetrics({
      organizationId: user.organizationId,
      programId,
      period,
    });

    return NextResponse.json({
      success: true,
      data: result,
      meta: {
        generated_at: new Date().toISOString(),
        period_days: period,
        ai_powered: true,
      },
    });
  } catch (error) {
    return handleError(error);
  }
}
