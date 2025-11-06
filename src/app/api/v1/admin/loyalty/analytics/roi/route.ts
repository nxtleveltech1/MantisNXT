/**
 * Admin Loyalty Analytics API - ROI Analysis
 *
 * GET /api/v1/admin/loyalty/analytics/roi - AI-powered ROI analysis and insights
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

// GET - Analyze loyalty program ROI with AI
export async function GET(request: NextRequest) {
  try {
    // Authentication
    const user = await authenticateRequest(request);

    // Authorization - Admin only
    await requireAdmin(user);

    const searchParams = request.nextUrl.searchParams;
    const programId = searchParams.get('program_id') || undefined;

    // Generate AI-powered ROI analysis
    const result = await loyaltyAnalytics.analyzeROI({
      organizationId: user.organizationId,
      programId,
    });

    return NextResponse.json({
      success: true,
      data: result,
      meta: {
        generated_at: new Date().toISOString(),
        ai_powered: true,
        analysis_type: 'roi_analysis',
      },
    });
  } catch (error) {
    return handleError(error);
  }
}
