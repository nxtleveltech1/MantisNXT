/**
 * GET /api/category/ai-categorization/products
 * Query products with AI categorization status
 */

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { query as dbQuery } from '@/lib/database/unified-connection';
import {
  ProductsQueryParams,
  ProductsQueryResponse,
  EnrichedProductWithStatus,
} from '@/lib/cmm/ai-categorization/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const params: ProductsQueryParams = {
      status: searchParams.get('status') as any,
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
      sort_by: (searchParams.get('sort_by') as any) || 'categorized_at',
      sort_order: (searchParams.get('sort_order') as any) || 'desc',
    };

    // Build query
    const whereClauses: string[] = [];
    const queryParams: any[] = [];
    let paramCounter = 1;

    if (params.status) {
      whereClauses.push(`sp.ai_categorization_status = $${paramCounter}`);
      queryParams.push(params.status);
      paramCounter++;
    }

    if (params.supplier_id) {
      whereClauses.push(`sp.supplier_id = $${paramCounter}`);
      queryParams.push(params.supplier_id);
      paramCounter++;
    }

    if (params.confidence_min !== undefined) {
      whereClauses.push(`sp.ai_confidence >= $${paramCounter}`);
      queryParams.push(params.confidence_min);
      paramCounter++;
    }

    if (params.confidence_max !== undefined) {
      whereClauses.push(`sp.ai_confidence <= $${paramCounter}`);
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
      confidence: 'sp.ai_confidence',
      categorized_at: 'sp.ai_categorized_at',
      supplier: 's.name',
    };

    const sortColumn = sortColumnMap[params.sort_by || 'categorized_at'] || 'sp.ai_categorized_at';
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
        sp.ai_categorization_status,
        sp.ai_confidence,
        sp.ai_reasoning,
        sp.ai_provider,
        sp.ai_categorized_at,
        sp.previous_confidence,
        proposal.proposed_category_id,
        proposal.proposed_category_name,
        proposal.proposed_category_status,
        NULL::varchar AS brand,
        NULL::varchar AS category_raw,
        NULL::numeric AS current_price,
        NULL::varchar AS currency,
        NULL::int AS qty_on_hand,
        NULL::int AS qty_on_order
      FROM core.supplier_product sp
      JOIN core.supplier s ON s.supplier_id = sp.supplier_id
      LEFT JOIN core.category c ON c.category_id = sp.category_id
      LEFT JOIN LATERAL (
        SELECT 
          pcp.proposed_category_id,
          pc.display_name AS proposed_category_name,
          pcp.status AS proposed_category_status
        FROM core.ai_proposed_category_product pcp
        JOIN core.ai_proposed_category pc 
          ON pc.proposed_category_id = pcp.proposed_category_id
        WHERE pcp.supplier_product_id = sp.supplier_product_id
        ORDER BY pcp.updated_at DESC
        LIMIT 1
      ) AS proposal ON TRUE
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

