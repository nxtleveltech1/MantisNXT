import { NextRequest, NextResponse } from 'next/server';
import { extractionQueue } from '@/lib/services/ExtractionJobQueue';

interface Params {
  jobId: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  try {
    const { jobId } = await params;
    const jobStatus = extractionQueue.getJobStatus(jobId);

    if (!jobStatus) {
      return NextResponse.json(
        { success: false, error: 'Job not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          job_id: jobId,
          status: jobStatus.status,
          progress: jobStatus.progress,
          error: jobStatus.error || null,
          started_at: jobStatus.started_at?.toISOString(),
          updated_at: new Date().toISOString(),
          completed_at: jobStatus.completed_at?.toISOString()
        }
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-cache, max-age=5'
        }
      }
    );

  } catch (error: any) {
    console.error('[Extract Status API] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
