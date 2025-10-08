/**
 * POST /api/spp/merge - Merge validated pricelist into CORE schema
 */

import { NextRequest, NextResponse } from 'next/server';
import { pricelistService } from '@/lib/services/PricelistService';
import { z } from 'zod';

const MergeRequestSchema = z.object({
  upload_id: z.string().uuid()
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { upload_id } = MergeRequestSchema.parse(body);

    const mergeResult = await pricelistService.mergePricelist(upload_id);

    return NextResponse.json({
      success: mergeResult.success,
      merge: mergeResult
    });
  } catch (error) {
    console.error('Merge error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request',
          details: error.errors
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Merge failed'
      },
      { status: 500 }
    );
  }
}
