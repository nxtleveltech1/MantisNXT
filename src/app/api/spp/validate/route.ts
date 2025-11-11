/**
 * POST /api/spp/validate - Validate a pricelist upload
 */

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { pricelistService } from '@/lib/services/PricelistService';
import { z } from 'zod';

const ValidateRequestSchema = z.object({
  upload_id: z.string().uuid()
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { upload_id } = ValidateRequestSchema.parse(body);

    const validationResult = await pricelistService.validateUpload(upload_id);

    // Normalize response shape to { success, data }
    return NextResponse.json({
      success: true,
      data: validationResult
    });
  } catch (error) {
    console.error('Validation error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: error.issues
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Validation failed'
      },
      { status: 500 }
    );
  }
}
