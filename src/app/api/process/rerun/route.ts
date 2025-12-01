import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';
import { query } from '@/lib/database';
import { extractionQueue } from '@/lib/services/ExtractionJobQueue';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const upload_id: string = body?.upload_id;
    if (!upload_id) {
      return NextResponse.json({ success: false, error: 'upload_id required' }, { status: 400 });
    }
    const org_id = request.headers.get('x-org-id') || 'unknown';
    const job_id = uuid();
    const extraction_config = { use_rules_engine: true };

    await query(
      `INSERT INTO spp.extraction_jobs (job_id, upload_id, org_id, config, status)
       VALUES ($1, $2, $3, $4, 'queued')`,
      [job_id, upload_id, org_id, JSON.stringify(extraction_config)]
    );

    const { position } = await extractionQueue.enqueue(
      job_id,
      upload_id,
      extraction_config,
      org_id,
      0
    );
    return NextResponse.json(
      { success: true, job_id, status: 'queued', position },
      { status: 202 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to rerun extraction' },
      { status: 500 }
    );
  }
}
