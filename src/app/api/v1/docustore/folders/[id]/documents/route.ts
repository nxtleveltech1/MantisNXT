import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { FolderService } from '@/lib/services/docustore';
import { getOrgId } from '../../../../sales/_helpers';
import type { DocumentFilters } from '@/lib/services/docustore';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orgId = await getOrgId(request);
    const folderId = params.id;
    const searchParams = request.nextUrl.searchParams;

    const filters: DocumentFilters = {
      org_id: orgId,
      status: (searchParams.get('status') as 'active' | 'archived' | 'deleted' | undefined) || undefined,
      document_type: searchParams.get('document_type') || undefined,
      search: searchParams.get('search') || undefined,
      limit: parseInt(searchParams.get('limit') || '50', 10),
      offset: parseInt(searchParams.get('offset') || '0', 10),
    };

    const result = await FolderService.getFolderDocuments(folderId, filters);

    return NextResponse.json({
      success: true,
      data: result.documents,
      total: result.total,
      limit: filters.limit,
      offset: filters.offset,
    });
  } catch (error: unknown) {
    console.error('Error fetching folder documents:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch folder documents',
      },
      { status: 500 }
    );
  }
}

