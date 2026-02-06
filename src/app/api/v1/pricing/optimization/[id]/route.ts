/**
 * Optimization Run Details & Recommendations API
 *
 * GET /api/v1/pricing/optimization/[id] - Get run details
 * GET /api/v1/pricing/optimization/[id]?recommendations=true - Get recommendations
 * POST /api/v1/pricing/optimization/[id] - Apply recommendations
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { PricingOptimizationService } from '@/lib/services/PricingOptimizationService';
import { requireAuthOrg } from '@/lib/auth/require-org';
import { handleError } from '@/lib/auth/middleware';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId } = await requireAuthOrg(request);
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const getRecommendations = searchParams.get('recommendations') === 'true';

    if (getRecommendations) {
      const minConfidence = searchParams.get('min_confidence')
        ? parseFloat(searchParams.get('min_confidence')!)
        : undefined;

      const recommendations = await PricingOptimizationService.getRecommendations(orgId, id, {
        min_confidence: minConfidence,
      });

      return NextResponse.json({ success: true, data: recommendations, count: recommendations.length });
    }

    const run = await PricingOptimizationService.getRunById(orgId, id);
    if (!run) {
      return NextResponse.json({ success: false, error: 'Optimization run not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: run });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId } = await requireAuthOrg(request);
    const body = await request.json();
    const { recommendation_ids, applied_by } = body;

    if (!recommendation_ids || !Array.isArray(recommendation_ids)) {
      return NextResponse.json({ success: false, error: 'recommendation_ids array required' }, { status: 400 });
    }

    const result = await PricingOptimizationService.applyMultipleRecommendations(
      orgId,
      recommendation_ids,
      applied_by
    );

    return NextResponse.json({
      success: true,
      data: result,
      message: `Applied ${result.succeeded} recommendations successfully`,
    });
  } catch (error) {
    return handleError(error);
  }
}
