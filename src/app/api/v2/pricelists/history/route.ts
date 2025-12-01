/**
 * GET /api/v2/pricelists/history
 *
 * Get upload and import history for organization
 */

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { query } from '@/lib/database/unified-connection';
import { ErrorCode } from '@/lib/errors/AppError';

/**
 * Query parameters schema
 */
const QuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  supplier_id: z.string().uuid().optional(),
  status: z
    .enum(['uploaded', 'extracting', 'extracted', 'importing', 'completed', 'failed'])
    .optional(),
  from_date: z.coerce.date().optional(),
  to_date: z.coerce.date().optional(),
  sort_by: z
    .enum(['uploaded_at', 'completed_at', 'file_size', 'total_products'])
    .default('uploaded_at'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const requestId = uuidv4();

  try {
    // Extract organization from headers/auth
    const orgId = request.headers.get('x-organization-id');

    if (!orgId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: ErrorCode.INTERNAL_ERROR,
            message: 'Organization ID is required',
          },
          meta: {
            request_id: requestId,
            timestamp: new Date(),
            duration_ms: Date.now() - startTime,
          },
        },
        { status: 401 }
      );
    }

    // Parse query parameters
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const params = QuerySchema.parse(searchParams);

    // Build query conditions
    const conditions: string[] = ['h.org_id = $1'];
    const values: any[] = [orgId];
    let paramIndex = 2;

    if (params.supplier_id) {
      conditions.push(`h.supplier_id = $${paramIndex++}`);
      values.push(params.supplier_id);
    }

    if (params.status) {
      conditions.push(`h.status = $${paramIndex++}`);
      values.push(params.status);
    }

    if (params.from_date) {
      conditions.push(`h.uploaded_at >= $${paramIndex++}`);
      values.push(params.from_date);
    }

    if (params.to_date) {
      conditions.push(`h.uploaded_at <= $${paramIndex++}`);
      values.push(params.to_date);
    }

    const whereClause = conditions.join(' AND ');

    // Get total count
    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count
       FROM upload_history h
       WHERE ${whereClause}`,
      values
    );

    const totalItems = parseInt(countResult.rows[0]?.count || '0');
    const totalPages = Math.ceil(totalItems / params.limit);

    // Get paginated results
    const offset = (params.page - 1) * params.limit;
    values.push(params.limit, offset);

    const historyQuery = `
      SELECT
        h.history_id,
        h.upload_id,
        h.file_name,
        h.file_type,
        h.file_size,
        h.supplier_id,
        s.name as supplier_name,
        h.extraction_job_id,
        h.import_job_id,
        h.total_products,
        h.imported_products,
        h.status,
        h.uploaded_at,
        h.completed_at,
        ej.status as extraction_status,
        ej.progress as extraction_progress,
        ij.status as import_status,
        ij.products_imported,
        ij.products_updated,
        ij.products_failed
      FROM upload_history h
      LEFT JOIN core.supplier s ON s.supplier_id = h.supplier_id
      LEFT JOIN extraction_jobs ej ON ej.job_id = h.extraction_job_id
      LEFT JOIN import_jobs ij ON ij.import_job_id = h.import_job_id
      WHERE ${whereClause}
      ORDER BY h.${params.sort_by} ${params.order}
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `;

    const historyResult = await query<any>(historyQuery, values);

    // Format results
    const items = historyResult.rows.map(row => ({
      history_id: row.history_id,
      upload_id: row.upload_id,
      file: {
        name: row.file_name,
        type: row.file_type,
        size: row.file_size,
      },
      supplier: {
        id: row.supplier_id,
        name: row.supplier_name || 'Unknown',
      },
      extraction: row.extraction_job_id
        ? {
            job_id: row.extraction_job_id,
            status: row.extraction_status,
            progress: row.extraction_progress,
          }
        : null,
      import: row.import_job_id
        ? {
            job_id: row.import_job_id,
            status: row.import_status,
            products_imported: row.products_imported,
            products_updated: row.products_updated,
            products_failed: row.products_failed,
          }
        : null,
      summary: {
        total_products: row.total_products,
        imported_products: row.imported_products,
        status: row.status,
      },
      timestamps: {
        uploaded_at: row.uploaded_at,
        completed_at: row.completed_at,
      },
    }));

    // Get summary statistics
    const statsResult = await query<{
      total_uploads: string;
      total_products: string;
      success_rate: string;
      avg_processing_time: string;
    }>(
      `SELECT
        COUNT(*) as total_uploads,
        SUM(total_products) as total_products,
        COUNT(CASE WHEN status = 'completed' THEN 1 END)::numeric / NULLIF(COUNT(*), 0) * 100 as success_rate,
        AVG(
          CASE
            WHEN completed_at IS NOT NULL
            THEN EXTRACT(EPOCH FROM (completed_at - uploaded_at))
          END
        ) as avg_processing_time
       FROM upload_history
       WHERE org_id = $1
         AND uploaded_at >= NOW() - INTERVAL '30 days'`,
      [orgId]
    );

    const stats = statsResult.rows[0];

    return NextResponse.json(
      {
        success: true,
        data: {
          items,
          pagination: {
            page: params.page,
            limit: params.limit,
            total_items: totalItems,
            total_pages: totalPages,
            has_next: params.page < totalPages,
            has_prev: params.page > 1,
          },
          stats: {
            total_uploads: parseInt(stats?.total_uploads || '0'),
            total_products: parseInt(stats?.total_products || '0'),
            success_rate: parseFloat(stats?.success_rate || '0'),
            avg_processing_time_seconds: parseFloat(stats?.avg_processing_time || '0'),
          },
        },
        meta: {
          request_id: requestId,
          timestamp: new Date(),
          duration_ms: Date.now() - startTime,
        },
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'private, max-age=30', // Cache for 30 seconds
        },
      }
    );
  } catch (error) {
    console.error('[History API] Error:', error);

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: ErrorCode.INTERNAL_ERROR,
            message: 'Invalid query parameters',
            details: error.errors,
          },
          meta: {
            request_id: requestId,
            timestamp: new Date(),
            duration_ms: Date.now() - startTime,
          },
        },
        { status: 400 }
      );
    }

    // Generic error response
    return NextResponse.json(
      {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'Failed to get upload history',
          details: {
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        },
        meta: {
          request_id: requestId,
          timestamp: new Date(),
          duration_ms: Date.now() - startTime,
        },
      },
      { status: 500 }
    );
  }
}
