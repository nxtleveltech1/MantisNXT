import { NextRequest, NextResponse } from 'next/server';
import { extractionQueue } from '@/lib/services/ExtractionJobQueue';

interface Params {
  jobId: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  try {
    const { jobId } = await params;
    const success = await extractionQueue.cancelJob(jobId);

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Job not found or already completed' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          job_id: jobId,
          status: 'cancelled',
          cancelled_at: new Date().toISOString()
        }
      },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('[Cancel API] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
