/**
 * GET /api/category/ai-categorization/status/:jobId
 * Get detailed status of a categorization job
 */

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { jobManager } from '@/lib/cmm/ai-categorization';
import { JobStatusResponse } from '@/lib/cmm/ai-categorization/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;

    const jobStatus = await jobManager.getJobStatus(jobId);

    if (!jobStatus) {
      return NextResponse.json(
        {
          success: false,
          message: `Job ${jobId} not found`,
        },
        { status: 404 }
      );
    }

    const response: JobStatusResponse = {
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

