import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';
import { query } from '@/lib/database';

interface Params {
  jobId: string;
}

export async function POST(request: NextRequest, { params }: { params: Promise<Params> }) {
  try {
    const { jobId } = await params;
    const body = await request.json();
    const import_job_id = uuid();
    const org_id = request.headers.get('x-org-id') || 'unknown';

    // Create import job record
    await query(
      `INSERT INTO spp.import_jobs (import_job_id, job_id, org_id, config, status)
       VALUES ($1, $2, $3, $4, $5)`,
      [import_job_id, jobId, org_id, JSON.stringify(body), 'importing']
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          import_job_id,
          job_id: jobId,
          status: 'importing',
          estimated_duration_ms: 30000,
          created_at: new Date().toISOString(),
          poll_url: `/api/v2/pricelists/import/${import_job_id}/status`,
        },
      },
      { status: 202 }
    );
  } catch (error: any) {
    console.error('[Import API] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
