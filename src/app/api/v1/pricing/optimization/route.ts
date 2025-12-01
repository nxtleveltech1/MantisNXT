/**
 * Pricing Optimization API Endpoints
 *
 * POST /api/v1/pricing/optimization - Start new optimization run
 * GET /api/v1/pricing/optimization - List optimization runs
 *
 * Author: Aster
 * Date: 2025-11-02
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { PricingOptimizationService } from '@/lib/services/PricingOptimizationService';
import { PricingStrategy } from '@/lib/db/pricing-schema';
import { z } from 'zod';

const StartOptimizationSchema = z.object({
  run_name: z.string().min(1),
  strategy: z.nativeEnum(PricingStrategy),
  config: z.object({
    algorithms: z.array(z.string()),
    target_margin_percent: z.number().optional(),
    constraints: z
      .object({
        min_margin_percent: z.number().optional(),
        max_price_change_percent: z.number().optional(),
        preserve_price_endings: z.boolean().optional(),
      })
      .optional(),
  }),
  scope: z.object({
    category_ids: z.array(z.string()).optional(),
    brand_ids: z.array(z.string()).optional(),
    supplier_ids: z.array(z.string()).optional(),
    product_ids: z.array(z.string()).optional(),
  }),
  created_by: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = StartOptimizationSchema.parse(body);

    const run = await PricingOptimizationService.startOptimization(validatedData);

    return NextResponse.json(
      {
        success: true,
        data: run,
        message: 'Optimization started successfully',
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    const runs = await PricingOptimizationService.getAllRuns(limit);

    return NextResponse.json({
      success: true,
      data: runs,
      count: runs.length,
    });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
