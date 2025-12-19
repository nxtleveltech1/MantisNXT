import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { DocumentService } from '@/lib/services/docustore';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const documentId = params.id;
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: 'No file provided',
        },
        { status: 400 }
      );
    }

    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          success: false,
          error: 'File size exceeds maximum allowed size of 50MB',
        },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Get user ID from request
    const userId = request.headers.get('x-user-id') || undefined;

    const version = await DocumentService.uploadVersion({
      document_id: documentId,
      file: buffer,
      filename: file.name,
      mime_type: file.type || 'application/octet-stream',
      uploaded_by: userId,
    });

    return NextResponse.json(
      {
        success: true,
        data: version,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('Error in POST /api/v1/docustore/[id]/versions:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to upload version',
      },
      { status: 500 }
    );
  }
}





