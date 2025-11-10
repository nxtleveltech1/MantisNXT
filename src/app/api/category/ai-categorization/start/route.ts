/**
 * POST /api/category/ai-categorization/start
 * Start a new AI categorization job
 */

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { jobManager } from '@/lib/cmm/ai-categorization';
import { StartJobRequest, StartJobResponse } from '@/lib/cmm/ai-categorization/types';

export async function POST(request: NextRequest) {
  try {
    console.log('\n==== [/api/category/ai-categorization/start] incoming request ====');
    const body: StartJobRequest = await request.json();
    console.log('[API:start] payload:', body);
    
    const {
      job_type = 'full_scan',
      filters = {},
      config = {},
      batch_size,
    } = body;

    // Create the job
    console.log('[API:start] creating job…');
    const jobId = await jobManager.createJob({
      job_type,
      filters,
      config,
      batch_size,
      created_by: 'api_user', // TODO: Get from session/auth
    });
    console.log(`[API:start] job created: ${jobId}`);

    // Get job details to return estimated products
    const job = await jobManager.getJob(jobId);
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
    jobManager.processJob(jobId).catch(err => {
      console.error(`[API:start] Background processing crashed for job ${jobId}:`, err);
    });

    const response: StartJobResponse = {
      success: true,
      job_id: jobId,
      estimated_products: job.total_products,
      message: `Job ${jobId} created and started processing`,
    };

    console.log('[API:start] response ->', response);
    return NextResponse.json(response);
  } catch (error) {
    console.error('[API] Error starting categorization job:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to start job',
      },
      { status: 500 }
    );
  }
}

