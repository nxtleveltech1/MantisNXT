/**
 * POST /api/category/ai-categorization/resume/:jobId
 * Resume a paused categorization job
 */

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { jobManager } from '@/lib/cmm/ai-categorization';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;

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

    if (job.status !== 'paused') {
      return NextResponse.json(
        {
          success: false,
          message: `Job ${jobId} is not paused (current status: ${job.status})`,
        },
        { status: 400 }
      );
    }

    await jobManager.resumeJob(jobId);

    return NextResponse.json({
      success: true,
      message: `Job ${jobId} has been resumed`,
    });
  } catch (error) {
    console.error('[API] Error resuming job:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to resume job',
      },
      { status: 500 }
    );
  }
}

