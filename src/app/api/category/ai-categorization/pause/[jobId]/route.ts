/**
 * POST /api/category/ai-categorization/pause/:jobId
 * Pause a running categorization job
 */

export const runtime = 'nodejs';

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
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

    if (job.status !== 'running') {
      return NextResponse.json(
        {
          success: false,
          message: `Job ${jobId} is not running (current status: ${job.status})`,
        },
        { status: 400 }
      );
    }

    await jobManager.pauseJob(jobId);

    return NextResponse.json({
      success: true,
      message: `Job ${jobId} has been paused`,
    });
  } catch (error) {
    console.error('[API] Error pausing job:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to pause job',
      },
      { status: 500 }
    );
  }
}

