/**
 * POST /api/category/ai-categorization/recategorize
 * Force re-categorization for specific products
 */

export const runtime = 'nodejs';

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { jobManager } from '@/lib/cmm/ai-categorization';
import type {
  RecategorizeRequest,
  RecategorizeResponse,
} from '@/lib/cmm/ai-categorization/types';

export async function POST(request: NextRequest) {
  try {
    const body: RecategorizeRequest = await request.json();

    const { product_ids, force_override = false, confidence_threshold = 0.7 } = body;

    if (!Array.isArray(product_ids) || product_ids.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'product_ids array is required and must not be empty',
        },
        { status: 400 }
      );
    }

    // Create a job for re-categorization
    const jobId = await jobManager.createJob({
      job_type: 'recategorize',
      filters: {
        // Will be filtered by product IDs in the job processing
      },
      config: {
        force_recategorize: force_override,
        confidence_threshold,
      },
      batch_size: Math.min(product_ids.length, 200),
      created_by: 'api_user', // TODO: Get from session/auth
    });

    // Start processing in background
    jobManager.processJob(jobId).catch(err => {
      console.error(`[API] Error processing recategorize job ${jobId}:`, err);
    });

    const response: RecategorizeResponse = {
      success: true,
      job_id: jobId,
      products_queued: product_ids.length,
      message: `Re-categorization job ${jobId} created for ${product_ids.length} products`,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[API] Error creating recategorize job:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create recategorize job',
      },
      { status: 500 }
    );
  }
}

