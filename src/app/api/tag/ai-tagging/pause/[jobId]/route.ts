/**
 * POST /api/tag/ai-tagging/pause/:jobId
 * Pause a running tagging job
 */

export const runtime = 'nodejs';

import type { NextRequest} from 'next/server';
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

    if (job.status !== 'running') {
      return NextResponse.json(
        {
          success: false,
          message: `Job ${jobId} is not running (current status: ${job.status})`,
        },
        { status: 400 }
      );
    }

    await tagJobManager.pauseJob(jobId);

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

