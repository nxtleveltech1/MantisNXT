/**
 * POST /api/tag/ai-tagging/start
 * Start a new AI tagging job
 */

export const runtime = 'nodejs';

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { tagJobManager } from '@/lib/cmm/ai-tagging';
import type { StartTaggingJobRequest, StartTaggingJobResponse } from '@/lib/cmm/ai-tagging/types';

export async function POST(request: NextRequest) {
  try {
    console.log('\n==== [/api/tag/ai-tagging/start] incoming request ====');
    const body: StartTaggingJobRequest = await request.json();
    console.log('[API:start] payload:', body);

    const { job_type = 'full_scan', filters = {}, config = {}, batch_size, product_limit } = body;

    // Create the job
    console.log('[API:start] creating job…');
    const jobId = await tagJobManager.createJob({
      job_type,
      filters,
      config,
      batch_size,
      product_limit,
      created_by: 'api_user', // TODO: Get from session/auth
    });
    console.log(`[API:start] job created: ${jobId}`);

    // Get job details to return estimated products
    const job = await tagJobManager.getJob(jobId);
    console.log('[API:start] job snapshot after create:', job);

    if (!job) {
      console.error('[API:start] job lookup failed immediately after creation');
      return NextResponse.json(
        {
          success: false,
          message: 'Failed to create job',
        },
        { status: 500 }
      );
    }

    // Start processing in background (don't await)
    console.log(`[API:start] scheduling background processor for job ${jobId}`);
    tagJobManager.processJob(jobId).catch(err => {
      console.error(`[API:start] Background processing crashed for job ${jobId}:`, err);
    });

    const response: StartTaggingJobResponse = {
      success: true,
      job_id: jobId,
      estimated_products: job.total_products,
      message: `Job ${jobId} created and started processing`,
    };

    console.log('[API:start] response ->', response);
    return NextResponse.json(response);
  } catch (error) {
    console.error('[API] Error starting tagging job:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to start job',
      },
      { status: 500 }
    );
  }
}
