/**
 * POST /api/tag/ai-tagging/resume/:jobId
 * Resume a paused tagging job
 */

export const runtime = 'nodejs';

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { tagJobManager } from '@/lib/cmm/ai-tagging';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;

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

    if (job.status !== 'paused') {
      return NextResponse.json(
        {
          success: false,
          message: `Job ${jobId} is not paused (current status: ${job.status})`,
        },
        { status: 400 }
      );
    }

    await tagJobManager.resumeJob(jobId);

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
