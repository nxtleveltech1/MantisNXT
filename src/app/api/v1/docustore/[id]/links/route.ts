import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { DocumentService } from '@/lib/services/docustore';

const createLinkSchema = z.object({
  entity_type: z.string().min(1),
  entity_id: z.string().uuid(),
  link_type: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const documentId = params.id;
    const body = await request.json();

    const validated = createLinkSchema.parse(body);

    // Get user ID from request
    const userId = request.headers.get('x-user-id') || undefined;

    const link = await DocumentService.createLink({
      document_id: documentId,
      ...validated,
      created_by: userId,
    });

    return NextResponse.json(
      {
        success: true,
        data: link,
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

    console.error('Error in POST /api/v1/docustore/[id]/links:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create link',
      },
      { status: 500 }
    );
  }
}









