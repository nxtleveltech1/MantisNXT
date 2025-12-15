import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { DocumentService } from '@/lib/services/docustore';

const updateDocumentSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  document_type: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const documentId = params.id;
    const includeRelations = request.nextUrl.searchParams.get('include_relations') !== 'false';

    const document = await DocumentService.getDocumentById(documentId, includeRelations);

    if (!document) {
      return NextResponse.json(
        {
          success: false,
          error: 'Document not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: document,
    });
  } catch (error: unknown) {
    console.error('Error in GET /api/v1/docustore/[id]:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch document',
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const documentId = params.id;
    const body = await request.json();

    const validated = updateDocumentSchema.parse(body);

    // Get user ID from request
    const userId = request.headers.get('x-user-id') || undefined;

    const document = await DocumentService.updateDocument(documentId, {
      ...validated,
      updated_by: userId,
    });

    return NextResponse.json({
      success: true,
      data: document,
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    console.error('Error in PUT /api/v1/docustore/[id]:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update document',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const documentId = params.id;
    const userId = request.headers.get('x-user-id') || undefined;

    await DocumentService.deleteDocument(documentId, userId);

    return NextResponse.json({
      success: true,
      message: 'Document deleted successfully',
    });
  } catch (error: unknown) {
    console.error('Error in DELETE /api/v1/docustore/[id]:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete document',
      },
      { status: 500 }
    );
  }
}

