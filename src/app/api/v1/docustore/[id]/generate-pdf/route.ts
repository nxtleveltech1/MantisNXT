import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { PDFService } from '@/lib/services/docustore/pdf-service';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const documentId = params.id;
    const body = await request.json().catch(() => ({}));
    const artifactType = body.type || 'docustore_record';
    const userId = request.headers.get('x-user-id') || undefined;

    let artifact;

    if (artifactType === 'docustore_record') {
      artifact = await PDFService.generateDocuStoreRecord(documentId, userId);
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid artifact type. Use "docustore_record"',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: artifact,
    });
  } catch (error: unknown) {
    console.error('Error in POST /api/v1/docustore/[id]/generate-pdf:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate PDF',
      },
      { status: 500 }
    );
  }
}







