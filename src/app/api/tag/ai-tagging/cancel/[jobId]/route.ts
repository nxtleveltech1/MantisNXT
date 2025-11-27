/**
 * POST /api/tag/ai-tagging/cancel/:jobId
 * Cancel a running tagging job
 */

export const runtime = 'nodejs';

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { tagJobManager } from '@/lib/cmm/ai-tagging';
import type { CancelTaggingJobResponse } from '@/lib/cmm/ai-tagging/types';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;

    // Get current job status before cancelling
    const job = await tagJobManager.getJob(jobId);

    if (!job) {
      return NextResponse.json(
        {
          success: false,
          message: `Job ${jobId} not found`,
        },
        { status: 404 }
      );
    }

    // Cancel the job
    await tagJobManager.cancelJob(jobId);

    const response: CancelTaggingJobResponse = {
      success: true,
      cancelled: true,
      products_processed: job.processed_products,
      message: `Job ${jobId} has been cancelled`,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[API] Error cancelling job:', error);
    return NextResponse.json(
      {
        success: false,
        cancelled: false,
        products_processed: 0,
        message: error instanceof Error ? error.message : 'Failed to cancel job',
      },
      { status: 500 }
    );
  }
}

