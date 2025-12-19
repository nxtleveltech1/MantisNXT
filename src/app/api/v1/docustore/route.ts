import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { DocumentService } from '@/lib/services/docustore';
import { getOrgId } from '../sales/_helpers';

const createDocumentSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  document_type: z.string().optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const orgId = await getOrgId(request);
    const searchParams = request.nextUrl.searchParams;

    const filters = {
      org_id: orgId,
      status: searchParams.get('status') as 'active' | 'archived' | 'deleted' | undefined,
      document_type: searchParams.get('document_type') || undefined,
      tags: searchParams.get('tags')?.split(',').filter(Boolean),
      entity_type: searchParams.get('entity_type') || undefined,
      entity_id: searchParams.get('entity_id') || undefined,
      search: searchParams.get('search') || undefined,
      created_from: searchParams.get('created_from') || undefined,
      created_to: searchParams.get('created_to') || undefined,
      limit: parseInt(searchParams.get('limit') || '50', 10),
      offset: parseInt(searchParams.get('offset') || '0', 10),
    };

    const { documents, total } = await DocumentService.listDocuments(filters);

    return NextResponse.json({
      success: true,
      data: documents,
      total,
      limit: filters.limit,
      offset: filters.offset,
    });
  } catch (error: unknown) {
    console.error('Error in GET /api/v1/docustore:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch documents',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const orgId = await getOrgId(request);
    const body = await request.json();

    const validated = createDocumentSchema.parse(body);

    // Get user ID from request (you may need to adjust this based on your auth setup)
    const userId = request.headers.get('x-user-id') || undefined;

    const document = await DocumentService.createDocument({
      ...validated,
      org_id: orgId,
      created_by: userId,
    });

    return NextResponse.json(
      {
        success: true,
        data: document,
      },
      { status: 201 }
    );
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

    console.error('Error in POST /api/v1/docustore:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create document',
      },
      { status: 500 }
    );
  }
}








