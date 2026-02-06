/**
 * GET /api/category/ai-categorization/products
 * Query products with AI categorization status
 */

export const runtime = 'nodejs';

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { query as dbQuery } from '@/lib/database/unified-connection';
import type {
  ProductsQueryParams,
  ProductsQueryResponse,
  EnrichedProductWithStatus,
} from '@/lib/cmm/ai-categorization/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const params: ProductsQueryParams = {
      status: searchParams.get('status') as unknown,
      supplier_id: searchParams.get('supplier_id') || undefined,
      category_id: searchParams.get('category_id') || undefined,
      confidence_min: searchParams.get('confidence_min')
        ? parseFloat(searchParams.get('confidence_min')!)
        : undefined,
      confidence_max: searchParams.get('confidence_max')
        ? parseFloat(searchParams.get('confidence_max')!)
        : undefined,
      search: searchParams.get('search') || undefined,
      limit: parseInt(searchParams.get('limit') || '50', 10),
      offset: parseInt(searchParams.get('offset') || '0', 10),
      sort_by: (searchParams.get('sort_by') as unknown) || 'categorized_at',
      sort_order: (searchParams.get('sort_order') as unknown) || 'desc',
    };

    // Build query
    const whereClauses: string[] = [];
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

    if (params.category_id) {
      whereClauses.push(`sp.category_id = $${paramCounter}`);
      queryParams.push(params.category_id);
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
      categorized_at: 'sp.ai_tagged_at',
      supplier: 's.name',
    };

    const sortColumn = sortColumnMap[params.sort_by || 'categorized_at'] || 'sp.ai_tagged_at';
    const sortOrder = params.sort_order === 'asc' ? 'ASC' : 'DESC';

    // Get total count
    const countSql = `
      SELECT COUNT(*) as total
      FROM core.supplier_product sp
      ${whereClause}
    `;

    const countResult = await dbQuery<{ total: string }>(countSql, queryParams);
    const total = parseInt(countResult.rows[0].total, 10);

    // Get products
    queryParams.push(params.limit);
    queryParams.push(params.offset);

    const productsSql = `
      SELECT 
        sp.supplier_product_id,
        sp.supplier_id,
        sp.supplier_sku,
        sp.name_from_supplier,
        sp.category_id,
        c.name AS category_name,
        c.path AS category_path,
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
        sp.ai_tagging_status AS ai_categorization_status,
        sp.ai_tag_confidence AS ai_confidence,
        sp.ai_tag_reasoning AS ai_reasoning,
        sp.ai_tag_provider AS ai_provider,
        sp.ai_tagged_at AS ai_categorized_at,
        sp.previous_tag_confidence AS previous_confidence,
        NULL::uuid AS proposed_category_id,
        NULL::varchar AS proposed_category_name,
        NULL::varchar AS proposed_category_status,
        NULL::varchar AS brand,
        NULL::varchar AS category_raw,
        NULL::numeric AS current_price,
        NULL::varchar AS currency,
        NULL::int AS qty_on_hand,
        NULL::int AS qty_on_order
      FROM core.supplier_product sp
      JOIN core.supplier s ON s.supplier_id = sp.supplier_id
      LEFT JOIN core.category c ON c.category_id = sp.category_id
      ${whereClause}
      ORDER BY ${sortColumn} ${sortOrder}
      LIMIT $${paramCounter}
      OFFSET $${paramCounter + 1}
    `;

    const productsResult = await dbQuery<EnrichedProductWithStatus>(productsSql, queryParams);

    const response: ProductsQueryResponse = {
      success: true,
      products: productsResult.rows,
      total,
      limit: params.limit || 50,
      offset: params.offset || 0,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[API] Error querying products:', error);
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
