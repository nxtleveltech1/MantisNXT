import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { DocumentService } from '@/lib/services/docustore';
import { query } from '@/lib/database';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { linkId: string } }
) {
  try {
    const linkId = params.linkId;

    // Get link to find document_id
    const linkResult = await query<{ document_id: string }>(
      `SELECT document_id FROM docustore.document_links WHERE id = $1`,
      [linkId]
    );

    if (linkResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Link not found',
        },
        { status: 404 }
      );
    }

    const documentId = linkResult.rows[0].document_id;
    const userId = request.headers.get('x-user-id') || undefined;

    await DocumentService.deleteLink(linkId, documentId, userId);

    return NextResponse.json({
      success: true,
      message: 'Link deleted successfully',
    });
  } catch (error: unknown) {
    console.error('Error in DELETE /api/v1/docustore/links/[linkId]:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete link',
      },
      { status: 500 }
    );
  }
}









