/**
 * Optimization Progress API
 *
 * GET /api/v1/pricing/optimization/[id]/progress - Get progress for an optimization run
 */

import { NextRequest, NextResponse } from 'next/server';
import { PricingOptimizationService } from '@/lib/services/PricingOptimizationService';

/**
 * GET /api/v1/pricing/optimization/[id]/progress
 * Get current progress for an optimization run
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const runId = params.id;

    if (!runId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Optimization run ID is required',
        },
        { status: 400 }
      );
    }

    const progress = await PricingOptimizationService.getProgress(runId);

    if (!progress) {
      return NextResponse.json(
        {
          success: false,
          error: 'Optimization run not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: progress,
    });
  } catch (error) {
    console.error('Error fetching optimization progress:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch optimization progress',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}







