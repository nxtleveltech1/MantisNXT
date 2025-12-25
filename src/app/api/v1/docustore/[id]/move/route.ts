import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { FolderService } from '@/lib/services/docustore';
import { getOrgId } from '../../../sales/_helpers';

const moveDocumentSchema = z.object({
  folder_id: z.string().uuid().nullable(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await getOrgId(request);
    const documentId = params.id;
    const body = await request.json();
    const validated = moveDocumentSchema.parse(body);

    await FolderService.moveDocument(documentId, validated.folder_id);

    return NextResponse.json({
      success: true,
      message: 'Document moved',
    });
  } catch (error: unknown) {
    console.error('Error moving document:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to move document',
      },
      { status: 400 }
    );
  }
}

