/**
 * GET /api/category/ai-categorization/jobs
 * Get recent categorization jobs
 */

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { jobManager } from '@/lib/cmm/ai-categorization';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    const jobs = await jobManager.getRecentJobs(limit);

    return NextResponse.json({
      success: true,
      jobs,
      total: jobs.length,
    });
  } catch (error) {
    console.error('[API] Error getting jobs:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get jobs',
        jobs: [],
        total: 0,
      },
      { status: 500 }
    );
  }
}

