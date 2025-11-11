/**
 * Admin Loyalty Analytics API - Fraud Detection
 *
 * GET /api/v1/admin/loyalty/analytics/fraud - AI-powered fraud and abuse detection
 *
 * @author Claude Code
 * @date 2025-11-04
 */

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import {
  authenticateRequest,
  requireAdmin,
  handleError,
} from '@/lib/auth/middleware';
import { loyaltyAnalytics } from '@/lib/loyalty/ai-analytics-service';

// GET - Detect fraud and abuse patterns with AI
export async function GET(request: NextRequest) {
  try {
    // Authentication
    const user = await authenticateRequest(request);

    // Authorization - Admin only
    await requireAdmin(user);

    const searchParams = request.nextUrl.searchParams;
    const programId = searchParams.get('program_id') || undefined;

    // Generate AI-powered fraud detection analysis
    const result = await loyaltyAnalytics.detectFraudAndAbuse({
      organizationId: user.organizationId,
      programId,
    });

    return NextResponse.json({
      success: true,
      data: result,
      meta: {
        generated_at: new Date().toISOString(),
        ai_powered: true,
        analysis_type: 'fraud_detection',
      },
    });
  } catch (error) {
    return handleError(error);
  }
}
