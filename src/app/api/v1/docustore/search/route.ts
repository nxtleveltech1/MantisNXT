import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { DocumentService } from '@/lib/services/docustore';
import { getOrgId } from '../../sales/_helpers';

const searchParamsSchema = z.object({
  q: z.string().optional(),
  document_type: z.string().optional(),
  folder_id: z.string().uuid().optional(),
  signing_status: z.string().optional(),
  entity_type: z.string().optional(),
  entity_id: z.string().uuid().optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
  tags: z.string().optional(), // Comma-separated
  limit: z.string().regex(/^\d+$/).optional(),
  offset: z.string().regex(/^\d+$/).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const orgId = await getOrgId(request);
    const searchParams = request.nextUrl.searchParams;

    // Parse and validate query params
    const params: Record<string, string | undefined> = {};
    for (const [key, value] of searchParams.entries()) {
      params[key] = value || undefined;
    }

    const validated = searchParamsSchema.parse(params);

    // Build filters
    const filters: Parameters<typeof DocumentService.listDocuments>[0] = {
      org_id: orgId,
      search: validated.q,
      document_type: validated.document_type,
      entity_type: validated.entity_type,
      entity_id: validated.entity_id,
      created_from: validated.date_from,
      created_to: validated.date_to,
      tags: validated.tags?.split(',').filter(Boolean),
      limit: validated.limit ? parseInt(validated.limit, 10) : 50,
      offset: validated.offset ? parseInt(validated.offset, 10) : 0,
    };

    const { documents, total } = await DocumentService.listDocuments(filters);

    // TODO: Filter by folder_id and signing_status if needed
    // These would require additional queries or joins

    return NextResponse.json({
      success: true,
      data: documents,
      total,
      limit: filters.limit,
      offset: filters.offset,
    });
  } catch (error: unknown) {
    console.error('Error searching documents:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to search documents',
      },
      { status: 500 }
    );
  }
}

