/**
 * POST /api/category/ai-categorization/cancel/:jobId
 * Cancel a running categorization job
 */

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { jobManager } from '@/lib/cmm/ai-categorization';
import { CancelJobResponse } from '@/lib/cmm/ai-categorization/types';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;

    // Get current job status before cancelling
    const job = await jobManager.getJob(jobId);

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
    await jobManager.cancelJob(jobId);

    const response: CancelJobResponse = {
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

