import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';
import { query } from '@/lib/database';
import { extractionQueue } from '@/lib/services/ExtractionJobQueue';
import { ExtractRequestSchema } from '@/lib/types/pricelist-extraction';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = ExtractRequestSchema.parse(body);

    const job_id = uuid();
    const org_id = request.headers.get('x-org-id') || 'unknown';

    // Create job record
    await query(
      `INSERT INTO spp.extraction_jobs (job_id, upload_id, org_id, config, status)
       VALUES ($1, $2, $3, $4, $5)`,
      [job_id, validated.upload_id, org_id, JSON.stringify(validated.extraction_config), 'queued']
    );

    // Enqueue job
    const { position, estimated_wait_ms } = await extractionQueue.enqueue(
      job_id,
      validated.upload_id,
      validated.extraction_config,
      org_id,
      0
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          job_id,
          upload_id: validated.upload_id,
          status: 'queued',
          estimated_duration_ms: 30000,
          position_in_queue: position,
          created_at: new Date().toISOString(),
          poll_url: `/api/v2/pricelists/extract/${job_id}`,
        },
      },
      { status: 202 }
    );
  } catch (error: any) {
    console.error('[Extract API] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Extraction failed' },
      { status: 500 }
    );
  }
}
