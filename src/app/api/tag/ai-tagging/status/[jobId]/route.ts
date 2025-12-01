/**
 * GET /api/tag/ai-tagging/status/:jobId
 * Get detailed status of a tagging job
 */

export const runtime = 'nodejs';

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { tagJobManager } from '@/lib/cmm/ai-tagging';
import type { TaggingJobStatusResponse } from '@/lib/cmm/ai-tagging/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;

    const jobStatus = await tagJobManager.getJobStatus(jobId);

    if (!jobStatus) {
      return NextResponse.json(
        {
          success: false,
          message: `Job ${jobId} not found`,
        },
        { status: 404 }
      );
    }

    const response: TaggingJobStatusResponse = {
      success: true,
      job: jobStatus,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[API] Error getting job status:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get job status',
      },
      { status: 500 }
    );
  }
}
