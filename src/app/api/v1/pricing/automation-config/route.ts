/**
 * Pricing Automation Configuration API
 * Manage organization-level pricing automation settings
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { PRICING_TABLES } from '@/lib/db/pricing-schema';
import { requireAuthOrg } from '@/lib/auth/require-org';
import { handleError } from '@/lib/auth/middleware';
import { z } from 'zod';

const ConfigSchema = z.object({
  enable_auto_activation: z.boolean().optional(),
  auto_activation_confidence_threshold: z.number().min(0).max(100).optional(),
  enable_ai_recommendations: z.boolean().optional(),
  default_margin_percent: z.number().min(0).optional(),
  min_margin_percent: z.number().min(0).optional(),
  max_price_increase_percent: z.number().min(0).optional(),
  require_review_for_high_impact: z.boolean().optional(),
  high_impact_threshold_percent: z.number().min(0).max(100).optional(),
  enable_batch_processing: z.boolean().optional(),
  batch_size: z.number().min(1).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { orgId } = await requireAuthOrg(request);

    const result = await query(
      `SELECT * FROM ${PRICING_TABLES.PRICING_AUTOMATION_CONFIG} WHERE org_id = $1`,
      [orgId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: true,
        data: null,
        message: 'No automation configuration found. Please configure pricing automation settings.',
      });
    }

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { orgId } = await requireAuthOrg(request);
    const body = await request.json();
    const validatedData = ConfigSchema.parse(body);

    const result = await query(
      `
      INSERT INTO ${PRICING_TABLES.PRICING_AUTOMATION_CONFIG} (
        org_id,
        enable_auto_activation,
        auto_activation_confidence_threshold,
        enable_ai_recommendations,
        default_margin_percent,
        min_margin_percent,
        max_price_increase_percent,
        require_review_for_high_impact,
        high_impact_threshold_percent,
        enable_batch_processing,
        batch_size
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (org_id) DO UPDATE SET
        enable_auto_activation = COALESCE($2, ${PRICING_TABLES.PRICING_AUTOMATION_CONFIG}.enable_auto_activation),
        auto_activation_confidence_threshold = COALESCE($3, ${PRICING_TABLES.PRICING_AUTOMATION_CONFIG}.auto_activation_confidence_threshold),
        enable_ai_recommendations = COALESCE($4, ${PRICING_TABLES.PRICING_AUTOMATION_CONFIG}.enable_ai_recommendations),
        default_margin_percent = COALESCE($5, ${PRICING_TABLES.PRICING_AUTOMATION_CONFIG}.default_margin_percent),
        min_margin_percent = COALESCE($6, ${PRICING_TABLES.PRICING_AUTOMATION_CONFIG}.min_margin_percent),
        max_price_increase_percent = COALESCE($7, ${PRICING_TABLES.PRICING_AUTOMATION_CONFIG}.max_price_increase_percent),
        require_review_for_high_impact = COALESCE($8, ${PRICING_TABLES.PRICING_AUTOMATION_CONFIG}.require_review_for_high_impact),
        high_impact_threshold_percent = COALESCE($9, ${PRICING_TABLES.PRICING_AUTOMATION_CONFIG}.high_impact_threshold_percent),
        enable_batch_processing = COALESCE($10, ${PRICING_TABLES.PRICING_AUTOMATION_CONFIG}.enable_batch_processing),
        batch_size = COALESCE($11, ${PRICING_TABLES.PRICING_AUTOMATION_CONFIG}.batch_size),
        updated_at = NOW()
      RETURNING *
      `,
      [
        orgId,
        validatedData.enable_auto_activation,
        validatedData.auto_activation_confidence_threshold,
        validatedData.enable_ai_recommendations,
        validatedData.default_margin_percent,
        validatedData.min_margin_percent,
        validatedData.max_price_increase_percent,
        validatedData.require_review_for_high_impact,
        validatedData.high_impact_threshold_percent,
        validatedData.enable_batch_processing,
        validatedData.batch_size,
      ]
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Pricing automation configuration updated successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Validation error', details: error.errors }, { status: 400 });
    }
    return handleError(error);
  }
}
