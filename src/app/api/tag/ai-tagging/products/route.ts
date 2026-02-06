/**
 * GET /api/tag/ai-tagging/products
 * Query products with AI tagging status
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { query as dbQuery } from '@/lib/database/unified-connection';
import type {
  TaggingProductsQueryParams,
  TaggingProductsQueryResponse,
  EnrichedProductWithTaggingStatus,
} from '@/lib/cmm/ai-tagging/types';

export async function GET(request: NextRequest) {
  try {
    // First check if the required columns exist
    const columnCheckSql = `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'core'
        AND table_name = 'supplier_product'
        AND column_name IN ('ai_tagging_status', 'ai_tag_confidence', 'ai_tagged_at', 'ai_tag_provider')
    `;

    const columnCheck = await dbQuery<{ column_name: string }>(columnCheckSql);
    const existingColumns = new Set(columnCheck.rows.map(r => r.column_name));

    if (existingColumns.size < 4) {
      const missing = [
        'ai_tagging_status',
        'ai_tag_confidence',
        'ai_tagged_at',
        'ai_tag_provider',
      ].filter(col => !existingColumns.has(col));

      console.error('[API] Missing AI tagging columns:', missing);
      return NextResponse.json(
        {
          success: false,
          message: `Database schema incomplete. Missing columns: ${missing.join(', ')}. Please run migration 0035_ai_tagging_tracking.sql`,
          error: 'SCHEMA_MISSING_COLUMNS',
          missing_columns: missing,
          products: [],
          total: 0,
          limit: 50,
          offset: 0,
        },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);

    const params: TaggingProductsQueryParams = {
      status: searchParams.get('status') as unknown,
      supplier_id: searchParams.get('supplier_id') || undefined,
      confidence_min: searchParams.get('confidence_min')
        ? parseFloat(searchParams.get('confidence_min')!)
        : undefined,
      confidence_max: searchParams.get('confidence_max')
        ? parseFloat(searchParams.get('confidence_max')!)
        : undefined,
      search: searchParams.get('search') || undefined,
      limit: parseInt(searchParams.get('limit') || '50', 10),
      offset: parseInt(searchParams.get('offset') || '0', 10),
      sort_by: (searchParams.get('sort_by') as unknown) || 'tagged_at',
      sort_order: (searchParams.get('sort_order') as unknown) || 'desc',
    };

    // Build query
    const whereClauses: string[] = ['sp.is_active = true'];
    const queryParams: unknown[] = [];
    let paramCounter = 1;

    if (params.status) {
      whereClauses.push(`sp.ai_tagging_status = $${paramCounter}`);
      queryParams.push(params.status);
      paramCounter++;
    }

    if (params.supplier_id) {
      whereClauses.push(`sp.supplier_id = $${paramCounter}`);
      queryParams.push(params.supplier_id);
      paramCounter++;
    }

    if (params.confidence_min !== undefined) {
      whereClauses.push(`sp.ai_tag_confidence >= $${paramCounter}`);
      queryParams.push(params.confidence_min);
      paramCounter++;
    }

    if (params.confidence_max !== undefined) {
      whereClauses.push(`sp.ai_tag_confidence <= $${paramCounter}`);
      queryParams.push(params.confidence_max);
      paramCounter++;
    }

    if (params.search) {
      whereClauses.push(
        `(sp.name_from_supplier ILIKE $${paramCounter} OR sp.supplier_sku ILIKE $${paramCounter})`
      );
      queryParams.push(`%${params.search}%`);
      paramCounter++;
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Sort column mapping
    const sortColumnMap: Record<string, string> = {
      name: 'sp.name_from_supplier',
      confidence: 'sp.ai_tag_confidence',
      tagged_at: 'sp.ai_tagged_at',
      supplier: 's.name',
    };

    const sortColumn = sortColumnMap[params.sort_by || 'tagged_at'] || 'sp.ai_tagged_at';
    const sortOrder = params.sort_order === 'asc' ? 'ASC' : 'DESC';

    // Get total count
    const countSql = `
      SELECT COUNT(*) as total
      FROM core.supplier_product sp
      JOIN core.supplier s ON s.supplier_id = sp.supplier_id
      ${whereClause}
    `;

    const countResult = await dbQuery<{ total: string }>(countSql, queryParams);
    const total = parseInt(countResult.rows[0].total, 10);

    // Get products - add LIMIT and OFFSET parameters
    queryParams.push(params.limit);
    queryParams.push(params.offset);
    const limitParam = paramCounter;
    const offsetParam = paramCounter + 1;

    const productsSql = `
      SELECT 
        sp.supplier_product_id,
        sp.supplier_id,
        sp.supplier_sku,
        sp.name_from_supplier,
        s.name AS supplier_name,
        s.code AS supplier_code,
        sp.uom,
        sp.pack_size,
        sp.barcode,
        sp.attrs_json,
        sp.is_active,
        sp.is_new,
        sp.first_seen_at,
        sp.last_seen_at,
        sp.ai_tagging_status,
        sp.ai_tag_confidence,
        sp.ai_tag_reasoning,
        sp.ai_tag_provider,
        sp.ai_tagged_at,
        sp.previous_tag_confidence,
        (
          SELECT json_agg(
            json_build_object(
              'tag_id', t.tag_id,
              'tag_name', t.name,
              'tag_category', t.type
            )
          )
          FROM core.ai_tag_assignment ta
          JOIN core.ai_tag_library t ON t.tag_id = ta.tag_id
          WHERE ta.supplier_product_id = sp.supplier_product_id
        ) AS assigned_tags,
        NULL::varchar AS brand,
        NULL::varchar AS category_raw,
        NULL::numeric AS current_price,
        NULL::varchar AS currency,
        NULL::int AS qty_on_hand,
        NULL::int AS qty_on_order
      FROM core.supplier_product sp
      JOIN core.supplier s ON s.supplier_id = sp.supplier_id
      ${whereClause}
      ORDER BY ${sortColumn} ${sortOrder} NULLS LAST
      LIMIT $${limitParam}
      OFFSET $${offsetParam}
    `;

    const productsResult = await dbQuery<EnrichedProductWithTaggingStatus>(
      productsSql,
      queryParams
    );

    console.log('[API] Products query result:', {
      total,
      returned: productsResult.rows.length,
      limit: params.limit,
      offset: params.offset,
      whereClause,
      queryParams: queryParams.length,
    });

    const response: TaggingProductsQueryResponse = {
      success: true,
      products: productsResult.rows,
      total,
      limit: params.limit || 50,
      offset: params.offset || 0,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[API] Error querying products:', error);
    console.error('[API] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to query products',
        products: [],
        total: 0,
        limit: 50,
        offset: 0,
      },
      { status: 500 }
    );
  }
}
