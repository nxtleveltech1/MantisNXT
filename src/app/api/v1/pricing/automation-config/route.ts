/**
 * Pricing Automation Configuration API
 * Manage organization-level pricing automation settings
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { z } from 'zod';

const ConfigSchema = z.object({
  org_id: z.string().uuid(),
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

/**
 * GET /api/v1/pricing/automation-config
 * Fetch pricing automation configuration for an organization
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const org_id = searchParams.get('org_id');

    if (!org_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Organization ID is required',
        },
        { status: 400 }
      );
    }

    const result = await query(`SELECT * FROM pricing_automation_config WHERE org_id = $1`, [
      org_id,
    ]);

    if (result.rows.length === 0) {
      // Return defaults if no config exists
      return NextResponse.json({
        success: true,
        data: {
          org_id,
          enable_auto_activation: false,
          auto_activation_confidence_threshold: 85.0,
          enable_ai_recommendations: true,
          default_margin_percent: 30.0,
          min_margin_percent: 5.0,
          max_price_increase_percent: 50.0,
          require_review_for_high_impact: true,
          high_impact_threshold_percent: 20.0,
          enable_batch_processing: true,
          batch_size: 100,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error fetching automation config:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch automation config',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/pricing/automation-config
 * Create or update pricing automation configuration
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = ConfigSchema.parse(body);

    // Upsert configuration
    const result = await query(
      `
      INSERT INTO pricing_automation_config (
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
        enable_auto_activation = COALESCE($2, pricing_automation_config.enable_auto_activation),
        auto_activation_confidence_threshold = COALESCE($3, pricing_automation_config.auto_activation_confidence_threshold),
        enable_ai_recommendations = COALESCE($4, pricing_automation_config.enable_ai_recommendations),
        default_margin_percent = COALESCE($5, pricing_automation_config.default_margin_percent),
        min_margin_percent = COALESCE($6, pricing_automation_config.min_margin_percent),
        max_price_increase_percent = COALESCE($7, pricing_automation_config.max_price_increase_percent),
        require_review_for_high_impact = COALESCE($8, pricing_automation_config.require_review_for_high_impact),
        high_impact_threshold_percent = COALESCE($9, pricing_automation_config.high_impact_threshold_percent),
        enable_batch_processing = COALESCE($10, pricing_automation_config.enable_batch_processing),
        batch_size = COALESCE($11, pricing_automation_config.batch_size),
        updated_at = NOW()
      RETURNING *
      `,
      [
        validatedData.org_id,
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
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    console.error('Error updating automation config:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update automation config',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
