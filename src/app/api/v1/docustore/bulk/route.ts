import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { query } from '@/lib/database';
import { getOrgId } from '../../sales/_helpers';

const bulkDeleteSchema = z.object({
  action: z.literal('bulk_delete'),
  document_ids: z.array(z.string().uuid()).min(1),
});

const bulkMoveSchema = z.object({
  action: z.literal('bulk_move'),
  document_ids: z.array(z.string().uuid()).min(1),
  folder_id: z.string().uuid().nullable(),
});

const bulkArchiveSchema = z.object({
  action: z.literal('bulk_archive'),
  document_ids: z.array(z.string().uuid()).min(1),
});

const bulkTagSchema = z.object({
  action: z.literal('bulk_tag'),
  document_ids: z.array(z.string().uuid()).min(1),
  tags: z.array(z.string()).min(1),
});

const bulkOperationSchema = z.discriminatedUnion('action', [
  bulkDeleteSchema,
  bulkMoveSchema,
  bulkArchiveSchema,
  bulkTagSchema,
]);

export async function POST(request: NextRequest) {
  try {
    const orgId = await getOrgId(request);
    const userId = request.headers.get('x-user-id') || request.headers.get('x-clerk-user-id') || undefined;
    const body = await request.json();
    const validated = bulkOperationSchema.parse(body);

    let result: { affected: number; message: string };

    switch (validated.action) {
      case 'bulk_delete': {
        const updateResult = await query(
          `UPDATE docustore.documents 
           SET status = 'deleted', deleted_at = now(), deleted_by = $1, updated_at = now()
           WHERE id = ANY($2::uuid[]) AND org_id = $3 AND deleted_at IS NULL
           RETURNING id`,
          [userId || null, validated.document_ids, orgId]
        );
        result = {
          affected: updateResult.rows.length,
          message: `${updateResult.rows.length} documents deleted`,
        };
        break;
      }

      case 'bulk_move': {
        const updateResult = await query(
          `UPDATE docustore.documents 
           SET folder_id = $1, updated_at = now()
           WHERE id = ANY($2::uuid[]) AND org_id = $3
           RETURNING id`,
          [validated.folder_id, validated.document_ids, orgId]
        );
        result = {
          affected: updateResult.rows.length,
          message: `${updateResult.rows.length} documents moved`,
        };
        break;
      }

      case 'bulk_archive': {
        const updateResult = await query(
          `UPDATE docustore.documents 
           SET status = 'archived', updated_at = now()
           WHERE id = ANY($1::uuid[]) AND org_id = $2 AND status != 'archived'
           RETURNING id`,
          [validated.document_ids, orgId]
        );
        result = {
          affected: updateResult.rows.length,
          message: `${updateResult.rows.length} documents archived`,
        };
        break;
      }

      case 'bulk_tag': {
        const updateResult = await query(
          `UPDATE docustore.documents 
           SET tags = array_cat(COALESCE(tags, '{}'::text[]), $1::text[]), updated_at = now()
           WHERE id = ANY($2::uuid[]) AND org_id = $3
           RETURNING id`,
          [validated.tags, validated.document_ids, orgId]
        );
        result = {
          affected: updateResult.rows.length,
          message: `${updateResult.rows.length} documents tagged`,
        };
        break;
      }
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: unknown) {
    console.error('Error performing bulk operation:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to perform bulk operation',
      },
      { status: 400 }
    );
  }
}

