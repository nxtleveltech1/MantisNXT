import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { DocumentService } from '@/lib/services/docustore';
import { PreviewService } from '@/lib/services/docustore/preview-service';
import { getOrgId } from '../../../sales/_helpers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await getOrgId(request);
    const { id: documentId } = await params;

    const document = await DocumentService.getDocumentById(documentId, false);

    if (!document) {
      return NextResponse.json(
        {
          success: false,
          error: 'Document not found',
        },
        { status: 404 }
      );
    }

    const buffer = await PreviewService.generatePreview(documentId);

    if (!buffer) {
      return NextResponse.json(
        {
          success: false,
          error: 'Preview not available. Document may have no PDF artifact.',
        },
        { status: 501 }
      );
    }

    // pdf-to-img outputs PNG only
    const mimeType = 'image/png';
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error: unknown) {
    console.error('Error generating preview:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate preview',
      },
      { status: 500 }
    );
  }
}
