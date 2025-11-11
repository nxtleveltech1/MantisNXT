/**
 * POST /api/spp/merge - Merge validated pricelist into CORE schema
 */

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { pricelistService } from '@/lib/services/PricelistService';
import { z } from 'zod';

const MergeRequestSchema = z.object({
  upload_id: z.string().uuid(),
  skip_invalid_rows: z.boolean().optional()
});

export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const qpUploadId = url.searchParams.get('upload_id');
    const qpSkip = url.searchParams.get('skip_invalid_rows');
    let body: unknown = {};
    try {
      body = await request.json();
    } catch (error) {
      console.warn('SPP merge: falling back to query params because body could not be parsed.', error);
    }
    const parsed = MergeRequestSchema.safeParse({
      upload_id: body?.upload_id || qpUploadId,
      skip_invalid_rows: typeof body?.skip_invalid_rows === 'boolean'
        ? body.skip_invalid_rows
        : qpSkip === 'true'
    });
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Invalid request', details: parsed.error.issues }, { status: 400 });
    }
    const { upload_id, skip_invalid_rows } = parsed.data;

    const mergeResult = await pricelistService.mergePricelist(upload_id, { skipInvalidRows: !!skip_invalid_rows });

    // Normalize response shape to { success, data }
    return NextResponse.json({
      success: true,
      data: mergeResult
    });
  } catch (error) {
    console.error('Merge error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request',
          details: error.issues
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
