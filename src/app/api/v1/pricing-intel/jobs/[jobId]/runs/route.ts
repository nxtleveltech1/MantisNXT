import { NextResponse, type NextRequest } from 'next/server';

import { ScrapingJobService } from '@/lib/services/pricing-intel/ScrapingJobService';
import { getOrgId } from '../../../_helpers';

const service = new ScrapingJobService();

export async function GET(request: NextRequest, { params }: { params: { jobId: string } }) {
  try {
    await getOrgId(request); // ensure org header present even though job lookup by id
    const url = new URL(request.url);
    const runId = url.searchParams.get('runId');
    if (!runId) {
      return NextResponse.json(
        { data: null, error: 'runId query parameter is required' },
        { status: 400 }
      );
    }
    const run = await service.getRun(runId);
    if (run.job_id !== params.jobId) {
      return NextResponse.json(
        { data: null, error: 'Run does not belong to job' },
        { status: 400 }
      );
    }
    return NextResponse.json({ data: run, error: null });
  } catch (error) {
    return NextResponse.json(
      { data: null, error: error instanceof Error ? error.message : 'Failed to fetch run' },
      { status: 400 }
    );
  }
}
