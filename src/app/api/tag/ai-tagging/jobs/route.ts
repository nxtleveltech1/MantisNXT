/**
 * GET /api/tag/ai-tagging/jobs
 * Get recent tagging jobs
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { tagJobManager } from '@/lib/cmm/ai-tagging';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    const jobs = await tagJobManager.getRecentJobs(limit);

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
