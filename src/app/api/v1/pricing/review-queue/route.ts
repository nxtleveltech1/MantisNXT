/**
 * Pricing Recommendation Review Queue API
 * Endpoints for reviewing and managing AI pricing recommendations
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { aiPricingRecommendationService } from '@/lib/services/pricing/AIPricingRecommendationService';
import { requireAuthOrg } from '@/lib/auth/require-org';
import { handleError } from '@/lib/auth/middleware';
import { z } from 'zod';

/**
 * GET /api/v1/pricing/review-queue
 * Get pending pricing recommendations for review
 */
export async function GET(request: NextRequest) {
  try {
    const { orgId: org_id } = await requireAuthOrg(request);
    const { searchParams } = new URL(request.url);
    const priority = searchParams.get('priority');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query with filters
    let whereClause = 'WHERE prq.org_id = $1';
    const params: unknown[] = [org_id];
    let paramCount = 1;

    if (priority) {
      paramCount++;
      whereClause += ` AND prq.priority = $${paramCount}`;
      params.push(priority);
    }

    const queueQuery = `
      SELECT
        prq.recommendation_id,
        prq.org_id,
        prq.supplier_product_id,
        prq.supplier_sku,
        prq.product_name,
        prq.supplier_name,
        prq.unit_cost,
        prq.current_selling_price,
        prq.rule_based_price,
        prq.ai_recommended_price,
        prq.price_difference,
        prq.recommended_margin,
        prq.confidence_score,
        prq.impact_on_revenue,
        prq.impact_on_margin,
        prq.impact_on_volume,
        prq.reasoning,
        prq.risk_factors,
        prq.review_status,
        prq.recommendation_status,
        prq.auto_applied,
        prq.recommendation_created_at,
        prq.priority,
        prq.eligible_for_auto_apply
      FROM pricing_recommendation_queue prq
      ${whereClause}
      ORDER BY prq.confidence_score DESC, prq.recommendation_created_at ASC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    params.push(limit, offset);

    const result = await query(queueQuery, params);

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM pricing_recommendation_queue prq
      ${whereClause}
    `;

    const countResult = await query(countQuery, params.slice(0, paramCount));
    const total = parseInt(countResult.rows[0]?.total || '0');

    return NextResponse.json({
      success: true,
      data: {
        recommendations: result.rows,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      },
    });
  } catch (error) {
    return handleError(error);
  }
}

/**
 * POST /api/v1/pricing/review-queue
 * Approve or reject pricing recommendations
 */
const ReviewActionSchema = z.object({
  recommendation_id: z.string().uuid('Invalid recommendation ID'),
  action: z.enum(['approve', 'reject'], {
    errorMap: () => ({ message: 'Action must be "approve" or "reject"' }),
  }),
  reviewed_by: z.string().uuid('Invalid user ID'),
  review_notes: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    await requireAuthOrg(request);
    const body = await request.json();
    const validatedData = ReviewActionSchema.parse(body);

    const { recommendation_id, action, reviewed_by, review_notes } = validatedData;

    if (action === 'approve') {
      await aiPricingRecommendationService.approveRecommendation(
        recommendation_id,
        reviewed_by,
        review_notes
      );

      return NextResponse.json({
        success: true,
        message: 'Pricing recommendation approved and applied',
        data: {
          recommendation_id,
          action: 'approved',
        },
      });
    } else {
      // Reject
      await aiPricingRecommendationService.rejectRecommendation(
        recommendation_id,
        reviewed_by,
        review_notes || 'No reason provided'
      );

      return NextResponse.json({
        success: true,
        message: 'Pricing recommendation rejected',
        data: {
          recommendation_id,
          action: 'rejected',
        },
      });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return handleError(error);
  }
}
